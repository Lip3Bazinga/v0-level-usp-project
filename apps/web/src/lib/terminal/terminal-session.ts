import type { ProjectFile } from "@levelusp/contracts"
import { BROWSER_PYTHON_VERSION } from "@/lib/python/runtime-config"
import { TerminalInterruptedError, type TerminalClient, type TerminalRunCallbacks, type TerminalRunResult } from "@/lib/python/terminal-client"
import { LineEditor, tokenizeInput, type EditorEvent, type InputToken } from "./line-editor"
import { listBrowserLibraries } from "./library-manifest.provisional"
import { formatPipList, helpText, parseShellCommand, replBanner, type ShellCommand } from "./shell"

/*
 * Sessão do terminal da aula: junta o editor de linha, os comandos do shell e o cliente do
 * Pyodide. Não conhece o xterm.js (só recebe `write`), então os testes usam telas de mentira.
 *
 * Fases: "prompt" (esperando um comando ou uma linha do REPL), "busy" (algo rodando) e "input"
 * (o programa chamou input() e espera uma linha). O que o usuário digita fora de "prompt" e
 * "input" fica guardado e é entregue depois, como num terminal de verdade.
 */

/** Onde a sessão escreve (o xterm.js, ou um gravador nos testes). */
export interface TerminalScreen {
  write: (text: string) => void
}

/** Fase da sessão. */
export type TerminalPhase = "prompt" | "busy" | "input"

/** Dependências e avisos da sessão. */
export interface TerminalSessionOptions {
  screen: TerminalScreen
  client: TerminalClient
  /** Arquivos do projeto no momento do comando (o que o aluno tem no editor agora). */
  getFiles: () => readonly ProjectFile[]
  /** Gráficos do matplotlib gerados por um comando (PNG em base64). */
  onFigures: (figures: readonly string[]) => void
  /** Mudou a fase (para habilitar o botão "Parar", por exemplo). */
  onPhaseChange?: (phase: TerminalPhase) => void
}

const RESET = "\x1b[0m"
const RED = "\x1b[31m"
const DIM = "\x1b[2m"
const SHELL_PROMPT = "\x1b[1;32maluno@levelusp\x1b[0m:\x1b[1;34m~\x1b[0m$ "
const REPL_PROMPT = ">>> "
const REPL_CONTINUATION_PROMPT = "... "
const CLEAR_SCREEN = "\x1b[2J\x1b[3J\x1b[H"
const LOADING_MESSAGE = "Carregando o Python…"
const RUNTIME_ERROR_MESSAGE = "O Python não pôde ser carregado. Recarregue a página e tente de novo."
const REPL_EXIT_LINES: ReadonlySet<string> = new Set(["exit()", "quit()", "exit", "quit"])
const INTERRUPTED_REPL_MESSAGE = "O Python foi reiniciado: as variáveis do REPL foram perdidas."
const FALLBACK_ERROR_MESSAGE = "Não foi possível executar o comando."

function toTerminalNewlines(text: string): string {
  return text.replace(/\r?\n/g, "\r\n")
}

/** Texto depois da última quebra de linha (o que está na linha onde o cursor está). */
function lastLineOf(text: string): string {
  return (text.split("\n").pop() ?? "").split("\r").pop() ?? ""
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : FALLBACK_ERROR_MESSAGE
}

/**
 * Controla um terminal: comandos `python arquivo.py`, REPL, `ls`, `cat`, `clear`, `pip list` e `help`.
 * Use `handleData` com o que o xterm entrega em `onData`.
 */
export class TerminalSession {
  private readonly shellEditor: LineEditor
  private readonly replEditor: LineEditor
  private readonly inputEditor: LineEditor
  private editor: LineEditor
  private phase: TerminalPhase = "busy"
  private isRepl = false
  private replNeedsMore = false
  private isClosed = false
  /** Texto que já está na linha do cursor; vira o "prompt" do editor quando o programa pede `input()`. */
  private currentLine = ""
  private readonly pendingTokens: InputToken[] = []
  private readonly callbacks: TerminalRunCallbacks

  constructor(private readonly options: TerminalSessionOptions) {
    const write = (text: string): void => this.writeRaw(text)
    this.shellEditor = new LineEditor(write)
    this.replEditor = new LineEditor(write)
    this.inputEditor = new LineEditor(write, false)
    this.editor = this.shellEditor
    this.callbacks = {
      onOutput: (stream, text) => this.writeOutput(stream, text),
      onInputRequest: () => this.beginInput(),
    }
  }

  /** Mostra a mensagem de boas-vindas e o primeiro prompt. */
  start(): void {
    this.writeRaw(`${DIM}Terminal do LevelUSP · Python ${BROWSER_PYTHON_VERSION} no navegador. Digite help para ver os comandos.${RESET}\r\n`)
    this.showPrompt()
  }

  /** Fase atual. */
  getPhase(): TerminalPhase {
    return this.phase
  }

  /** O que o usuário digitou ou colou (`onData` do xterm). Ctrl+C age na hora, mesmo com algo rodando. */
  handleData(data: string): void {
    if (this.isClosed) return
    if (data === "\x03") {
      this.interrupt()
      return
    }
    this.pendingTokens.push(...tokenizeInput(data))
    this.pump()
  }

  /** Ctrl+C / botão "Parar": interrompe o comando em andamento ou cancela a linha. */
  interrupt(): void {
    if (this.isClosed) return
    this.pendingTokens.length = 0
    if (this.phase === "prompt") {
      this.cancelLine()
      return
    }
    // Rodando ou esperando input(): o worker é reiniciado e o comando em andamento termina com erro.
    this.options.client.interrupt()
  }

  /** Fecha a sessão; se algo estiver rodando, interrompe para não deixar o Python preso esperando uma linha. */
  dispose(): void {
    if (this.isClosed) return
    const wasRunning = this.phase !== "prompt"
    this.isClosed = true
    this.pendingTokens.length = 0
    if (wasRunning) this.options.client.interrupt()
  }

  private setPhase(phase: TerminalPhase): void {
    if (this.phase === phase) return
    this.phase = phase
    this.options.onPhaseChange?.(phase)
  }

  private writeRaw(text: string): void {
    if (this.isClosed) return
    this.options.screen.write(text)
  }

  private writeOutput(stream: "stdout" | "stderr", text: string): void {
    const converted = toTerminalNewlines(text)
    this.currentLine = text.includes("\n") ? lastLineOf(text) : this.currentLine + text
    this.writeRaw(stream === "stderr" ? `${RED}${converted}${RESET}` : converted)
  }

  private writeLine(text: string): void {
    this.writeRaw(`${toTerminalNewlines(text)}\r\n`)
    this.currentLine = ""
  }

  private prompt(): string {
    if (!this.isRepl) return SHELL_PROMPT
    return this.replNeedsMore ? REPL_CONTINUATION_PROMPT : REPL_PROMPT
  }

  private showPrompt(): void {
    if (this.currentLine !== "") {
      this.writeRaw("\r\n")
      this.currentLine = ""
    }
    this.editor = this.isRepl ? this.replEditor : this.shellEditor
    this.editor.begin(this.prompt())
    this.setPhase("prompt")
    this.pump()
  }

  private beginInput(): void {
    this.editor = this.inputEditor
    this.inputEditor.begin(this.currentLine, false)
    this.setPhase("input")
    this.pump()
  }

  /** Entrega o que foi digitado ao editor enquanto a sessão aceita teclas. */
  private pump(): void {
    while (this.pendingTokens.length > 0 && (this.phase === "prompt" || this.phase === "input")) {
      const token = this.pendingTokens.shift()
      if (!token) return
      const event = this.editor.apply(token)
      if (event) this.handleEditorEvent(event)
    }
  }

  private handleEditorEvent(event: EditorEvent): void {
    switch (event.type) {
      case "submit":
        if (this.phase === "input") this.answerInput(event.line)
        else void this.submitLine(event.line)
        return
      case "eof":
        if (this.phase === "input") this.endInput()
        else if (this.isRepl) this.leaveRepl()
        return
      case "clear":
        this.writeRaw(CLEAR_SCREEN)
        this.currentLine = ""
        if (this.phase === "prompt") this.editor.redraw()
        return
      case "interrupt":
        this.interrupt()
        return
    }
  }

  private cancelLine(): void {
    this.editor.cancel()
    if (this.isRepl) {
      this.writeLine("KeyboardInterrupt")
      if (this.replNeedsMore) void this.options.client.pushRepl(null, this.callbacks).catch(() => undefined)
      this.replNeedsMore = false
    }
    this.showPrompt()
  }

  private answerInput(line: string): void {
    this.currentLine = ""
    this.setPhase("busy")
    this.options.client.sendInput(line)
  }

  private endInput(): void {
    this.writeRaw("^D\r\n")
    this.currentLine = ""
    this.setPhase("busy")
    this.options.client.sendInput(null)
  }

  private leaveRepl(): void {
    this.isRepl = false
    this.replNeedsMore = false
    this.writeRaw("\r\n")
    this.showPrompt()
  }

  private async submitLine(line: string): Promise<void> {
    this.setPhase("busy")
    this.currentLine = ""
    try {
      if (this.isRepl) await this.submitReplLine(line)
      else await this.runShellCommand(parseShellCommand(line))
    } catch (error) {
      await this.handleFailure(error)
    }
    if (!this.isClosed) this.showPrompt()
  }

  private async handleFailure(error: unknown): Promise<void> {
    if (error instanceof TerminalInterruptedError) {
      this.writeRaw("\r\n^C\r\n")
      this.writeRaw(`${RED}KeyboardInterrupt${RESET}\r\n`)
      this.currentLine = ""
      if (this.isRepl) await this.restartRepl()
      return
    }
    this.writeLine(`${RED}${errorMessageOf(error)}${RESET}`)
    this.replNeedsMore = false
  }

  private async restartRepl(): Promise<void> {
    this.replNeedsMore = false
    this.writeLine(`${DIM}${INTERRUPTED_REPL_MESSAGE}${RESET}`)
    try {
      await this.options.client.startRepl(this.options.getFiles(), this.callbacks)
    } catch {
      this.isRepl = false
    }
  }

  /** Avisa que o Python ainda está carregando e confere que ele não falhou. `false` se não dá para continuar. */
  private checkRuntime(): boolean {
    const status = this.options.client.getStatus()
    if (status === "error") {
      this.writeLine(`${RED}${RUNTIME_ERROR_MESSAGE}${RESET}`)
      return false
    }
    if (status !== "ready") this.writeLine(`${DIM}${LOADING_MESSAGE}${RESET}`)
    return true
  }

  private showFigures(result: TerminalRunResult): void {
    if (result.figures.length === 0) return
    this.options.onFigures(result.figures)
    const plural = result.figures.length > 1
    this.writeLine(`${DIM}[${result.figures.length} ${plural ? "gráficos exibidos" : "gráfico exibido"} no painel ao lado]${RESET}`)
  }

  private async runShellCommand(command: ShellCommand): Promise<void> {
    switch (command.kind) {
      case "empty":
        return
      case "error":
        this.writeLine(`${RED}${command.message}${RESET}`)
        return
      case "help":
        this.writeLine(helpText())
        return
      case "clear":
        this.writeRaw(CLEAR_SCREEN)
        return
      case "pip-list":
        this.writeLine(formatPipList(listBrowserLibraries()))
        return
      case "python-version":
        this.writeLine(`Python ${BROWSER_PYTHON_VERSION}`)
        return
      case "ls":
      case "cat":
        if (this.checkRuntime()) await this.options.client.runFs(command.kind, command.args, this.options.getFiles(), this.callbacks)
        return
      case "python":
        if (!this.checkRuntime()) return
        if (command.script === null) await this.openRepl()
        else this.showFigures(await this.options.client.runScript(this.options.getFiles(), command.script, this.callbacks))
        return
    }
  }

  private async openRepl(): Promise<void> {
    await this.options.client.startRepl(this.options.getFiles(), this.callbacks)
    this.isRepl = true
    this.replNeedsMore = false
    this.writeLine(replBanner())
  }

  private async submitReplLine(line: string): Promise<void> {
    if (!this.replNeedsMore && REPL_EXIT_LINES.has(line.trim())) {
      this.isRepl = false
      return
    }
    const result = await this.options.client.pushRepl(line, this.callbacks)
    this.replNeedsMore = result.status === "more"
    if (result.status === "exit") this.isRepl = false
    this.showFigures(result)
  }
}
