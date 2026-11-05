/**
 * Leitura do markdown das lições (`.lvl.md`), linha a linha e sem biblioteca:
 * o formato usa só títulos `##`/`###`, blocos ``` com atributos, listas
 * numeradas, alternativas `- [ ]`/`- [x]` e citações `>`. Tudo aqui é puro.
 */

/** Uma linha do arquivo com o número 1-based. */
export interface SourceLine {
  number: number
  text: string
}

/** Bloco ``` com a linha de abertura, a linguagem e os atributos (`path=`, `name=`). */
export interface FencedBlock {
  kind: "fence"
  /** Linha da abertura. */
  line: number
  language: string
  attributes: Record<string, string>
  /** Linhas internas, sem as cercas. */
  body: string[]
  /** As linhas originais (cercas incluídas), para reconstruir a narrativa. */
  raw: SourceLine[]
  closed: boolean
}

/** Linha fora de bloco de código. */
export interface TextLine {
  kind: "text"
  line: number
  text: string
}

/** Resultado da varredura: linhas de texto e blocos de código. */
export type MarkdownNode = FencedBlock | TextLine

/** Item de lista numerada (`1. texto`), com a sublinha `Dica:` separada. */
export interface NumberedItem {
  line: number
  number: number
  text: string
  hint: string | null
}

/** Alternativa de quiz (`- [ ]` ou `- [x]`). */
export interface CheckboxOption {
  line: number
  text: string
  checked: boolean
}

/** Erro de leitura com a linha onde ocorreu; a mensagem já está em pt-BR. */
export class MarkdownSyntaxError extends Error {
  constructor(
    readonly line: number,
    message: string,
  ) {
    super(message)
    this.name = "MarkdownSyntaxError"
  }
}

const FENCE_OPEN = /^ {0,3}(`{3,})(.*)$/
const FENCE_CLOSE = /^ {0,3}(`{3,})\s*$/
const NUMBERED_ITEM = /^\s*(\d+)[.)]\s+(.*)$/
const HINT_LINE = /^\s*dica:\s*(.*)$/i
const CHECKBOX_OPTION = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/
const ATTRIBUTE = /\s*([A-Za-z_][A-Za-z0-9_-]*)=("([^"]*)"|'([^']*)'|(\S+))/y
const LANGUAGE = /^\s*([A-Za-z0-9_+-]+)/

/** Divide o texto em linhas numeradas a partir de `firstLine`; aceita `\r\n`. */
export function toSourceLines(text: string, firstLine = 1): SourceLine[] {
  return text.replace(/\r\n?/g, "\n").split("\n").map((line, index) => ({ number: firstLine + index, text: line }))
}

/**
 * Linha de abertura de um bloco: `python`, `python path=utils.py`, `python name="sem aspas"`,
 * `text path=dados.csv`. Valores com espaço vão entre aspas.
 *
 * @throws MarkdownSyntaxError quando sobra texto que não é `chave=valor`.
 */
export function parseFenceInfo(info: string, line: number): Pick<FencedBlock, "language" | "attributes"> {
  const languageMatch = LANGUAGE.exec(info)
  const language = languageMatch?.[1] ?? ""
  const attributes: Record<string, string> = {}
  let position = languageMatch?.[0].length ?? 0
  while (position < info.length) {
    if (info.slice(position).trim() === "") break
    ATTRIBUTE.lastIndex = position
    const match = ATTRIBUTE.exec(info)
    if (!match) throw new MarkdownSyntaxError(line, `atributo inválido no bloco de código: "${info.slice(position).trim()}" (use chave=valor, ex.: path=utils.py ou name="caso")`)
    const [whole, key, , doubleQuoted, singleQuoted, bare] = match
    if (key === undefined) throw new MarkdownSyntaxError(line, "atributo inválido no bloco de código")
    attributes[key] = doubleQuoted ?? singleQuoted ?? bare ?? ""
    position += whole.length
  }
  return { language, attributes }
}

/**
 * Agrupa as linhas em texto e blocos ```; só linhas fora de bloco são
 * candidatas a título, item de lista ou alternativa. Um bloco sem fechamento
 * chega com `closed: false` (quem chama decide se é erro).
 */
export function scanMarkdown(lines: readonly SourceLine[]): MarkdownNode[] {
  const nodes: MarkdownNode[] = []
  let open: { block: FencedBlock; fenceLength: number } | null = null
  for (const line of lines) {
    if (open) {
      open.block.raw.push(line)
      const close = FENCE_CLOSE.exec(line.text)
      if (close && (close[1]?.length ?? 0) >= open.fenceLength) {
        open.block.closed = true
        open = null
      } else {
        open.block.body.push(line.text)
      }
      continue
    }
    const openMatch = FENCE_OPEN.exec(line.text)
    if (openMatch) {
      const { language, attributes } = parseFenceInfo(openMatch[2] ?? "", line.number)
      const block: FencedBlock = { kind: "fence", line: line.number, language, attributes, body: [], raw: [line], closed: false }
      nodes.push(block)
      open = { block, fenceLength: openMatch[1]?.length ?? 3 }
      continue
    }
    nodes.push({ kind: "text", line: line.number, text: line.text })
  }
  return nodes
}

/** Conteúdo de um bloco como arquivo: linhas unidas por `\n`, com quebra final quando há texto. */
export function fenceContent(block: FencedBlock): string {
  return block.body.length === 0 ? "" : `${block.body.join("\n")}\n`
}

/** Texto original dos nós (narrativa), sem linhas em branco nas pontas. */
export function rawText(nodes: readonly MarkdownNode[]): string {
  const lines = nodes.flatMap((node) => (node.kind === "text" ? [node.text] : node.raw.map((line) => line.text)))
  while (lines.length > 0 && lines[0]?.trim() === "") lines.shift()
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") lines.pop()
  return lines.join("\n")
}

function isBlank(node: MarkdownNode): boolean {
  return node.kind === "text" && node.text.trim() === ""
}

/**
 * Lista numerada (`1. …`, `2. …`): os números precisam ir de 1 a n, em ordem,
 * porque viram os ids dos checkpoints citados na verificação. Linhas seguintes
 * sem número continuam o item; uma sublinha `Dica: …` vira a dica do item.
 *
 * @throws MarkdownSyntaxError em texto solto, bloco de código ou numeração fora de ordem.
 */
export function parseNumberedList(nodes: readonly MarkdownNode[], sectionName: string): NumberedItem[] {
  const items: NumberedItem[] = []
  for (const node of nodes) {
    if (isBlank(node)) continue
    if (node.kind === "fence") throw new MarkdownSyntaxError(node.line, `a seção ${sectionName} aceita só uma lista numerada, não blocos de código`)
    const itemMatch = NUMBERED_ITEM.exec(node.text)
    const current = items[items.length - 1]
    if (itemMatch) {
      const number = Number(itemMatch[1])
      if (number !== items.length + 1) {
        throw new MarkdownSyntaxError(node.line, `item numerado ${number} em ${sectionName}; esperado ${items.length + 1} (numere em sequência a partir de 1)`)
      }
      items.push({ line: node.line, number, text: (itemMatch[2] ?? "").trim(), hint: null })
      continue
    }
    if (!current) throw new MarkdownSyntaxError(node.line, `texto fora de item numerado em ${sectionName} (comece cada item com "1. ", "2. "…)`)
    const hintMatch = HINT_LINE.exec(node.text)
    if (hintMatch) {
      if (current.hint !== null) throw new MarkdownSyntaxError(node.line, `o item ${current.number} de ${sectionName} já tem uma dica (só uma sublinha "Dica:" por item)`)
      current.hint = (hintMatch[1] ?? "").trim()
      continue
    }
    current.text = `${current.text} ${node.text.trim()}`.trim()
  }
  return items
}

/** Uma pergunta de quiz: enunciado, alternativas e explicação (`> …`). */
export interface ParsedQuestion {
  prompt: string
  options: CheckboxOption[]
  explanation: string
}

/**
 * `### Pergunta`: tudo antes da primeira alternativa é o enunciado (pode ter
 * blocos de código); depois vêm as alternativas e, opcionalmente, linhas `> …`
 * com a explicação.
 *
 * @throws MarkdownSyntaxError em texto solto depois das alternativas.
 */
export function parseQuestion(nodes: readonly MarkdownNode[]): ParsedQuestion {
  const promptNodes: MarkdownNode[] = []
  const options: CheckboxOption[] = []
  const explanation: string[] = []
  for (const node of nodes) {
    const optionMatch = node.kind === "text" ? CHECKBOX_OPTION.exec(node.text) : null
    if (optionMatch) {
      options.push({ line: node.line, text: (optionMatch[2] ?? "").trim(), checked: optionMatch[1] !== " " })
      continue
    }
    if (options.length === 0) {
      promptNodes.push(node)
      continue
    }
    if (isBlank(node)) continue
    if (node.kind === "text" && node.text.trimStart().startsWith(">")) {
      explanation.push(node.text.trimStart().slice(1).trim())
      continue
    }
    throw new MarkdownSyntaxError(node.line, "depois das alternativas só cabe a explicação, em linhas que começam com \">\"")
  }
  return { prompt: rawText(promptNodes), options, explanation: explanation.join(" ").trim() }
}
