import { z } from "zod"
import { difficultySchema, type Difficulty } from "./common"
import { testCasesSchema, type TestCase } from "./grading"
import { patchSchemaOf } from "./courses"

export interface Checkpoint {
  id: number
  instruction: string
  hint?: string
}
export const checkpointSchema = z.object({
  id: z.number().int(),
  instruction: z.string().max(2000),
  hint: z.string().max(2000).optional(),
})

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
  content: z.string().max(100_000),
})
export const projectFilesSchema = z
  .array(projectFileSchema)
  .min(1)
  .max(30)
  .refine((files) => files.reduce((n, f) => n + f.content.length, 0) <= 300_000, "Projeto grande demais")

export type LessonType = "coding" | "theory" | "quiz"

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
  lesson_type: z.enum(["coding", "theory", "quiz"]).default("coding"),
  quiz_passing_score: z.number().int().min(1).max(100).default(70),
  xp_reward: z.number().int().min(0).max(5000).default(50),
  /** Tempo estimado de estudo, em minutos (informativo). */
  time_limit: z.number().int().min(1).max(300).default(10),
  test_cases: testCasesSchema.default([]),
})
export type LessonInput = z.infer<typeof lessonInputSchema>
export const lessonUpdateSchema = patchSchemaOf(lessonInputSchema)
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>

export type LessonStatus = "not_started" | "in_progress" | "completed"

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
export type SaveSnapshotInput = z.infer<typeof saveSnapshotSchema>

export const submitCodeSchema = z.object({ files: projectFilesSchema })
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

// ── Quiz de lição ────────────────────────────────────────────────────────────

export interface QuizQuestionFull {
  id: string
  prompt: string
  options: string[]
  correct_index: number
  explanation: string
  sort_order: number
}
export type QuizQuestionPublic = Pick<QuizQuestionFull, "id" | "prompt" | "options">

export const quizQuestionInputSchema = z
  .object({
    prompt: z.string().trim().min(1).max(2000),
    options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
    correct_index: z.number().int().min(0),
    explanation: z.string().trim().max(2000).default(""),
  })
  .refine((q) => q.correct_index < q.options.length, {
    message: "correct_index fora das opções",
    path: ["correct_index"],
  })
export type QuizQuestionInput = z.infer<typeof quizQuestionInputSchema>
export const replaceQuizSchema = z.object({ questions: z.array(quizQuestionInputSchema).max(50) })

export const quizSubmitSchema = z.object({
  answers: z.record(z.uuid(), z.number().int().min(0).max(20)),
})
export type QuizSubmitInput = z.infer<typeof quizSubmitSchema>

export interface QuizResult {
  score: number
  passed: boolean
  passingScore: number
  correctCount: number
  total: number
  review: { questionId: string; correct: boolean; explanation: string }[]
  xp_awarded: number
  lesson_completed: boolean
}
