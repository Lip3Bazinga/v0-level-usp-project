import { z } from "zod"
import { difficultySchema, type Difficulty } from "./common"
import { testCasesSchema, type TestCase } from "./grading"
import { answerSheetSchema, CORRECT_INDEX_OUT_OF_RANGE, correctIndexWithinOptions, multipleChoiceFields, type AnswerSheetResult } from "./questions"
import { patchSchemaOf } from "./schema"

export const checkpointSchema = z.object({
  id: z.number().int(),
  instruction: z.string().max(2000),
  hint: z.string().max(2000).optional(),
})
/** Etapa guiada de uma lição prática: instrução exibida ao aluno e dica opcional. */
export type Checkpoint = z.infer<typeof checkpointSchema>

/** Arquivo de entrada executado pelo corretor e pelo botão Executar. */
export const DEFAULT_ENTRY_FILE = "main.py"

/** Arquivo de um projeto multi-arquivo. Pastas são implícitas pelo path. */
export interface ProjectFile {
  path: string
  content: string
}

/** Caminho relativo seguro: sem "..", sem barra inicial, só .py/.txt/.csv/.json/.md. */
export const projectPathSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^(?!\/)(?!.*\.\.)[A-Za-z0-9_\-./]+\.(py|txt|csv|json|md)$/, "Caminho de arquivo inválido")

export const projectFileSchema = z.object({
  path: projectPathSchema,
  // NUL não existe em código-fonte de verdade e o PostgreSQL recusa \u0000 em jsonb (viraria 500).
  content: z.string().max(100_000).refine((content) => !content.includes("\u0000"), "O arquivo contém um caractere nulo (\\0)."),
})
export const projectFilesSchema = z
  .array(projectFileSchema)
  .min(1)
  .max(30)
  .refine((files) => files.reduce((totalLength, file) => totalLength + file.content.length, 0) <= 300_000, "Projeto grande demais")

export const LESSON_TYPES = ["coding", "theory", "quiz"] as const
export const lessonTypeSchema = z.enum(LESSON_TYPES)
/** Tipo de lição: prática com correção (`coding`), leitura (`theory`) ou questionário (`quiz`). */
export type LessonType = z.infer<typeof lessonTypeSchema>

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
  created_by: string | null
  published: boolean
  created_at: string
  updated_at: string
}

/** Lição como o professor dono (ou admin) vê: inclui os casos de teste. */
export interface LessonWithTests extends Lesson {
  test_cases: TestCase[]
}

/** Lição resumida para listas e trilhas (`GET /lessons/summaries`). */
export type LessonSummary = Pick<
  Lesson,
  | "id" | "title" | "slug" | "module" | "module_id" | "order" | "difficulty"
  | "lesson_type" | "xp_reward" | "course_id" | "published"
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
