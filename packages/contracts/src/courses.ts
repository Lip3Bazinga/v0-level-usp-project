import { z } from "zod"
import { difficultySchema, type Difficulty } from "./common"
import { patchSchemaOf } from "./schema"

/** Módulo temático do catálogo (agrupa lições); só admins criam e editam. */
export interface Module {
  id: string
  title: string
  description: string
  icon: string
  color: string
  sort_order: number
  created_at: string
}

export const moduleInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  icon: z.string().trim().max(60).default("BookOpen"),
  color: z.string().trim().max(60).default("bg-level-purple"),
  sort_order: z.number().int().min(0).default(0),
})
/** Corpo de `POST /modules` (admin), com os padrões visuais aplicados. */
export type ModuleInput = z.infer<typeof moduleInputSchema>

export const moduleUpdateSchema = patchSchemaOf(moduleInputSchema)
/** Corpo de `PATCH /modules/:id`: só os campos enviados mudam (sem defaults). */
export type ModuleUpdateInput = z.infer<typeof moduleUpdateSchema>

/**
 * Curso como a API devolve. `lesson_count` e `enrolled` só vêm nas rotas de catálogo (`enrolled` exige sessão).
 */
export interface Course {
  id: string
  title: string
  description: string
  long_description: string
  cover_image_url: string | null
  level: Difficulty
  tags: string[]
  total_xp: number
  estimated_hours: number
  published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  final_project_title: string | null
  final_project_description: string | null
  final_project_starter_code: string | null
  /** Campos agregados opcionais. */
  lesson_count?: number
  enrolled?: boolean
}

export const courseInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(500).default(""),
  long_description: z.string().trim().max(20_000).default(""),
  cover_image_url: z.string().max(2048).nullable().optional(),
  level: difficultySchema.default("iniciante"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  estimated_hours: z.number().int().min(0).max(1000).default(0),
  final_project_title: z.string().trim().max(160).nullable().optional(),
  final_project_description: z.string().max(20_000).nullable().optional(),
  final_project_starter_code: z.string().max(100_000).nullable().optional(),
})
/** Corpo de `POST /courses` (professor ou admin; o autor vira dono). */
export type CourseInput = z.infer<typeof courseInputSchema>
export const courseUpdateSchema = patchSchemaOf(courseInputSchema)
/** Corpo de `PATCH /courses/:id`: só os campos enviados mudam (sem defaults). */
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>

export const publishSchema = z.object({ published: z.boolean() })
/** Corpo de `PATCH /courses/:id/publish` e `PATCH /lessons/:id/publish`. */
export type PublishInput = z.infer<typeof publishSchema>

export const reorderLessonsSchema = z.object({
  lesson_ids: z.array(z.uuid()).min(1).max(500),
})
/** Corpo de `PUT /courses/:id/lessons/order`: todas as lições do curso, na nova ordem. */
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>

export const attachLessonSchema = z.object({
  lesson_id: z.uuid(),
  order: z.number().int().min(1).optional(),
})
/** Corpo de `POST /courses/:id/lessons`: anexa uma lição avulsa (sem `order`, vai para o fim). */
export type AttachLessonInput = z.infer<typeof attachLessonSchema>

/** Matrícula de um aluno num curso. */
export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
}
