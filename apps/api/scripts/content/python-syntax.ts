/**
 * Verificação ESTRUTURAL de um trecho de Python, sem interpretador: serve ao lint
 * (`pnpm content:check`) para pegar erro grosseiro num bloco ```python visualizar ou no
 * código de um passo Previsão. Não substitui a execução: `pnpm content:verify` roda os
 * blocos no executor real. Confere parênteses/colchetes/chaves, aspas, tabulação na
 * indentação e a relação entre `:` no fim da linha e o bloco indentado seguinte.
 */

/** Problema encontrado: linha (1-based, relativa ao trecho) e mensagem em pt-BR. */
export interface PythonProblem {
  line: number
  message: string
}

const OPENERS: Readonly<Record<string, string>> = { "(": ")", "[": "]", "{": "}" }
const CLOSERS = new Set(Object.values(OPENERS))
const TRIPLE_QUOTES = ['"""', "'''"]

interface OpenBracket {
  closer: string
  line: number
}

/** Uma linha lógica: o código sem strings nem comentários, e se terminou dentro de colchetes ou de string tripla. */
interface ScannedLine {
  number: number
  indent: number
  /** Código da linha com o conteúdo das strings apagado e sem o comentário. */
  code: string
  /** A linha começou dentro de colchetes abertos ou de uma string de várias linhas (é continuação). */
  isContinuation: boolean
}

interface ScanState {
  brackets: OpenBracket[]
  tripleQuote: string | null
  backslashContinuation: boolean
}

/** Remove strings e comentário de uma linha, atualizando colchetes e strings triplas em aberto. */
function scanLine(text: string, number: number, state: ScanState): { code: string; problem: PythonProblem | null } {
  let code = ""
  let index = 0
  while (index < text.length) {
    if (state.tripleQuote !== null) {
      const end = text.indexOf(state.tripleQuote, index)
      if (end === -1) return { code, problem: null }
      index = end + state.tripleQuote.length
      state.tripleQuote = null
      continue
    }
    const character = text.charAt(index)
    if (character === "#") break
    const triple = TRIPLE_QUOTES.find((quote) => text.startsWith(quote, index))
    if (triple !== undefined) {
      state.tripleQuote = triple
      index += triple.length
      code += '""'
      continue
    }
    if (character === '"' || character === "'") {
      const end = closingQuote(text, index)
      if (end === -1) return { code, problem: { line: number, message: `string sem fechamento (${character})` } }
      index = end + 1
      code += '""'
      continue
    }
    const closer = OPENERS[character]
    if (closer !== undefined) state.brackets.push({ closer, line: number })
    if (CLOSERS.has(character)) {
      const open = state.brackets.pop()
      if (open?.closer !== character) return { code, problem: { line: number, message: `"${character}" sem abertura correspondente` } }
    }
    code += character
    index++
  }
  return { code, problem: null }
}

/** Posição da aspa que fecha a string aberta em `start` (respeitando `\`), ou -1. */
function closingQuote(text: string, start: number): number {
  const quote = text.charAt(start)
  for (let index = start + 1; index < text.length; index++) {
    const character = text.charAt(index)
    if (character === "\\") index++
    else if (character === quote) return index
  }
  return -1
}

function scanLines(source: string): { lines: ScannedLine[]; problem: PythonProblem | null } {
  const state: ScanState = { brackets: [], tripleQuote: null, backslashContinuation: false }
  const lines: ScannedLine[] = []
  const rawLines = source.replace(/\r\n?/g, "\n").split("\n")
  for (const [offset, text] of rawLines.entries()) {
    const number = offset + 1
    const isContinuation = state.brackets.length > 0 || state.tripleQuote !== null || state.backslashContinuation
    const leading = /^[ \t]*/.exec(text)?.[0] ?? ""
    if (!isContinuation && leading.includes("\t") && text.trim() !== "") return { lines, problem: { line: number, message: "tabulação na indentação: use 4 espaços" } }
    const { code, problem } = scanLine(text, number, state)
    if (problem) return { lines, problem }
    state.backslashContinuation = state.tripleQuote === null && code.trimEnd().endsWith("\\")
    lines.push({ number, indent: leading.length, code: code.trim(), isContinuation })
  }
  const [unclosed] = state.brackets
  if (unclosed) return { lines, problem: { line: unclosed.line, message: `"${matchingOpener(unclosed.closer)}" sem fechamento` } }
  if (state.tripleQuote !== null) return { lines, problem: { line: rawLines.length, message: "string de três aspas sem fechamento" } }
  return { lines, problem: null }
}

function matchingOpener(closer: string): string {
  return Object.keys(OPENERS).find((opener) => OPENERS[opener] === closer) ?? closer
}

/** Blocos: depois de uma linha que termina em `:` vem uma linha mais indentada; a indentação só aumenta depois de `:`. */
function checkBlocks(lines: readonly ScannedLine[]): PythonProblem | null {
  const statements = lines.filter((line) => !line.isContinuation && line.code !== "")
  const [first] = statements
  if (first && first.indent > 0) return { line: first.number, message: "a primeira linha não pode estar indentada" }
  for (const [index, statement] of statements.entries()) {
    const next = statements[index + 1]
    // A última linha lógica do comando é a que decide (um `def f(\n    a,\n):` fecha na continuação).
    const lastPart = lastLogicalPart(lines, statement, next)
    const opensBlock = lastPart.endsWith(":")
    if (opensBlock && (!next || next.indent <= statement.indent)) {
      return { line: statement.number, message: "linha termina com \":\" mas o bloco seguinte não está indentado" }
    }
    if (!opensBlock && next && next.indent > statement.indent) {
      return { line: next.number, message: "indentação inesperada (a linha anterior não abre um bloco com \":\")" }
    }
  }
  return null
}

function lastLogicalPart(lines: readonly ScannedLine[], statement: ScannedLine, next: ScannedLine | undefined): string {
  const parts = lines.filter((line) => line.number >= statement.number && (next === undefined || line.number < next.number) && line.code !== "")
  return parts[parts.length - 1]?.code ?? statement.code
}

/**
 * Primeiro problema estrutural do trecho, ou null quando ele é plausível. Trecho sem
 * nenhuma linha de código (vazio ou só comentários) é um problema.
 */
export function describePythonProblem(source: string): PythonProblem | null {
  const { lines, problem } = scanLines(source)
  if (problem) return problem
  if (lines.every((line) => line.code === "")) return { line: 1, message: "bloco sem código Python (vazio ou só comentários)" }
  return checkBlocks(lines)
}

/** true quando o trecho chama `input(` fora de strings e comentários. */
export function callsInput(source: string): boolean {
  return scanLines(source).lines.some((line) => /(?<![A-Za-z0-9_.])input\s*\(/.test(line.code))
}
