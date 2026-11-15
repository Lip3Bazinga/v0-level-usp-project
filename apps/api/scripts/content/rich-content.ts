import { createHash } from "node:crypto"
import katex from "katex"
import { contentAssetTypeOf, describeInvalidAsset, type ContentAssetType } from "@levelusp/contracts"
import { FLAG_VISUALIZE, scanMarkdown, toSourceLines, type FencedBlock, type MarkdownNode } from "./markdown"
import { callsInput, describePythonProblem } from "./python-syntax"

/**
 * Recursos de apresentação das narrativas (content/README.md §3.5): fórmulas KaTeX
 * (`$…$`, `$$…$$`), diagramas ```mermaid, imagens de `assets/`, blocos
 * ```python visualizar e vídeos `::video[título](url)`. Tudo aqui valida e, quando
 * preciso, reescreve o markdown que vai para o pacote (URL pública das imagens, URL
 * canônica de incorporação dos vídeos). Código (blocos ``` e trechos entre crases)
 * nunca é lido como fórmula, imagem ou vídeo.
 */

/** Registra um problema na linha (1-based) do arquivo. */
export type ReportProblem = (line: number, message: string) => void

/** De onde vêm as imagens de uma lição (a pasta `assets/` do módulo) e para onde vão (o pacote). */
export interface AssetSource {
  /** Conteúdo de `assets/<fileName>`, ou null quando o arquivo não existe. */
  read(fileName: string): Uint8Array | null
  /** Inclui o arquivo no pacote e devolve a URL pública que o markdown passa a citar. */
  publish(fileName: string, contentType: ContentAssetType, bytes: Uint8Array): string
}

/** Contexto da leitura de um texto rico: como reportar e onde buscar imagens (null = sem pasta de assets). */
export interface RichContentContext {
  report: ReportProblem
  assets: AssetSource | null
}

/** Uma fórmula encontrada: o TeX, se é de bloco (`$$`) e a linha em que começa. */
export interface Formula {
  tex: string
  display: boolean
  line: number
}

/** Linhas de saída que cabem num bloco visualizar e no código de uma previsão. */
export const MAX_SNIPPET_LINES = 60
/** Tamanho mínimo do resumo em texto que acompanha um vídeo. */
export const MIN_VIDEO_SUMMARY_LENGTH = 60
/** Caracteres do hash usados como versão na URL de um asset. */
export const ASSET_VERSION_LENGTH = 12

const ASSETS_PREFIX = "assets/"
const MERMAID_LANGUAGE = "mermaid"
const PYTHON_LANGUAGE = "python"
const INLINE_CODE = /(`+)(?:(?!\1)[\s\S])*?\1/g
const IMAGE = /!\[([^\]]*)\]\(\s*([^)\s]*)(?:\s+"[^"]*")?\s*\)/g
const VIDEO_LINE = /^::video\[(.*)\]\((.*)\)\s*$/
const VIDEO_PREFIX = /^\s*::video\b/
const BLOCKQUOTE = /^\s*>\s?(.*)$/
const SUMMARY_LABEL = /^\*{0,2}resumo\*{0,2}\s*:\s*\*{0,2}\s*/i
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID = /^[0-9]{6,12}$/

/** Troca o conteúdo dos trechos entre crases por espaços (mesmo comprimento, quebras de linha mantidas). */
export function blankInlineCode(text: string): string {
  return text.replace(INLINE_CODE, (code) => code.replace(/[^\n]/g, " "))
}

function lineAt(text: string, index: number, firstLine: number): number {
  let line = firstLine
  for (let position = 0; position < index; position++) if (text.charCodeAt(position) === 10) line++
  return line
}

/** Próximo `$` (ou `$$`) não escapado a partir de `from`, sem passar de `limit`; -1 quando não há. */
function findDelimiter(text: string, delimiter: string, from: number, limit: number): number {
  for (let index = from; index < limit; index++) {
    const character = text.charAt(index)
    if (character === "\\") index++
    else if (text.startsWith(delimiter, index)) return index
  }
  return -1
}

const MONEY_HINT = "para o símbolo de dinheiro escreva \\$ (ex.: R\\$ 10)"

/**
 * Fórmulas de um trecho de texto SEM blocos de código. Todo `$` não escapado delimita
 * fórmula: `$…$` na mesma linha/parágrafo, `$$…$$` podendo ocupar várias linhas. `\$` é o
 * cifrão literal. Fórmula em linha não começa nem termina com espaço (é como "R$ 10 e R$ 20"
 * é pego: falta escapar).
 */
export function findFormulas(text: string, firstLine: number, report: ReportProblem): Formula[] {
  const source = blankInlineCode(text)
  const formulas: Formula[] = []
  let index = 0
  while (index < source.length) {
    const character = source.charAt(index)
    if (character === "\\") {
      index += 2
      continue
    }
    if (character !== "$") {
      index++
      continue
    }
    const line = lineAt(source, index, firstLine)
    const display = source.startsWith("$$", index)
    const delimiter = display ? "$$" : "$"
    const start = index + delimiter.length
    const paragraphEnd = source.indexOf("\n\n", start)
    const limit = display || paragraphEnd === -1 ? source.length : paragraphEnd
    const end = findDelimiter(source, delimiter, start, limit)
    if (end === -1) {
      report(line, display ? "fórmula $$ sem o $$ de fechamento" : `cifrão ($) sem par: fórmulas vão entre $…$; ${MONEY_HINT}`)
      return formulas
    }
    const tex = source.slice(start, end)
    if (tex.trim() === "") report(line, `fórmula vazia; ${MONEY_HINT}`)
    else if (!display && (tex !== tex.trim() || tex.includes("\n\n"))) report(line, `fórmula em linha não começa nem termina com espaço: "$${tex}$"; ${MONEY_HINT}`)
    else formulas.push({ tex: tex.trim(), display, line })
    index = end + delimiter.length
  }
  return formulas
}

/** Mensagem do KaTeX sem o prefixo repetido. */
function katexMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^KaTeX parse error:\s*/, "")
}

/** Valida cada fórmula com o parser do KaTeX (o mesmo que o player usa para desenhar). */
export function checkFormulas(formulas: readonly Formula[], report: ReportProblem): void {
  for (const formula of formulas) {
    try {
      katex.renderToString(formula.tex, { throwOnError: true, displayMode: formula.display, strict: "ignore", output: "mathml" })
    } catch (error) {
      report(formula.line, `fórmula inválida (KaTeX): ${katexMessage(error)}`)
    }
  }
}

/**
 * Fórmulas de um texto curto (instrução, dica, pergunta, alternativa, explicação): blocos de
 * código do texto são ignorados e cada fórmula é validada com o KaTeX.
 */
export function checkTextFormulas(text: string, firstLine: number, report: ReportProblem): void {
  for (const chunk of textChunks(scanMarkdown(toSourceLines(text, firstLine)))) checkFormulas(findFormulas(chunk.text, chunk.line, report), report)
}

interface TextChunk {
  line: number
  text: string
}

/** Sequências de linhas de texto entre blocos de código, unidas (uma fórmula `$$` pode ocupar várias linhas). */
function textChunks(nodes: readonly MarkdownNode[]): TextChunk[] {
  const chunks: TextChunk[] = []
  let current: TextChunk | null = null
  for (const node of nodes) {
    if (node.kind === "fence") {
      current = null
      continue
    }
    if (current) current.text += `\n${node.text}`
    else {
      current = { line: node.line, text: node.text }
      chunks.push(current)
    }
  }
  return chunks
}

/** Tipos de diagrama Mermaid aceitos (a primeira palavra do diagrama). */
export const MERMAID_DIAGRAM_TYPES: readonly string[] = [
  "flowchart", "graph", "sequenceDiagram", "classDiagram", "classDiagram-v2", "stateDiagram", "stateDiagram-v2", "erDiagram", "journey",
  "gantt", "pie", "quadrantChart", "requirementDiagram", "gitGraph", "mindmap", "timeline", "sankey-beta", "xychart-beta", "block-beta",
  "packet-beta", "architecture-beta", "kanban",
]
const FLOWCHART_TYPES = ["flowchart", "graph"]
const FLOWCHART_DIRECTIONS = ["TB", "TD", "BT", "RL", "LR"]
const MERMAID_COMMENT = /^\s*%%/
const MERMAID_BRACKETS: Readonly<Record<string, string>> = { "(": ")", "[": "]", "{": "}" }

interface NumberedLine {
  line: number
  text: string
}

/** Linhas significativas do diagrama: sem comentários `%%`, sem linhas em branco e sem o cabeçalho YAML `---`. */
function mermaidLines(fence: FencedBlock): NumberedLine[] {
  const lines = fence.body.map((text, index) => ({ line: fence.line + 1 + index, text }))
  const firstContent = lines.findIndex((entry) => entry.text.trim() !== "")
  let body = lines
  if (firstContent !== -1 && lines[firstContent]?.text.trim() === "---") {
    const closing = lines.findIndex((entry, index) => index > firstContent && entry.text.trim() === "---")
    body = closing === -1 ? [] : lines.slice(closing + 1)
  }
  return body.filter((entry) => entry.text.trim() !== "" && !MERMAID_COMMENT.test(entry.text))
}

/** Colchetes de um fluxograma: abertos e fechados em ordem, fora de textos entre aspas. */
function checkFlowchartBrackets(lines: readonly NumberedLine[], report: ReportProblem): void {
  for (const { line, text } of lines) {
    const withoutQuoted = text.replace(/"[^"]*"/g, '""')
    if ((withoutQuoted.match(/"/g) ?? []).length % 2 !== 0) {
      report(line, "diagrama Mermaid: aspas sem fechamento")
      return
    }
    const open: string[] = []
    for (const character of withoutQuoted) {
      const closer = MERMAID_BRACKETS[character]
      if (closer !== undefined) open.push(closer)
      else if (Object.values(MERMAID_BRACKETS).includes(character) && open.pop() !== character) {
        report(line, `diagrama Mermaid: "${character}" sem abertura correspondente (texto com parênteses ou colchetes vai entre aspas: A["texto (x)"])`)
        return
      }
    }
    if (open.length > 0) {
      report(line, `diagrama Mermaid: falta fechar "${open[open.length - 1] ?? ""}" nesta linha`)
      return
    }
  }
}

function checkFlowchart(header: NumberedLine, body: readonly NumberedLine[], report: ReportProblem): void {
  const [, direction, ...rest] = header.text.trim().split(/\s+/)
  if (direction !== undefined && (!FLOWCHART_DIRECTIONS.includes(direction) || rest.length > 0)) {
    report(header.line, `diagrama Mermaid: direção inválida "${[direction, ...rest].join(" ")}" (use ${FLOWCHART_DIRECTIONS.join(", ")})`)
  }
  const subgraphs = body.filter((entry) => /^\s*subgraph\b/.test(entry.text)).length
  const ends = body.filter((entry) => /^\s*end\s*$/.test(entry.text)).length
  if (subgraphs !== ends) report(header.line, `diagrama Mermaid: ${subgraphs} subgraph para ${ends} end`)
  checkFlowchartBrackets(body, report)
}

/**
 * Validação ESTRUTURAL de um bloco ```mermaid: tipo de diagrama conhecido na primeira linha,
 * corpo não vazio e, nos fluxogramas, direção, `subgraph`/`end` e colchetes/aspas casados.
 * Não é o parser do Mermaid (ele depende do DOM do navegador); um erro de sintaxe mais fino
 * só aparece no player.
 */
export function checkMermaid(fence: FencedBlock, report: ReportProblem): void {
  const [header, ...body] = mermaidLines(fence)
  if (!header) {
    report(fence.line, "bloco ```mermaid vazio")
    return
  }
  const type = header.text.trim().split(/\s+/)[0] ?? ""
  if (!MERMAID_DIAGRAM_TYPES.includes(type)) {
    report(header.line, `diagrama Mermaid: a primeira linha precisa ser o tipo do diagrama (veio "${type}"; aceitos: ${MERMAID_DIAGRAM_TYPES.join(", ")})`)
    return
  }
  if (body.length === 0) {
    report(header.line, `diagrama Mermaid ${type} sem conteúdo depois do tipo`)
    return
  }
  if (FLOWCHART_TYPES.includes(type)) checkFlowchart(header, body, report)
}

/**
 * Trecho de Python que o player executa no navegador (bloco visualizar) ou que o aluno lê
 * (previsão): não vazio, estruturalmente plausível, sem `input()` e com até
 * {@link MAX_SNIPPET_LINES} linhas.
 */
export function checkPythonSnippet(source: string, firstLine: number, label: string, report: ReportProblem): void {
  const problem = describePythonProblem(source)
  if (problem) {
    report(firstLine + problem.line - 1, `${label}: ${problem.message}`)
    return
  }
  const lineCount = source.trimEnd().split("\n").length
  if (lineCount > MAX_SNIPPET_LINES) report(firstLine, `${label}: ${lineCount} linhas (máximo ${MAX_SNIPPET_LINES})`)
  if (callsInput(source)) report(firstLine, `${label}: não pode chamar input() (roda sem entrada do aluno)`)
}

/**
 * URL canônica de incorporação de um vídeo, ou null quando o endereço não é do YouTube nem do
 * Vimeo. Aceita `youtube.com/watch?v=`, `youtu.be/`, `youtube(-nocookie).com/embed/`,
 * `vimeo.com/<id>` e `player.vimeo.com/video/<id>`; devolve sempre
 * `https://www.youtube-nocookie.com/embed/<id>` ou `https://player.vimeo.com/video/<id>`.
 */
export function canonicalVideoUrl(rawUrl: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    return null
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") return null
  const host = url.hostname.toLowerCase().replace(/^www\./, "")
  const segments = url.pathname.split("/").filter((segment) => segment !== "")
  const [first, second] = segments
  let youtubeId: string | undefined
  if (host === "youtu.be" && segments.length === 1) youtubeId = first
  if ((host === "youtube.com" || host === "youtube-nocookie.com") && first === "embed" && segments.length === 2) youtubeId = second
  if ((host === "youtube.com" || host === "m.youtube.com") && first === "watch" && segments.length === 1) youtubeId = url.searchParams.get("v") ?? undefined
  if (youtubeId !== undefined) return YOUTUBE_ID.test(youtubeId) ? `https://www.youtube-nocookie.com/embed/${youtubeId}` : null
  let vimeoId: string | undefined
  if (host === "vimeo.com" && segments.length === 1) vimeoId = first
  if (host === "player.vimeo.com" && first === "video" && segments.length === 2) vimeoId = second
  return vimeoId !== undefined && VIMEO_ID.test(vimeoId) ? `https://player.vimeo.com/video/${vimeoId}` : null
}

/** Intervalos [início, fim) dos trechos entre crases de uma linha. */
function codeSpans(text: string): [number, number][] {
  return [...text.matchAll(INLINE_CODE)].map((match) => [match.index, match.index + match[0].length])
}

/** Valida as imagens de uma linha e troca `assets/x.svg` pela URL pública do asset. */
function rewriteImages(text: string, line: number, ctx: RichContentContext): string {
  const spans = codeSpans(text)
  return text.replace(IMAGE, (whole: string, alt: string, target: string, offset: number) => {
    if (spans.some(([start, end]) => offset >= start && offset < end)) return whole
    const url = resolveImage(alt, target, line, ctx)
    return url === null ? whole : `![${alt.trim()}](${url})`
  })
}

function resolveImage(alt: string, target: string, line: number, ctx: RichContentContext): string | null {
  if (alt.trim() === "") ctx.report(line, `imagem sem texto alternativo: escreva ![o que a imagem mostra](${target})`)
  const fileName = target.startsWith(ASSETS_PREFIX) ? target.slice(ASSETS_PREFIX.length) : null
  const contentType = fileName === null ? undefined : contentAssetTypeOf(fileName)
  if (fileName === null || contentType === undefined || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(fileName)) {
    ctx.report(line, `imagem "${target}": só arquivos da pasta assets/ do módulo (assets/nome.svg|png|jpg|jpeg|webp|gif, sem subpastas nem endereço externo)`)
    return null
  }
  const bytes = ctx.assets?.read(fileName) ?? null
  if (ctx.assets === null || bytes === null) {
    ctx.report(line, `imagem "${target}": arquivo não encontrado na pasta assets/ do módulo`)
    return null
  }
  const problem = describeInvalidAsset(contentType, bytes)
  if (problem !== null) {
    ctx.report(line, `imagem "${target}": ${problem}`)
    return null
  }
  return alt.trim() === "" ? null : ctx.assets.publish(fileName, contentType, bytes)
}

/** Versão de um asset: início do SHA-256 do conteúdo (muda quando o arquivo muda). */
export function assetVersion(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, ASSET_VERSION_LENGTH)
}

interface TextLineNode {
  line: number
  text: string
}

/** Resumo em texto logo depois do vídeo: citação `> Resumo: …` (linhas `>` seguintes continuam o resumo). */
function readVideoSummary(lines: readonly TextLineNode[], from: number): string | null {
  let index = from
  while (index < lines.length && lines[index]?.text.trim() === "") index++
  const first = BLOCKQUOTE.exec(lines[index]?.text ?? "")
  if (!first || !SUMMARY_LABEL.test(first[1] ?? "")) return null
  const parts = [(first[1] ?? "").replace(SUMMARY_LABEL, "")]
  for (let next = index + 1; next < lines.length; next++) {
    const quote = BLOCKQUOTE.exec(lines[next]?.text ?? "")
    if (!quote) break
    parts.push(quote[1] ?? "")
  }
  return parts.join(" ").replace(/\*\*/g, "").trim()
}

/** Valida `::video[título](url)` + resumo e devolve a linha com a URL canônica (ou a original, com o problema reportado). */
function rewriteVideo(lines: readonly TextLineNode[], index: number, ctx: RichContentContext): string {
  const current = lines[index]
  if (!current) return ""
  const match = VIDEO_LINE.exec(current.text.trim())
  if (!match) {
    ctx.report(current.line, "vídeo mal formado: use ::video[título](https://…) sozinho na linha")
    return current.text
  }
  const title = (match[1] ?? "").trim()
  if (title === "") ctx.report(current.line, "vídeo sem título: ::video[título do vídeo](url)")
  const url = canonicalVideoUrl(match[2] ?? "")
  if (url === null) {
    ctx.report(current.line, `vídeo de endereço não aceito: "${match[2] ?? ""}" (só YouTube e Vimeo, com https: youtube.com/watch?v=…, youtu.be/…, youtube-nocookie.com/embed/…, vimeo.com/…, player.vimeo.com/video/…)`)
  }
  const summary = readVideoSummary(lines, index + 1)
  if (summary === null) ctx.report(current.line, "vídeo sem resumo em texto: logo abaixo, escreva uma citação começando com \"> Resumo: …\" (acessibilidade)")
  else if (summary.length < MIN_VIDEO_SUMMARY_LENGTH) ctx.report(current.line, `resumo do vídeo curto demais (${summary.length} caracteres; mínimo ${MIN_VIDEO_SUMMARY_LENGTH})`)
  return url === null ? current.text : `::video[${title}](${url})`
}

function checkFence(fence: FencedBlock, ctx: RichContentContext): void {
  if (!fence.closed) {
    ctx.report(fence.line, "bloco de código sem fechamento (```)")
    return
  }
  if (fence.language === MERMAID_LANGUAGE) checkMermaid(fence, ctx.report)
  if (fence.attributes[FLAG_VISUALIZE] === undefined) return
  if (fence.language !== PYTHON_LANGUAGE || Object.keys(fence.attributes).length > 1) {
    ctx.report(fence.line, "visualizar só vale em bloco ```python visualizar (sem outros atributos)")
    return
  }
  checkPythonSnippet(fence.body.join("\n"), fence.line + 1, "bloco visualizar", ctx.report)
}

/**
 * Narrativa de um passo → markdown do pacote. Valida fórmulas, diagramas, blocos
 * visualizar, imagens e vídeos (problemas vão para `ctx.report`, com a linha do arquivo) e
 * reescreve as imagens para a URL pública do asset e os vídeos para a URL de incorporação.
 * Blocos de código saem como foram escritos (` ```python visualizar ` inclusive).
 */
export function processNarrative(nodes: readonly MarkdownNode[], ctx: RichContentContext): string {
  const output: string[] = []
  let run: TextLineNode[] = []
  const flushRun = (): void => {
    const text = run.map((entry) => entry.text).join("\n")
    const [first] = run
    if (first) checkFormulas(findFormulas(text, first.line, ctx.report), ctx.report)
    run.forEach((entry, index) => {
      output.push(VIDEO_PREFIX.test(entry.text) ? rewriteVideo(run, index, ctx) : rewriteImages(entry.text, entry.line, ctx))
    })
    run = []
  }
  for (const node of nodes) {
    if (node.kind === "text") {
      run.push({ line: node.line, text: node.text })
      continue
    }
    flushRun()
    checkFence(node, ctx)
    output.push(...node.raw.map((line) => line.text))
  }
  flushRun()
  while (output.length > 0 && output[0]?.trim() === "") output.shift()
  while (output.length > 0 && output[output.length - 1]?.trim() === "") output.pop()
  return output.join("\n")
}
