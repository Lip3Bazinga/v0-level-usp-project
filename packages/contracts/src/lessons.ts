import { z } from "zod"
import { difficultySchema, type Difficulty } from "./common"
import { projectFileSchema, projectFilesSchema, checkpointSchema, type Checkpoint, type ProjectFile } from "./files"
import { testCasesSchema, type TestCase } from "./grading"
import { answerSheetSchema, CORRECT_INDEX_OUT_OF_RANGE, correctIndexWithinOptions, multipleChoiceFields, type AnswerSheetResult } from "./questions"
import { patchSchemaOf } from "./schema"
import { lessonStepsSchema, type LessonStep, type LessonStepInput, type LessonStepProgress } from "./steps"

export { DEFAULT_ENTRY_FILE, checkpointSchema, projectFileSchema, projectFilesSchema, projectPathSchema } from "./files"
export type { Checkpoint, ProjectFile } from "./files"

export const LESSON_TYPES = ["coding", "theory", "quiz", "guided"] as const
export const lessonTypeSchema = z.enum(LESSON_TYPES)
/**
 * Tipo de lição: prática com correção (`coding`), leitura (`theory`), questionário (`quiz`)
 * ou guiada em passos (`guided`, formato Codecademy: cada passo é lido, verificado ou respondido).
 */
export type LessonType = z.infer<typeof lessonTypeSchema>

export const LESSON_RUNTIMES = ["python", "python-dados"] as const
export const lessonRuntimeSchema = z.enum(LESSON_RUNTIMES)
/** Motor que corrige a lição: CPython WASI (`python`) ou Pyodide com numpy/pandas/scikit-learn (`python-dados`). */
export type LessonRuntime = z.infer<typeof lessonRuntimeSchema>

/** Objetivos de aprendizagem por lição. */
export const MAX_LESSON_OBJECTIVES = 10
/** Verificações reprovadas antes de liberar a solução, quando não informado. */
export const DEFAULT_SOLUTION_AFTER_ATTEMPTS = 3
/** Teto de `solution_after_attempts` (0 = a solução nunca é liberada). */
export const MAX_SOLUTION_AFTER_ATTEMPTS = 20

/** Lição como o aluno vê (sem gabarito). */
export interface Lesson {
  id: string
  title: string
  description: string
  slug: string | null
  module: string
  order: number
  difficulty: Difficulty
  content_markdown: string
  starter_code: string
  starter_files: ProjectFile[]
  checkpoints: Checkpoint[]
  libraries: string[] | null
  xp_reward: number
  time_limit: number
  lesson_type: LessonType
  quiz_passing_score: number
  course_id: string | null
  module_id: string | null
  published: boolean
  created_at: string
  updated_at: string
  runtime: LessonRuntime
  /** Projeto do nível: conta para o certificado do curso. */
  is_project: boolean
  objectives: string[]
  /** Verificações reprovadas de um passo antes de liberar a solução (0 = nunca). */
  solution_after_attempts: number
  /** Passos da lição guiada, na ordem; vazio nas lições clássicas (`coding`/`theory`/`quiz`). */
  steps: LessonStep[]
  /**
   * Limite do curso para liberar o "Executar" (`courses.run_button_min_level`). Só vem em
   * `GET /lessons/:id`; ausente ou null = `RUN_BUTTON_MIN_LEVEL` (ver `isRunButtonUnlocked`).
   */
  run_button_min_level?: number | null
}

/** Lição como o professor dono (ou admin) vê: inclui os casos de teste e a solução de referência. */
export interface LessonWithTests extends Lesson {
  test_cases: TestCase[]
  solution_files: ProjectFile[]
  /** Autor da lição; fora do DTO público para não expor o id do professor a qualquer visitante. */
  created_by: string | null
  /** Passos COM gabarito (solução, casos e `correct_index`), no formato que `steps` aceita de volta. */
  authoring_steps: LessonStepInput[]
}

/** Lição resumida para listas e trilhas (`GET /lessons/summaries`). */
export type LessonSummary = Pick<
  Lesson,
  | "id" | "title" | "slug" | "module" | "module_id" | "order" | "difficulty"
  | "lesson_type" | "xp_reward" | "course_id" | "published" | "is_project"
>

export const lessonInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).default(""),
  module: z.string().trim().max(120).default(""),
  module_id: z.uuid().nullable().optional(),
  course_id: z.uuid().nullable().optional(),
  order: z.number().int().min(1).max(10_000).default(1),
  difficulty: difficultySchema.default("iniciante"),
  content_markdown: z.string().max(200_000).default(""),
  starter_code: z.string().max(100_000).default(""),
  starter_files: z.array(projectFileSchema).max(30).default([]),
  checkpoints: z.array(checkpointSchema).max(50).default([]),
  libraries: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  lesson_type: lessonTypeSchema.default("coding"),
  quiz_passing_score: z.number().int().min(1).max(100).default(70),
  xp_reward: z.number().int().min(0).max(5000).default(50),
  /** Tempo estimado de estudo, em minutos (informativo). */
  time_limit: z.number().int().min(1).max(300).default(10),
  test_cases: testCasesSchema.default([]),
  // Campos do curso completo: opcionais (sem default) para que a ausência deixe o padrão do banco
  // e um cliente antigo continue montando o corpo sem conhecê-los.
  runtime: lessonRuntimeSchema.optional(),
  is_project: z.boolean().optional(),
  objectives: z.array(z.string().trim().min(1).max(300)).max(MAX_LESSON_OBJECTIVES).optional(),
  /** Solução de referência da lição clássica; nunca sai para o aluno sem a regra de liberação. */
  solution_files: z.array(projectFileSchema).max(30).optional(),
  solution_after_attempts: z.number().int().min(0).max(MAX_SOLUTION_AFTER_ATTEMPTS).optional(),
  /** Passos da lição guiada; quando enviado, substitui todos os passos existentes. */
  steps: lessonStepsSchema.optional(),
})
/** Corpo de `POST /lessons`, com os padrões aplicados. */
export type LessonInput = z.infer<typeof lessonInputSchema>
export const lessonUpdateSchema = patchSchemaOf(lessonInputSchema)
/** Corpo de `PATCH /lessons/:id`: só os campos enviados mudam (sem defaults). */
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>

export const LESSON_STATUSES = ["not_started", "in_progress", "completed"] as const
/** Situação do aluno numa lição. */
export type LessonStatus = (typeof LESSON_STATUSES)[number]

/** Progresso do aluno numa lição (`GET /me/progress`); `score` só existe nos questionários. */
export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  status: LessonStatus
  code_snapshot: string | null
  score: number | null
  xp_earned: number
  completed_at: string | null
  created_at: string
}

/** Progresso do aluno numa lição guiada, passo a passo (`GET /me/lessons/:id/progress`). */
export interface LessonStepsProgress {
  lesson_id: string
  status: LessonStatus
  /** Só os passos em que o aluno já interagiu; os demais ainda não têm linha. */
  steps: LessonStepProgress[]
}

export const saveSnapshotSchema = z.object({ files: projectFilesSchema })
/** Rascunho salvo do aluno numa lição; `files` é null quando nunca salvou (a IDE usa o código inicial). */
export interface LessonSnapshot {
  files: ProjectFile[] | null
}
/** Corpo de `PUT /lessons/:id/snapshot`: o projeto inteiro do aluno. */
export type SaveSnapshotInput = z.infer<typeof saveSnapshotSchema>

export const submitCodeSchema = z.object({ files: projectFilesSchema })
/** Corpo de `POST /lessons/:id/submissions`: o projeto a corrigir. */
export type SubmitCodeInput = z.infer<typeof submitCodeSchema>

export const SUBMISSION_STATUSES = ["graded", "error"] as const
/**
 * Situação de uma submissão: `graded` tem veredito; `error` é falha de infraestrutura
 * (executor indisponível, timeout do host) e não conta como tentativa nem como reprovação.
 */
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

/** Um dia no mapa de atividade (datas em ISO yyyy-mm-dd). */
export interface ActivityDay {
  date: string
  xp: number
  activities: number
}

/** Métricas por lição para o painel do professor. */
export interface LessonMetrics {
  lesson_id: string
  started: number
  completed: number
  submissions: number
  pass_rate: number | null
}

/** Questão de quiz com gabarito e explicação (só para o autor e admins). */
export interface QuizQuestionFull {
  id: string
  prompt: string
  options: string[]
  correct_index: number
  explanation: string
  sort_order: number
}
/** Questão de quiz como o aluno recebe: sem gabarito nem explicação. */
export type QuizQuestionPublic = Pick<QuizQuestionFull, "id" | "prompt" | "options">

export const quizQuestionInputSchema = z
  .object(multipleChoiceFields)
  .refine(correctIndexWithinOptions, CORRECT_INDEX_OUT_OF_RANGE)
/** Uma questão no corpo de `PUT /lessons/:id/quiz`; `correct_index` precisa cair numa das opções. */
export type QuizQuestionInput = z.infer<typeof quizQuestionInputSchema>
export const replaceQuizSchema = z.object({ questions: z.array(quizQuestionInputSchema).max(50) })
/** Corpo de `PUT /lessons/:id/quiz`: substitui todas as questões do quiz. */
export type ReplaceQuizInput = z.infer<typeof replaceQuizSchema>

export const quizSubmitSchema = z.object({ answers: answerSheetSchema })
/** Corpo de `POST /lessons/:id/quiz/submissions`. */
export type QuizSubmitInput = z.infer<typeof quizSubmitSchema>

/** Correção do quiz somada ao efeito da conclusão na gamificação. */
export interface QuizResult extends AnswerSheetResult {
  xp_awarded: number
  lesson_completed: boolean
}
