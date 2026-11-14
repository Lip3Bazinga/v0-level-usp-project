import { assembleParsonsCode, BLANK_PATTERN, BLANK_TOKEN, MAX_PARSONS_INDENT, type ParsonsLine, type ParsonsPlacement, type ProjectFile } from "@levelusp/contracts"
import { MAIN_FILE_PATH, STORAGE_KEYS } from "@/lib/constants"
import { moveItem, type MoveDirection } from "./list-editing"

/*
 * Regras puras dos exercícios `lacunas` e `ordenar`. Nada aqui conhece a resposta certa: a web
 * só monta o código que o ALUNO escreveu/ordenou; quem corrige é a API.
 */

const BLANKS_DRAFT_SUFFIX = ":lacunas"
const ARRANGEMENT_DRAFT_SUFFIX = ":ordem"

/** Trechos de código entre as lacunas: `n` lacunas produzem `n + 1` trechos (alguns podem ser vazios). */
export function splitBlanks(source: string): string[] {
  return source.split(BLANK_PATTERN)
}

/** Quantas lacunas (`___`) o código tem. */
export function countBlanks(source: string): number {
  return splitBlanks(source).length - 1
}

/** Resposta de uma lacuna como é guardada: uma linha só (quebras de linha viram espaço). */
export function normalizeBlankAnswer(text: string): string {
  return text.replace(/[\r\n]+/g, " ")
}

/**
 * Código com cada lacuna trocada pela resposta da mesma posição. Lacuna sem resposta continua
 * `___`: o Python acusa o nome indefinido em vez de um erro de sintaxe difícil de ler.
 */
export function fillBlanks(source: string, answers: readonly string[]): string {
  const segments = splitBlanks(source)
  return segments.reduce((code, segment, index) => {
    if (index === 0) return segment
    const answer = normalizeBlankAnswer(answers[index - 1] ?? "")
    return `${code}${answer.trim() === "" ? BLANK_TOKEN : answer}${segment}`
  }, "")
}

/** Projeto do exercício de lacunas com as respostas aplicadas ao `main.py` (os demais arquivos vão como estão). */
export function fillBlanksInFiles(files: readonly ProjectFile[], answers: readonly string[]): ProjectFile[] {
  return files.map((file) => (file.path === MAIN_FILE_PATH ? { path: file.path, content: fillBlanks(file.content, answers) } : { path: file.path, content: file.content }))
}

function readDraft(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function writeDraft(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sem armazenamento (modo privado, cota cheia) o aluno só perde o rascunho ao recarregar.
  }
}

function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nada a fazer: sem armazenamento não havia rascunho.
  }
}

const blanksDraftKey = (stepId: string): string => `${STORAGE_KEYS.stepDraftPrefix}${stepId}${BLANKS_DRAFT_SUFFIX}`
const arrangementDraftKey = (stepId: string): string => `${STORAGE_KEYS.stepDraftPrefix}${stepId}${ARRANGEMENT_DRAFT_SUFFIX}`

/**
 * Respostas das lacunas guardadas no navegador, ajustadas para `blankCount` posições (o professor
 * pode ter mudado o código). Sem rascunho ou com rascunho corrompido, todas vazias.
 */
export function readBlanksDraft(stepId: string, blankCount: number): string[] {
  const draft = readDraft(blanksDraftKey(stepId))
  const saved = Array.isArray(draft) ? draft : []
  return Array.from({ length: blankCount }, (_unused, index) => {
    const answer: unknown = saved[index]
    return typeof answer === "string" ? normalizeBlankAnswer(answer) : ""
  })
}

/** Guarda as respostas das lacunas do passo; falha em silêncio. */
export function writeBlanksDraft(stepId: string, answers: readonly string[]): void {
  writeDraft(blanksDraftKey(stepId), answers)
}

/** Apaga o rascunho das lacunas do passo. */
export function clearBlanksDraft(stepId: string): void {
  clearDraft(blanksDraftKey(stepId))
}

function isPlacement(value: unknown): value is ParsonsPlacement {
  return typeof value === "object" && value !== null && "line_id" in value && typeof value.line_id === "string" && "indent" in value && typeof value.indent === "number"
}

/** Mantém a indentação dentro de 0..{@link MAX_PARSONS_INDENT}. */
export function clampIndent(indent: number): number {
  return Math.min(Math.max(Math.trunc(indent), 0), MAX_PARSONS_INDENT)
}

/**
 * Só as posições válidas para as linhas do passo: linha existente, sem repetição e indentação
 * dentro do limite. Serve para o rascunho (as linhas do passo podem ter mudado).
 */
export function sanitizePlacements(lines: readonly ParsonsLine[], candidate: unknown): ParsonsPlacement[] {
  if (!Array.isArray(candidate)) return []
  const known = new Set(lines.map((line) => line.id))
  const used = new Set<string>()
  const placements: ParsonsPlacement[] = []
  for (const item of candidate as unknown[]) {
    if (!isPlacement(item) || !known.has(item.line_id) || used.has(item.line_id)) continue
    used.add(item.line_id)
    placements.push({ line_id: item.line_id, indent: clampIndent(item.indent) })
  }
  return placements
}

/** Linhas ainda não usadas na resposta, na ordem em que a API as entregou (nunca reembaralhadas). */
export function availableLines(lines: readonly ParsonsLine[], placements: readonly ParsonsPlacement[]): ParsonsLine[] {
  const used = new Set(placements.map((placement) => placement.line_id))
  return lines.filter((line) => !used.has(line.id))
}

/**
 * Coloca a linha na resposta, na posição `index` (fim quando omitido). Se ela já estava na
 * resposta, muda de lugar mantendo a indentação.
 */
export function placeLine(placements: readonly ParsonsPlacement[], lineId: string, index: number = placements.length): ParsonsPlacement[] {
  const current = placements.find((placement) => placement.line_id === lineId)
  const others = placements.filter((placement) => placement.line_id !== lineId)
  const target = Math.min(Math.max(index, 0), others.length)
  return [...others.slice(0, target), current ?? { line_id: lineId, indent: 0 }, ...others.slice(target)]
}

/** Devolve a linha à área de origem. */
export function unplaceLine(placements: readonly ParsonsPlacement[], lineId: string): ParsonsPlacement[] {
  return placements.filter((placement) => placement.line_id !== lineId)
}

/** Sobe (-1) ou desce (+1) a linha na resposta; nas pontas nada muda. */
export function moveLine(placements: readonly ParsonsPlacement[], lineId: string, direction: MoveDirection): ParsonsPlacement[] {
  return moveItem(placements, placements.findIndex((placement) => placement.line_id === lineId), direction)
}

/** Soma `delta` níveis à indentação da linha, sem sair de 0..{@link MAX_PARSONS_INDENT}. */
export function indentLine(placements: readonly ParsonsPlacement[], lineId: string, delta: number): ParsonsPlacement[] {
  return placements.map((placement) => (placement.line_id === lineId ? { line_id: placement.line_id, indent: clampIndent(placement.indent + delta) } : placement))
}

/**
 * `main.py` montado com as linhas que o aluno posicionou, só para "Executar" e "Visualizar"
 * (na correção a API monta o código a partir das posições). null enquanto a resposta está vazia.
 */
export function arrangementFiles(lines: readonly ParsonsLine[], placements: readonly ParsonsPlacement[]): ProjectFile[] | null {
  const code = assembleParsonsCode(lines, placements)
  return code === null ? null : [{ path: MAIN_FILE_PATH, content: code }]
}

/** Arranjo guardado no navegador para o passo, já validado contra as linhas atuais. */
export function readArrangementDraft(stepId: string, lines: readonly ParsonsLine[]): ParsonsPlacement[] {
  return sanitizePlacements(lines, readDraft(arrangementDraftKey(stepId)))
}

/** Guarda o arranjo do aluno (a resposta DELE, nunca a certa); falha em silêncio. */
export function writeArrangementDraft(stepId: string, placements: readonly ParsonsPlacement[]): void {
  writeDraft(arrangementDraftKey(stepId), placements)
}

/** Apaga o arranjo guardado do passo. */
export function clearArrangementDraft(stepId: string): void {
  clearDraft(arrangementDraftKey(stepId))
}
