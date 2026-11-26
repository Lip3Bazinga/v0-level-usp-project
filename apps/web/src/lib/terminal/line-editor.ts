/*
 * Edição da linha digitada no terminal: recebe os bytes que o xterm.js entrega (`onData`) e
 * devolve o que escrever de volta na tela. Sem dependência do xterm nem do DOM, para testar
 * a lógica com strings.
 */

/** Teclas e textos que o editor entende, já separados. */
export type InputToken =
  | { type: "text"; value: string }
  | { type: "key"; key: EditorKey }

/** Teclas de edição. */
export type EditorKey =
  | "enter"
  | "backspace"
  | "delete"
  | "left"
  | "right"
  | "up"
  | "down"
  | "home"
  | "end"
  | "kill-before"
  | "kill-after"
  | "kill-word"
  | "interrupt"
  | "eof"
  | "clear"

/** O que o editor pede à sessão depois de uma tecla. */
export type EditorEvent =
  /** Enter: `line` é a linha pronta. */
  | { type: "submit"; line: string }
  /** Ctrl+D com a linha vazia. */
  | { type: "eof" }
  /** Ctrl+L. */
  | { type: "clear" }
  /** Ctrl+C. */
  | { type: "interrupt" }

const KEY_SEQUENCES: ReadonlyMap<string, EditorKey> = new Map<string, EditorKey>([
  ["\r", "enter"],
  ["\n", "enter"],
  ["\x7f", "backspace"],
  ["\b", "backspace"],
  ["\x1b[3~", "delete"],
  ["\x1b[D", "left"],
  ["\x1bOD", "left"],
  ["\x1b[C", "right"],
  ["\x1bOC", "right"],
  ["\x1b[A", "up"],
  ["\x1bOA", "up"],
  ["\x1b[B", "down"],
  ["\x1bOB", "down"],
  ["\x1b[H", "home"],
  ["\x1bOH", "home"],
  ["\x1b[1~", "home"],
  ["\x01", "home"],
  ["\x1b[F", "end"],
  ["\x1bOF", "end"],
  ["\x1b[4~", "end"],
  ["\x05", "end"],
  ["\x15", "kill-before"],
  ["\x0b", "kill-after"],
  ["\x17", "kill-word"],
  ["\x03", "interrupt"],
  ["\x04", "eof"],
  ["\x0c", "clear"],
])

const ESCAPE = "\x1b"
const TAB_AS_SPACES = "    "
/** Tamanho máximo de uma sequência de escape (`ESC [ 1 ; 5 C`…): evita consumir texto colado por engano. */
const MAX_ESCAPE_LENGTH = 8

function isPrintable(char: string): boolean {
  const code = char.codePointAt(0) ?? 0
  return code >= 0x20 && code !== 0x7f
}

/** Tamanho (em unidades UTF-16) da sequência de escape que começa em `start`; só consome as que conhece ou termina em letra/til. */
function escapeLength(data: string, start: number): number {
  for (const sequence of KEY_SEQUENCES.keys()) {
    if (sequence.startsWith(ESCAPE) && data.startsWith(sequence, start)) return sequence.length
  }
  // Desconhecida (F5, Ctrl+seta…): consome até o byte final para não imprimir lixo.
  if (data[start + 1] !== "[" && data[start + 1] !== "O") return 1
  for (let index = start + 2; index < Math.min(data.length, start + MAX_ESCAPE_LENGTH); index += 1) {
    const code = data.charCodeAt(index)
    if (code >= 0x40 && code <= 0x7e) return index - start + 1
  }
  return 1
}

/** Separa o que o xterm entregou em textos e teclas. `\r\n` conta como um Enter só; Tab vira espaços. */
export function tokenizeInput(data: string): InputToken[] {
  const tokens: InputToken[] = []
  let text = ""
  const flushText = (): void => {
    if (text) tokens.push({ type: "text", value: text })
    text = ""
  }
  let index = 0
  while (index < data.length) {
    const char = data.charAt(index)
    if (char === "\r" && data[index + 1] === "\n") {
      index += 1
      continue
    }
    if (char === ESCAPE) {
      const length = escapeLength(data, index)
      const key = KEY_SEQUENCES.get(data.slice(index, index + length))
      flushText()
      if (key) tokens.push({ type: "key", key })
      index += length
      continue
    }
    const key = KEY_SEQUENCES.get(char)
    if (key) {
      flushText()
      tokens.push({ type: "key", key })
    } else if (char === "\t") {
      text += TAB_AS_SPACES
    } else if (isPrintable(char)) {
      text += char
    }
    index += 1
  }
  flushText()
  return tokens
}

const MAX_HISTORY = 100
const MAX_LINE_LENGTH = 4000

/** Editor de uma linha com cursor, atalhos estilo shell e histórico (setas para cima e para baixo). */
export class LineEditor {
  private prompt = ""
  private value = ""
  private cursor = 0
  private readonly history: string[] = []
  /** Posição no histórico (0 = o mais recente); -1 = linha nova. */
  private historyPosition = -1
  private draft = ""

  constructor(
    private readonly write: (text: string) => void,
    /** `false` desliga o histórico (resposta de `input()` não é comando). */
    private readonly keepHistory = true,
  ) {}

  /** Linha digitada até agora. */
  get text(): string {
    return this.value
  }

  /** Começa uma linha nova. `showPrompt: false` quando o prompt já está na tela (ex.: o do `input()`). */
  begin(prompt: string, showPrompt = true): void {
    this.prompt = prompt
    this.value = ""
    this.cursor = 0
    this.historyPosition = -1
    this.draft = ""
    if (showPrompt) this.write(prompt)
  }

  /** Redesenha a linha (depois de Ctrl+L, por exemplo). */
  redraw(): void {
    this.write(`\r\x1b[K${this.prompt}${this.value}`)
    this.moveCursorBack(this.value.length - this.cursor)
  }

  /** Descarta o que foi digitado (Ctrl+C) e vai para a próxima linha. */
  cancel(): void {
    this.write("^C\r\n")
    this.value = ""
    this.cursor = 0
  }

  /** Aplica uma tecla ou texto. Devolve um evento quando a sessão precisa agir. */
  apply(token: InputToken): EditorEvent | null {
    return token.type === "text" ? this.insert(token.value) : this.pressKey(token.key)
  }

  private moveCursorBack(count: number): void {
    if (count > 0) this.write(`\x1b[${count}D`)
  }

  private insert(text: string): null {
    const room = MAX_LINE_LENGTH - this.value.length
    const accepted = text.slice(0, Math.max(room, 0))
    if (!accepted) return null
    const atEnd = this.cursor === this.value.length
    this.value = this.value.slice(0, this.cursor) + accepted + this.value.slice(this.cursor)
    this.cursor += accepted.length
    if (atEnd) this.write(accepted)
    else this.redraw()
    return null
  }

  private replaceValue(next: string, cursor = next.length): void {
    this.value = next
    this.cursor = cursor
    this.redraw()
  }

  private recall(position: number): void {
    if (this.historyPosition === -1) this.draft = this.value
    this.historyPosition = position
    this.replaceValue(position === -1 ? this.draft : (this.history[position] ?? ""))
  }

  private pressKey(key: EditorKey): EditorEvent | null {
    switch (key) {
      case "enter":
        return this.submit()
      case "backspace":
        return this.deleteBefore()
      case "delete":
        if (this.cursor < this.value.length) this.replaceValue(this.value.slice(0, this.cursor) + this.value.slice(this.cursor + 1), this.cursor)
        return null
      case "left":
        if (this.cursor > 0) {
          this.cursor -= 1
          this.write("\x1b[D")
        }
        return null
      case "right":
        if (this.cursor < this.value.length) {
          this.cursor += 1
          this.write("\x1b[C")
        }
        return null
      case "home":
        this.moveCursorBack(this.cursor)
        this.cursor = 0
        return null
      case "end":
        if (this.cursor < this.value.length) this.write(`\x1b[${this.value.length - this.cursor}C`)
        this.cursor = this.value.length
        return null
      case "up":
        if (this.keepHistory && this.historyPosition + 1 < this.history.length) this.recall(this.historyPosition + 1)
        return null
      case "down":
        if (this.keepHistory && this.historyPosition >= 0) this.recall(this.historyPosition - 1)
        return null
      case "kill-before":
        this.replaceValue(this.value.slice(this.cursor), 0)
        return null
      case "kill-after":
        this.replaceValue(this.value.slice(0, this.cursor), this.cursor)
        return null
      case "kill-word":
        return this.killWord()
      case "interrupt":
        return { type: "interrupt" }
      case "eof":
        if (this.value === "") return { type: "eof" }
        return this.pressKey("delete")
      case "clear":
        return { type: "clear" }
    }
  }

  private deleteBefore(): null {
    if (this.cursor === 0) return null
    const atEnd = this.cursor === this.value.length
    this.value = this.value.slice(0, this.cursor - 1) + this.value.slice(this.cursor)
    this.cursor -= 1
    if (atEnd) this.write("\b \b")
    else this.redraw()
    return null
  }

  private killWord(): null {
    const before = this.value.slice(0, this.cursor)
    const kept = before.replace(/\S*\s*$/, "")
    this.replaceValue(kept + this.value.slice(this.cursor), kept.length)
    return null
  }

  private submit(): EditorEvent {
    const line = this.value
    this.write("\r\n")
    if (this.keepHistory && line.trim() && this.history[0] !== line) {
      this.history.unshift(line)
      this.history.length = Math.min(this.history.length, MAX_HISTORY)
    }
    this.value = ""
    this.cursor = 0
    this.historyPosition = -1
    return { type: "submit", line }
  }
}
