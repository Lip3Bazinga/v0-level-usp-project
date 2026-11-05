import { z } from "zod"
import { checkpointSchema, projectFileSchema, projectFilesSchema, type Checkpoint, type ProjectFile } from "./files"
import type { GrantedBadge } from "./gamification"
import { testCasesSchema, type CaseResult, type TestCase } from "./grading"
import { CORRECT_INDEX_OUT_OF_RANGE, correctIndexWithinOptions, multipleChoiceFields } from "./questions"

/**
 * Passos de uma lição guiada (formato Codecademy): leitura, exercício corrigido
 * por casos ou quiz. O gabarito do passo (`solution_files`, `test_cases`,
 * `correct_index`) é entrada do professor e NUNCA sai da API para o aluno:
 * o DTO público {@link LessonStep} só leva o que a tela precisa.
 */

export const STEP_KINDS = ["leitura", "exercicio", "quiz"] as const
export const stepKindSchema = z.enum(STEP_KINDS)
/** Tipo do passo: texto para ler, exercício verificado por casos ou questionário. */
export type StepKind = z.infer<typeof stepKindSchema>

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
}

/** O que a validação de um passo precisa ver (o pacote de conteúdo tem campos a mais). */
export interface StepContent {
  kind: StepKind
  checkpoints: Checkpoint[]
  test_cases: TestCase[]
  quiz_questions: StepQuizQuestionInput[]
}

/**
 * Regras que valem para o passo do professor e para o do pacote: exercício tem
 * casos, quiz tem questões e todo `checkpoint` citado num caso existe.
 */
export function checkStepContent(step: StepContent, ctx: z.RefinementCtx): void {
  if (step.kind === "exercicio" && step.test_cases.length === 0) {
    ctx.addIssue({ code: "custom", path: ["test_cases"], message: "um passo de exercício precisa de pelo menos um caso de teste" })
  }
  if (step.kind === "quiz" && step.quiz_questions.length === 0) {
    ctx.addIssue({ code: "custom", path: ["quiz_questions"], message: "um passo de quiz precisa de pelo menos uma questão" })
  }
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
 * Passo como o ALUNO vê: sem `solution_files`, sem `test_cases` e quiz sem
 * `correct_index`. Os casos só aparecem contados; as dicas vêm uma a uma por
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

/** Solução de referência liberada depois das tentativas (`POST …/solution`). */
export interface SolutionReveal {
  files: ProjectFile[]
}

export const stepSubmitSchema = z.object({ files: projectFilesSchema })
/** Corpo de `POST /me/lessons/:id/steps/:stepId/submit`: o projeto a corrigir. */
export type StepSubmitInput = z.infer<typeof stepSubmitSchema>

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
