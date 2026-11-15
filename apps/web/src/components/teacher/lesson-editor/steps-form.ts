import {
  DEFAULT_STEP_XP, isParsonsSolutionOrder, lessonStepsSchema, MAX_STEP_HINTS, parsonsSolutionLines, testCasesSchema,
  type Checkpoint, type ExerciseMode, type LessonStepInput, type ParsonsLine, type StepKind, type TestCase,
} from "@levelusp/contracts"
import { MAIN_FILE_PATH } from "@/lib/constants"

/** Rótulo pt-BR de cada tipo de passo. */
export const STEP_KIND_LABELS: Readonly<Record<StepKind, string>> = { leitura: "Leitura", exercicio: "Exercício", quiz: "Quiz", previsao: "Previsão" }

/** Rótulo pt-BR de cada modo de resposta de um exercício. */
export const EXERCISE_MODE_LABELS: Readonly<Record<ExerciseMode, string>> = {
  codigo: "Escrever o código",
  lacunas: "Completar lacunas (___)",
  ordenar: "Ordenar linhas (Parsons)",
}

const DEFAULT_STEP_CASES: TestCase[] = [{ kind: "io", id: "saida", stdin: "", expected_stdout: "Olá, mundo!", match: "contains", checkpoint: 1 }]

/** Passo novo, já válido para o tipo escolhido (o professor edita a partir dele). */
export function createStep(kind: StepKind, order: number): LessonStepInput {
  const base: LessonStepInput = {
    order, kind, title: `${STEP_KIND_LABELS[kind]} ${order}`, narrative_markdown: "", starter_files: [], solution_files: [], checkpoints: [],
    test_cases: [], hints: [], quiz_questions: [], xp: DEFAULT_STEP_XP, exercise_mode: "codigo", parsons_lines: [], expected_output: "",
  }
  if (kind === "exercicio") {
    return {
      ...base,
      starter_files: [{ path: MAIN_FILE_PATH, content: "# Escreva seu código abaixo\n" }],
      solution_files: [{ path: MAIN_FILE_PATH, content: 'print("Olá, mundo!")\n' }],
      checkpoints: [{ id: 1, instruction: "Use `print()` para exibir `Olá, mundo!`." }],
      test_cases: DEFAULT_STEP_CASES,
    }
  }
  if (kind === "previsao") return { ...base, starter_files: [{ path: MAIN_FILE_PATH, content: 'print("Olá, mundo!")\n' }], expected_output: "Olá, mundo!" }
  if (kind === "quiz") return { ...base, quiz_questions: [{ prompt: "Pergunta", options: ["Alternativa A", "Alternativa B"], correct_index: 0, explanation: "" }] }
  return base
}

/** Renumera `order` para 1..n na ordem do array (a API recusa buracos e repetições). */
export function renumberSteps(steps: readonly LessonStepInput[]): LessonStepInput[] {
  return steps.map((step, index) => ({ ...step, order: index + 1 }))
}

/** Conteúdo do `main.py` de um conjunto de arquivos (vazio quando não há). */
export function mainFileContent(files: LessonStepInput["starter_files"]): string {
  return files.find((file) => file.path === MAIN_FILE_PATH)?.content ?? files[0]?.content ?? ""
}

/** Troca o conteúdo do `main.py`, preservando os demais arquivos; texto vazio sem outros arquivos esvazia a lista. */
export function withMainFileContent(files: LessonStepInput["starter_files"], content: string): LessonStepInput["starter_files"] {
  const others = files.filter((file) => file.path !== MAIN_FILE_PATH)
  if (content === "" && others.length === 0) return []
  return [{ path: MAIN_FILE_PATH, content }, ...others]
}

const SHUFFLE_ATTEMPTS = 8

/** Gerador pseudoaleatório determinístico (mulberry32): o mesmo texto sempre embaralha igual. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), state | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

function textSeed(texts: readonly string[]): number {
  let hash = 2166136261
  for (const character of texts.join("\n")) hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16777619)
  return hash >>> 0
}

function shuffled(texts: readonly string[], random: () => number): string[] {
  const result = [...texts]
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    const current = result[index]
    const other = result[target]
    if (current === undefined || other === undefined) continue
    result[index] = other
    result[target] = current
  }
  return result
}

const toParsonsLines = (texts: readonly string[]): ParsonsLine[] => texts.map((text, index) => ({ id: `l${index + 1}`, text }))

/**
 * Linhas de um exercício `ordenar` a partir da solução e dos distratores do professor: sem
 * indentação, embaralhadas (sempre do mesmo jeito para o mesmo texto) e com ids dados DEPOIS de
 * embaralhar, para que o id não revele a posição certa. A API recusa linhas na ordem da solução;
 * por isso o embaralhamento é refeito até sair diferente dela (quando isso é possível).
 */
export function buildParsonsLines(solution: string, distractors: readonly string[]): ParsonsLine[] {
  const texts = [...parsonsSolutionLines(solution).map((line) => line.text), ...distractors.map((line) => line.trim()).filter((line) => line !== "")]
  const random = seededRandom(textSeed(texts))
  for (let attempt = 0; attempt < SHUFFLE_ATTEMPTS; attempt++) {
    const lines = toParsonsLines(shuffled(texts, random))
    if (!isParsonsSolutionOrder(lines, solution)) return lines
  }
  // Poucas linhas podem cair sempre na ordem original: girar uma posição resolve (se houver linhas diferentes).
  return toParsonsLines([...texts.slice(1), ...texts.slice(0, 1)])
}

/** Distratores de um exercício `ordenar`: as linhas do passo que sobram depois de casar cada linha da solução. */
export function parsonsDistractors(lines: readonly ParsonsLine[], solution: string): string[] {
  const remaining = parsonsSolutionLines(solution).map((line) => line.text)
  return lines
    .filter((line) => {
      const index = remaining.indexOf(line.text)
      if (index === -1) return true
      remaining.splice(index, 1)
      return false
    })
    .map((line) => line.text)
}

/**
 * Campos que mudam ao trocar o modo de um exercício: `ordenar` não tem código inicial, exige a
 * solução num único `main.py` e ganha as linhas embaralhadas; os outros modos não têm linhas.
 */
export function exerciseModeChanges(step: LessonStepInput, mode: ExerciseMode): Partial<LessonStepInput> {
  if (mode !== "ordenar") return { exercise_mode: mode, parsons_lines: [] }
  const solution = mainFileContent(step.solution_files)
  return { exercise_mode: mode, starter_files: [], solution_files: [{ path: MAIN_FILE_PATH, content: solution }], parsons_lines: buildParsonsLines(solution, []) }
}

/** Campos de um exercício `ordenar` depois de editar a solução ou os distratores (as linhas são refeitas). */
export function parsonsContentChanges(solution: string, distractors: readonly string[]): Partial<LessonStepInput> {
  return { solution_files: [{ path: MAIN_FILE_PATH, content: solution }], parsons_lines: buildParsonsLines(solution, distractors) }
}

/** Uma linha não vazia por item (instruções, dicas, alternativas). */
export function linesOf(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter((line) => line !== "")
}

/** Instruções (uma por linha) → checkpoints com ids 1..n, mantendo a dica de quem já existia na mesma posição. */
export function checkpointsFromLines(text: string, current: readonly Checkpoint[]): Checkpoint[] {
  return linesOf(text).map((instruction, index) => {
    const hint = current[index]?.hint
    return hint ? { id: index + 1, instruction, hint } : { id: index + 1, instruction }
  })
}

/** Dicas (uma por linha), limitadas ao máximo aceito pela API. */
export function hintsFromLines(text: string): string[] {
  return linesOf(text).slice(0, MAX_STEP_HINTS)
}

/** Resultado de interpretar o JSON dos casos de teste digitado pelo professor. */
export type ParsedTestCases = { ok: true; cases: TestCase[] } | { ok: false; error: string }

/** Interpreta e valida o JSON dos casos (`TestCase[]`) com o schema do contrato. */
export function parseTestCasesJson(text: string): ParsedTestCases {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: "JSON inválido: confira vírgulas, aspas e colchetes." }
  }
  const result = testCasesSchema.safeParse(parsed)
  if (result.success) return { ok: true, cases: result.data }
  const [issue] = result.error.issues
  return { ok: false, error: issue ? `${issue.path.join(".") || "casos"}: ${issue.message}` : "Casos de teste inválidos." }
}

/** Primeira mensagem de erro dos passos (antes de chamar a API) ou null. */
export function validateSteps(steps: readonly LessonStepInput[]): string | null {
  if (steps.length === 0) return "Uma lição guiada precisa de pelo menos um passo."
  const result = lessonStepsSchema.safeParse(steps)
  if (result.success) return null
  const [issue] = result.error.issues
  if (!issue) return "Há passos inválidos."
  const [index] = issue.path
  const where = typeof index === "number" ? `Passo ${index + 1}` : "Passos"
  return `${where}: ${issue.message}`
}
