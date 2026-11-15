import { z } from "zod"
import { checkpointSchema, DEFAULT_ENTRY_FILE, projectFileSchema, projectFilesSchema, type Checkpoint, type ProjectFile } from "./files"
import type { GrantedBadge } from "./gamification"
import { testCasesSchema, type CaseResult, type TestCase } from "./grading"
import { CORRECT_INDEX_OUT_OF_RANGE, correctIndexWithinOptions, multipleChoiceFields } from "./questions"

/**
 * Passos de uma lição guiada (formato Codecademy): leitura, exercício corrigido
 * por casos, quiz ou previsão de saída. O gabarito do passo (`solution_files`,
 * `test_cases`, `correct_index`, `expected_output`) é entrada do professor e NUNCA
 * sai da API para o aluno: o DTO público {@link LessonStep} só leva o que a tela precisa.
 */

export const STEP_KINDS = ["leitura", "exercicio", "quiz", "previsao"] as const
export const stepKindSchema = z.enum(STEP_KINDS)
/**
 * Tipo do passo: texto para ler, exercício verificado por casos, questionário ou
 * previsão (o aluno lê um código e digita a saída; a comparação é no servidor).
 */
export type StepKind = z.infer<typeof stepKindSchema>

export const EXERCISE_MODES = ["codigo", "lacunas", "ordenar"] as const
export const exerciseModeSchema = z.enum(EXERCISE_MODES)
/**
 * Como o aluno responde um passo de exercício: escrevendo o código (`codigo`), preenchendo
 * as lacunas `___` do código inicial (`lacunas`) ou ordenando e indentando linhas
 * embaralhadas (`ordenar`, problema de Parsons). Os três são corrigidos pelos casos do passo.
 */
export type ExerciseMode = z.infer<typeof exerciseModeSchema>
/** Modo de um passo de exercício quando não informado. */
export const DEFAULT_EXERCISE_MODE: ExerciseMode = "codigo"

/** Marca de lacuna no código inicial de um exercício `lacunas`: três ou mais sublinhados seguidos. */
export const BLANK_PATTERN = /_{3,}/g
/** Texto da lacuna como o autor escreve. */
export const BLANK_TOKEN = "___"

/** Espaços por nível de indentação ao montar o código de um exercício `ordenar`. */
export const PARSONS_INDENT_WIDTH = 4
/** Maior nível de indentação aceito numa linha de um exercício `ordenar`. */
export const MAX_PARSONS_INDENT = 12
/** Linhas (com os distratores) de um exercício `ordenar`. */
export const MAX_PARSONS_LINES = 40
/** Menor número de linhas de um exercício `ordenar` (com menos não há o que ordenar). */
export const MIN_PARSONS_LINES = 2

export const parsonsLineSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{1,12}$/, "id de linha inválido"),
  // Sem espaços nas pontas: a indentação é resposta do aluno, não pode vir na linha.
  text: z.string().min(1).max(300).refine((text) => text === text.trim() && !/[\n\r\u0000]/.test(text), "a linha não pode ter indentação, quebra de linha nem caractere nulo"),
})
/**
 * Linha de um exercício `ordenar`, já sem indentação. A lista do passo vem EMBARALHADA
 * (com os distratores misturados) e os ids não dizem nada sobre a posição certa.
 */
export type ParsonsLine = z.infer<typeof parsonsLineSchema>

/** Saída esperada de um passo de previsão: tamanho máximo, em caracteres. */
export const MAX_EXPECTED_OUTPUT_LENGTH = 4000
/** Resposta do aluno num passo de previsão: tamanho máximo, em caracteres. */
export const MAX_PREDICTION_LENGTH = 10_000

/** Dicas por passo, reveladas uma a uma. */
export const MAX_STEP_HINTS = 3
/** Passos por lição. */
export const MAX_LESSON_STEPS = 50
/** Questões por passo de quiz. */
export const MAX_STEP_QUIZ_QUESTIONS = 20
/** XP de um passo quando o pacote/professor não informa. */
export const DEFAULT_STEP_XP = 10
/** Maior índice de alternativa numa resposta de quiz de passo (questões têm até 8 opções). */
const MAX_OPTION_INDEX = 7

export const stepQuizQuestionSchema = z.object(multipleChoiceFields).refine(correctIndexWithinOptions, CORRECT_INDEX_OUT_OF_RANGE)
/** Questão de quiz de um passo, com gabarito (entrada do professor; gravada em jsonb). */
export type StepQuizQuestionInput = z.infer<typeof stepQuizQuestionSchema>

/** Campos de um passo; compartilhados com o pacote de conteúdo (que acrescenta `wrong_solutions`). */
export const lessonStepFields = {
  order: z.number().int().min(1).max(MAX_LESSON_STEPS),
  kind: stepKindSchema,
  title: z.string().trim().min(1).max(160),
  narrative_markdown: z.string().max(200_000).default(""),
  starter_files: z.array(projectFileSchema).max(30).default([]),
  /** Solução de referência; só sai pela regra de liberação (`solution_after_attempts`). */
  solution_files: z.array(projectFileSchema).max(30).default([]),
  checkpoints: z.array(checkpointSchema).max(50).default([]),
  /** Casos corrigidos ao verificar o passo; cada um pode apontar o `checkpoint` que cobre. */
  test_cases: testCasesSchema.default([]),
  hints: z.array(z.string().trim().min(1).max(2000)).max(MAX_STEP_HINTS).default([]),
  quiz_questions: z.array(stepQuizQuestionSchema).max(MAX_STEP_QUIZ_QUESTIONS).default([]),
  xp: z.number().int().min(0).max(5000).default(DEFAULT_STEP_XP),
  /** Como o aluno responde o exercício; só tem efeito em passos `exercicio`. */
  exercise_mode: exerciseModeSchema.default(DEFAULT_EXERCISE_MODE),
  /** Linhas embaralhadas (e sem indentação) do exercício `ordenar`; a ordem certa é a de `solution_files`. */
  parsons_lines: z.array(parsonsLineSchema).max(MAX_PARSONS_LINES).default([]),
  /** Saída esperada do passo `previsao` (gabarito: nunca sai da API antes da regra de liberação). */
  expected_output: z.string().max(MAX_EXPECTED_OUTPUT_LENGTH).refine((text) => !text.includes("\u0000"), "a saída contém um caractere nulo (\\0)").default(""),
}

/** O que a validação de um passo precisa ver (o pacote de conteúdo tem campos a mais). */
export interface StepContent {
  kind: StepKind
  starter_files: ProjectFile[]
  solution_files: ProjectFile[]
  checkpoints: Checkpoint[]
  test_cases: TestCase[]
  quiz_questions: StepQuizQuestionInput[]
  exercise_mode: ExerciseMode
  parsons_lines: ParsonsLine[]
  expected_output: string
}

/** Uma linha posicionada pelo aluno num exercício `ordenar`: qual linha e em que nível de indentação. */
export interface ParsonsPlacement {
  line_id: string
  indent: number
}

/** Linhas de código que contam num exercício `ordenar`: as não vazias, com a indentação separada. */
export interface ParsonsSolutionLine {
  text: string
  /** Nível de indentação (espaços ÷ {@link PARSONS_INDENT_WIDTH}); null quando a indentação não é múltipla da largura ou usa tabulação. */
  indent: number | null
}

/** Quebra o `main.py` da solução nas linhas que o aluno vai ordenar (linhas em branco não contam). */
export function parsonsSolutionLines(source: string): ParsonsSolutionLine[] {
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const leading = /^[ \t]*/.exec(line)?.[0] ?? ""
      const isRegular = !leading.includes("\t") && leading.length % PARSONS_INDENT_WIDTH === 0
      return { text: line.trim(), indent: isRegular ? leading.length / PARSONS_INDENT_WIDTH : null }
    })
}

/**
 * Monta o `main.py` de um exercício `ordenar` a partir das posições escolhidas pelo aluno.
 * Devolve null quando alguma posição cita uma linha inexistente, repete uma linha ou usa
 * indentação fora de 0..{@link MAX_PARSONS_INDENT}. Linhas não usadas (distratores) ficam de fora.
 */
export function assembleParsonsCode(lines: readonly ParsonsLine[], placements: readonly ParsonsPlacement[]): string | null {
  const textById = new Map(lines.map((line) => [line.id, line.text]))
  const used = new Set<string>()
  const assembled: string[] = []
  for (const placement of placements) {
    const text = textById.get(placement.line_id)
    if (text === undefined || used.has(placement.line_id)) return null
    if (!Number.isInteger(placement.indent) || placement.indent < 0 || placement.indent > MAX_PARSONS_INDENT) return null
    used.add(placement.line_id)
    assembled.push(`${" ".repeat(placement.indent * PARSONS_INDENT_WIDTH)}${text}`)
  }
  return assembled.length === 0 ? null : `${assembled.join("\n")}\n`
}

/**
 * Posições que reproduzem a solução com as linhas do passo (para a verificação do conteúdo e
 * para validar o passo). Devolve null quando a solução tem uma linha que não está entre as
 * linhas do passo ou uma indentação irregular.
 */
export function parsonsSolutionPlacements(lines: readonly ParsonsLine[], solutionSource: string): ParsonsPlacement[] | null {
  const available = [...lines]
  const placements: ParsonsPlacement[] = []
  for (const solutionLine of parsonsSolutionLines(solutionSource)) {
    const index = available.findIndex((line) => line.text === solutionLine.text)
    const [line] = index === -1 ? [] : available.splice(index, 1)
    if (!line || solutionLine.indent === null) return null
    placements.push({ line_id: line.id, indent: solutionLine.indent })
  }
  return placements
}

/** true quando as linhas, na ordem em que estão, já formam a solução (ignorando distratores e indentação). */
export function isParsonsSolutionOrder(lines: readonly ParsonsLine[], solutionSource: string): boolean {
  const solutionTexts = parsonsSolutionLines(solutionSource).map((line) => line.text)
  const remaining = [...solutionTexts]
  // Os distratores são o que sobra depois de casar cada linha da solução uma vez.
  const delivered = lines.filter((line) => {
    const index = remaining.indexOf(line.text)
    if (index === -1) return false
    remaining.splice(index, 1)
    return true
  })
  return delivered.length === solutionTexts.length && delivered.every((line, index) => line.text === solutionTexts[index])
}

function entryFileContent(files: readonly ProjectFile[]): string | undefined {
  return files.find((file) => file.path === DEFAULT_ENTRY_FILE)?.content
}

function checkParsonsStep(step: StepContent, ctx: z.RefinementCtx): void {
  const solution = entryFileContent(step.solution_files)
  if (solution === undefined || step.solution_files.length !== 1) {
    ctx.addIssue({ code: "custom", path: ["solution_files"], message: "um exercício de ordenar precisa da solução em um único arquivo main.py" })
    return
  }
  if (step.parsons_lines.length < MIN_PARSONS_LINES) {
    ctx.addIssue({ code: "custom", path: ["parsons_lines"], message: `um exercício de ordenar precisa de pelo menos ${MIN_PARSONS_LINES} linhas` })
    return
  }
  if (new Set(step.parsons_lines.map((line) => line.id)).size !== step.parsons_lines.length) {
    ctx.addIssue({ code: "custom", path: ["parsons_lines"], message: "id de linha repetido" })
  }
  if (parsonsSolutionPlacements(step.parsons_lines, solution) === null) {
    ctx.addIssue({ code: "custom", path: ["parsons_lines"], message: `as linhas não montam a solução (cada linha da solução precisa estar na lista, e a indentação da solução usa múltiplos de ${PARSONS_INDENT_WIDTH} espaços)` })
  } else if (isParsonsSolutionOrder(step.parsons_lines, solution)) {
    ctx.addIssue({ code: "custom", path: ["parsons_lines"], message: "as linhas estão na ordem da solução: embaralhe antes de gravar" })
  }
}

function checkExerciseMode(step: StepContent, ctx: z.RefinementCtx): void {
  if (step.exercise_mode === "ordenar") {
    checkParsonsStep(step, ctx)
    return
  }
  if (step.parsons_lines.length > 0) ctx.addIssue({ code: "custom", path: ["parsons_lines"], message: "parsons_lines só vale em exercício de ordenar" })
  if (step.exercise_mode === "lacunas" && !step.starter_files.some((file) => file.content.search(BLANK_PATTERN) !== -1)) {
    ctx.addIssue({ code: "custom", path: ["starter_files"], message: `um exercício de lacunas precisa de pelo menos uma lacuna (${BLANK_TOKEN}) no código inicial` })
  }
}

function checkPredictionStep(step: StepContent, ctx: z.RefinementCtx): void {
  if (entryFileContent(step.starter_files) === undefined) {
    ctx.addIssue({ code: "custom", path: ["starter_files"], message: "um passo de previsão precisa do código a ler em main.py" })
  }
  if (step.expected_output.trim() === "") {
    ctx.addIssue({ code: "custom", path: ["expected_output"], message: "um passo de previsão precisa da saída esperada" })
  }
}

/**
 * Regras que valem para o passo do professor e para o do pacote: exercício tem
 * casos (e, conforme o modo, lacunas ou linhas que montam a solução sem estar na ordem dela),
 * quiz tem questões, previsão tem código e saída esperada, e todo `checkpoint` citado existe.
 */
export function checkStepContent(step: StepContent, ctx: z.RefinementCtx): void {
  if (step.kind === "exercicio" && step.test_cases.length === 0) {
    ctx.addIssue({ code: "custom", path: ["test_cases"], message: "um passo de exercício precisa de pelo menos um caso de teste" })
  }
  if (step.kind === "quiz" && step.quiz_questions.length === 0) {
    ctx.addIssue({ code: "custom", path: ["quiz_questions"], message: "um passo de quiz precisa de pelo menos uma questão" })
  }
  if (step.kind === "exercicio") checkExerciseMode(step, ctx)
  else if (step.exercise_mode !== DEFAULT_EXERCISE_MODE || step.parsons_lines.length > 0) {
    ctx.addIssue({ code: "custom", path: ["exercise_mode"], message: "exercise_mode e parsons_lines só valem em passo de exercício" })
  }
  if (step.kind === "previsao") checkPredictionStep(step, ctx)
  else if (step.expected_output !== "") ctx.addIssue({ code: "custom", path: ["expected_output"], message: "expected_output só vale em passo de previsão" })
  const checkpointIds = new Set(step.checkpoints.map((checkpoint) => checkpoint.id))
  step.test_cases.forEach((testCase, index) => {
    if (testCase.checkpoint !== undefined && !checkpointIds.has(testCase.checkpoint)) {
      ctx.addIssue({ code: "custom", path: ["test_cases", index, "checkpoint"], message: `checkpoint ${testCase.checkpoint} não existe nas instruções` })
    }
  })
}

/** Passos de uma lição: `order` é 1..n na ordem do array (sem buracos nem repetição). */
export function checkStepOrders(steps: readonly { order: number }[], ctx: z.RefinementCtx): void {
  steps.forEach((step, index) => {
    if (step.order !== index + 1) ctx.addIssue({ code: "custom", path: [index, "order"], message: `esperado order ${index + 1}, veio ${step.order}` })
  })
}

export const lessonStepSchema = z.object(lessonStepFields).superRefine(checkStepContent)
/** Um passo como o professor/admin envia (com gabarito), já com os padrões aplicados. */
export type LessonStepInput = z.infer<typeof lessonStepSchema>

export const lessonStepsSchema = z.array(lessonStepSchema).max(MAX_LESSON_STEPS).superRefine(checkStepOrders)
/** Lista completa de passos de uma lição (substitui a anterior). */
export type LessonStepsInput = z.infer<typeof lessonStepsSchema>

/** Questão de quiz de um passo como o aluno recebe: sem gabarito nem explicação. */
export interface StepQuizQuestion {
  prompt: string
  options: string[]
}

/**
 * Passo como o ALUNO vê: sem `solution_files`, sem `test_cases`, sem `expected_output` e quiz
 * sem `correct_index`. Os casos só aparecem contados; as dicas vêm uma a uma por
 * `POST /me/lessons/:id/steps/:stepId/hint` ({@link HintReveal}).
 */
export interface LessonStep {
  id: string
  lesson_id: string
  order: number
  kind: StepKind
  title: string
  narrative_markdown: string
  starter_files: ProjectFile[]
  checkpoints: Checkpoint[]
  /** Quantos casos a verificação roda (o conteúdo deles nunca sai da API). */
  test_case_count: number
  /** Quantas dicas o passo tem (o texto só sai ao revelar). */
  hint_count: number
  quiz_questions: StepQuizQuestion[]
  xp: number
  /** Como o exercício é respondido (`codigo` em todo passo que não é exercício). */
  exercise_mode: ExerciseMode
  /**
   * Exercício `ordenar`: as linhas JÁ EMBARALHADAS e sem indentação (distratores misturados).
   * A ordem e a indentação certas são gabarito e não saem da API. Vazio nos demais passos.
   */
  parsons_lines: ParsonsLine[]
}

export const STEP_PROGRESS_STATUSES = ["in_progress", "completed"] as const
/** Situação do aluno num passo; a linha só existe depois da primeira interação. */
export type StepProgressStatus = (typeof STEP_PROGRESS_STATUSES)[number]

/** Progresso do aluno num passo (`GET /me/lessons/:id/progress` → `steps`). */
export interface LessonStepProgress {
  step_id: string
  status: StepProgressStatus
  /** Verificações reprovadas até agora (sucessos e erros de infraestrutura não contam). */
  attempts: number
  hints_revealed: number
  solution_viewed: boolean
  xp_awarded: number
  completed_at: string | null
}

/** Efeito de um passo na gamificação; zerado quando o passo já estava concluído. */
export interface StepOutcome {
  step_completed: boolean
  /** XP creditado agora (metade do XP do passo quando a solução foi vista). */
  xp_awarded: number
  /** true quando este passo fechou a lição (todos concluídos), com o fluxo de XP/badges da lição. */
  lesson_completed: boolean
  granted_badges: GrantedBadge[]
  level_up: boolean
  new_level: number
}

/** Resultado de um caso no passo; `checkpoint` liga o caso à instrução numerada. */
export interface StepCaseResult extends CaseResult {
  /** Dica do caso (a do professor), mostrada quando ele falha. */
  hint: string | null
  checkpoint: number | null
}

/** Resposta de `POST /me/lessons/:id/steps/:stepId/submit`: veredito do passo e efeito na gamificação. */
export interface StepSubmitResult extends StepOutcome {
  step_id: string
  passed: boolean
  cases: StepCaseResult[]
  attempts: number
  /** O aluno já pode pedir a solução (`attempts >= solution_after_attempts`, que precisa ser > 0). */
  solution_available: boolean
}

/** Resposta de `POST /me/lessons/:id/steps/:stepId/complete` (passos de leitura). */
export interface StepCompleteResult extends StepOutcome {
  step_id: string
}

/** Dica revelada; `index` é a posição dela (0 = primeira) e `text` o conteúdo. */
export interface HintReveal {
  index: number
  text: string
}

/**
 * Solução de referência liberada depois das tentativas (`POST …/solution`): os arquivos da
 * solução num exercício; num passo de previsão, `files` vem vazio e `expected_output` traz a saída.
 */
export interface SolutionReveal {
  files: ProjectFile[]
  /** Saída esperada do passo de previsão; null nos exercícios. */
  expected_output: string | null
}

export const parsonsPlacementSchema = z.object({
  line_id: z.string().max(12),
  indent: z.number().int().min(0).max(MAX_PARSONS_INDENT),
})
export const parsonsArrangementSchema = z.array(parsonsPlacementSchema).min(1).max(MAX_PARSONS_LINES)

export const stepSubmitSchema = z
  .object({
    /** O projeto a corrigir (exercícios `codigo` e `lacunas`). */
    files: projectFilesSchema.optional(),
    /** Exercício `ordenar`: as linhas escolhidas, na ordem, com o nível de indentação de cada uma. */
    arrangement: parsonsArrangementSchema.optional(),
  })
  .refine((body) => body.files !== undefined || body.arrangement !== undefined, "Envie files (o projeto) ou arrangement (as linhas ordenadas).")
/**
 * Corpo de `POST /me/lessons/:id/steps/:stepId/submit`: `files` nos exercícios `codigo` e
 * `lacunas`; `arrangement` no exercício `ordenar` (o servidor monta o código a partir das linhas do passo).
 */
export type StepSubmitInput = z.infer<typeof stepSubmitSchema>

export const stepPredictSchema = z.object({
  /** A saída que o aluno espera do código do passo. */
  output: z.string().max(MAX_PREDICTION_LENGTH),
})
/** Corpo de `POST /me/lessons/:id/steps/:stepId/predict`. */
export type StepPredictInput = z.infer<typeof stepPredictSchema>

/**
 * Resposta de `POST /me/lessons/:id/steps/:stepId/predict`: só o veredito e o efeito na
 * gamificação — a saída esperada e as diferenças não voltam (entregariam o gabarito).
 */
export interface StepPredictResult extends StepOutcome {
  step_id: string
  passed: boolean
  attempts: number
  /** O aluno já pode pedir a saída esperada por `POST …/solution`. */
  solution_available: boolean
}

export const stepQuizSubmitSchema = z.object({
  /** Índice da alternativa escolhida, na ordem das questões do passo. */
  answers: z.array(z.number().int().min(0).max(MAX_OPTION_INDEX)).min(1).max(MAX_STEP_QUIZ_QUESTIONS),
})
/** Corpo de `POST /me/lessons/:id/steps/:stepId/quiz`. */
export type StepQuizSubmitInput = z.infer<typeof stepQuizSubmitSchema>

/** Correção de uma questão do quiz do passo (pela posição), com a explicação do professor. */
export interface StepQuizReview {
  index: number
  correct: boolean
  explanation: string
}

/** Resposta de `POST /me/lessons/:id/steps/:stepId/quiz`: nota, revisão e efeito na gamificação. */
export interface StepQuizResult extends StepOutcome {
  step_id: string
  score: number
  passed: boolean
  passing_score: number
  correct_count: number
  total: number
  review: StepQuizReview[]
}
