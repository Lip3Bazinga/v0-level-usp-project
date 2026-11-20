import { BROWSER_PYTHON_VERSION } from "@/lib/python/runtime-config"
import type { BrowserLibrary } from "./library-manifest.provisional"

/*
 * Interpretação das linhas digitadas no terminal da aula. Só texto: quem executa é a sessão
 * (terminal-session.ts). Comandos: python, ls, cat, clear, pip list e help.
 */

/** Comando reconhecido a partir de uma linha do shell. */
export type ShellCommand =
  | { kind: "empty" }
  /** `python arquivo.py`; sem `script`, abre o REPL. */
  | { kind: "python"; script: string | null }
  | { kind: "python-version" }
  | { kind: "ls"; args: readonly string[] }
  | { kind: "cat"; args: readonly string[] }
  | { kind: "clear" }
  | { kind: "pip-list" }
  | { kind: "help" }
  /** Uso inválido ou recurso indisponível: `message` já está em pt-BR. */
  | { kind: "error"; message: string }

const PYTHON_NAMES: ReadonlySet<string> = new Set(["python", "python3", "py"])
const UNCLOSED_QUOTE_MESSAGE = "erro de sintaxe: aspas sem fechar."

/** Separa a linha em palavras, respeitando aspas simples e duplas. `null` se houver aspas sem fechar. */
export function splitShellWords(line: string): string[] | null {
  const words: string[] = []
  let current = ""
  let hasWord = false
  let quote: string | null = null
  for (const char of line) {
    if (quote) {
      if (char === quote) quote = null
      else current += char
    } else if (char === '"' || char === "'") {
      quote = char
      hasWord = true
    } else if (char === " " || char === "\t") {
      if (hasWord) words.push(current)
      current = ""
      hasWord = false
    } else {
      current += char
      hasWord = true
    }
  }
  if (quote) return null
  if (hasWord) words.push(current)
  return words
}

function parsePython(args: readonly string[]): ShellCommand {
  const [first, ...rest] = args
  if (first === undefined) return { kind: "python", script: null }
  if (first === "-V" || first === "--version") return { kind: "python-version" }
  if (first.startsWith("-")) {
    return { kind: "error", message: `python: a opção ${first} não está disponível neste terminal. Use python arquivo.py ou só python (REPL).` }
  }
  if (rest.length > 0) {
    return { kind: "error", message: "python: argumentos extras para o programa não são suportados. Use python arquivo.py." }
  }
  return { kind: "python", script: first }
}

function parsePip(args: readonly string[]): ShellCommand {
  const [subcommand] = args
  if (subcommand === "list") return { kind: "pip-list" }
  if (subcommand === "install" || subcommand === "uninstall") {
    return {
      kind: "error",
      message: `pip ${subcommand} não está disponível: as bibliotecas vêm da lição. Veja as liberadas com pip list ou peça uma nova ao professor.`,
    }
  }
  return { kind: "error", message: "pip: use pip list para ver as bibliotecas disponíveis." }
}

/** Interpreta uma linha digitada no shell. Nunca lança: o que não se entende vira `error`. */
export function parseShellCommand(line: string): ShellCommand {
  const words = splitShellWords(line)
  if (words === null) return { kind: "error", message: UNCLOSED_QUOTE_MESSAGE }
  const [name, ...args] = words
  if (name === undefined) return { kind: "empty" }
  if (PYTHON_NAMES.has(name)) return parsePython(args)
  switch (name) {
    case "ls":
      return { kind: "ls", args }
    case "cat":
      return { kind: "cat", args }
    case "clear":
      return { kind: "clear" }
    case "help":
      return { kind: "help" }
    case "pip":
    case "pip3":
      return parsePip(args)
    default:
      return { kind: "error", message: `${name}: comando não encontrado. Digite help para ver os comandos.` }
  }
}

/** Texto do comando `help`. */
export function helpText(): string {
  return [
    "Comandos disponíveis:",
    "  python arquivo.py   roda um arquivo da lição (input() espera você digitar)",
    "  python              abre o REPL; saia com exit() ou Ctrl+D",
    "  ls [pasta]          lista os arquivos",
    "  cat arquivo         mostra o conteúdo de um arquivo",
    "  pip list            mostra as bibliotecas disponíveis",
    "  clear               limpa a tela (ou Ctrl+L)",
    "  help                mostra esta ajuda",
    "",
    "Teclas: Ctrl+C interrompe o que está rodando; setas para cima e para baixo repetem comandos.",
    "Com o teclado: Tab leva o foco para fora do terminal.",
  ].join("\n")
}

/** Cabeçalho do REPL (o que o `python` mostra ao abrir). */
export function replBanner(): string {
  return `Python ${BROWSER_PYTHON_VERSION} (no navegador, via Pyodide)\nDigite exit() ou Ctrl+D para voltar ao terminal.`
}

/** Saída do `pip list`: colunas alinhadas como no pip. */
export function formatPipList(libraries: readonly BrowserLibrary[]): string {
  const nameHeader = "Package"
  const versionHeader = "Version"
  const nameWidth = Math.max(nameHeader.length, ...libraries.map((library) => library.name.length))
  const versionWidth = Math.max(versionHeader.length, ...libraries.map((library) => library.version.length))
  const row = (name: string, version: string): string => `${name.padEnd(nameWidth)} ${version.padEnd(versionWidth)}`.trimEnd()
  return [
    row(nameHeader, versionHeader),
    `${"-".repeat(nameWidth)} ${"-".repeat(versionWidth)}`,
    ...[...libraries].sort((a, b) => a.name.localeCompare(b.name)).map((library) => row(library.name, library.version)),
  ].join("\n")
}
