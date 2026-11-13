import {
  DEFAULT_STEP_XP, lessonStepsSchema, MAX_STEP_HINTS, testCasesSchema,
  type Checkpoint, type LessonStepInput, type StepKind, type TestCase,
} from "@levelusp/contracts"
import { MAIN_FILE_PATH } from "@/lib/constants"

/** Rótulo pt-BR de cada tipo de passo. */
export const STEP_KIND_LABELS: Readonly<Record<StepKind, string>> = { leitura: "Leitura", exercicio: "Exercício", quiz: "Quiz" }

const DEFAULT_STEP_CASES: TestCase[] = [{ kind: "io", id: "saida", stdin: "", expected_stdout: "Olá, mundo!", match: "contains", checkpoint: 1 }]

/** Passo novo, já válido para o tipo escolhido (o professor edita a partir dele). */
export function createStep(kind: StepKind, order: number): LessonStepInput {
  const base: LessonStepInput = {
    order, kind, title: `${STEP_KIND_LABELS[kind]} ${order}`, narrative_markdown: "", starter_files: [], solution_files: [], checkpoints: [],
    test_cases: [], hints: [], quiz_questions: [], xp: DEFAULT_STEP_XP,
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
