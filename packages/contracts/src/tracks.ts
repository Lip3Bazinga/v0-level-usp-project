import { z } from "zod"
import { slugSchema } from "./common"
import type { Course } from "./courses"
import { patchSchemaOf } from "./schema"

/**
 * Trilha: sequência ordenada de cursos (níveis certificáveis). Ao certificar
 * todos os cursos, o aluno recebe o certificado da trilha.
 */
export interface Track {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  color: string
  sort_order: number
  published: boolean
  /** Nome impresso no certificado da trilha (ex.: "Python: do zero à IA"). */
  certificate_title: string
  created_at: string
  updated_at: string
  /** Quantos cursos a trilha encadeia; só vem nas listagens. */
  course_count?: number
}

export const TRACK_COURSE_STATUSES = ["locked", "available", "in_progress", "completed", "certified"] as const
/**
 * Situação do aluno num curso da trilha: `locked` (pré-requisito sem certificado),
 * `available`, `in_progress` (matriculado), `completed` (todas as lições) ou `certified`.
 */
export type TrackCourseStatus = (typeof TRACK_COURSE_STATUSES)[number]

/** Curso dentro da trilha, com a posição e a situação do aluno (sem sessão: `available`/`locked` só pelo pré-requisito). */
export interface TrackCourse extends Course {
  position: number
  student_status: TrackCourseStatus
}

/** Trilha com os cursos na ordem (`GET /tracks/:slug`). */
export interface TrackWithCourses extends Track {
  courses: TrackCourse[]
}

export const trackInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).default(""),
  icon: z.string().trim().max(60).default("BookOpen"),
  color: z.string().trim().max(60).default("bg-level-purple"),
  sort_order: z.number().int().min(0).default(0),
  published: z.boolean().default(false),
  certificate_title: z.string().trim().max(160).default(""),
  /** Cursos na ordem da trilha (a posição é o índice); substitui a sequência inteira. */
  course_ids: z
    .array(z.uuid())
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length, "curso repetido na trilha")
    .default([]),
})
/** Corpo de `POST /admin/tracks`, com os padrões aplicados. */
export type TrackInput = z.infer<typeof trackInputSchema>
export const trackUpdateSchema = patchSchemaOf(trackInputSchema)
/** Corpo de `PATCH /admin/tracks/:id`: só os campos enviados mudam (sem defaults). */
export type TrackUpdateInput = z.infer<typeof trackUpdateSchema>

/** Certificado de trilha do aluno (`GET /me/certificates` → trilhas). */
export interface TrackCertificate {
  id: string
  user_id: string
  track_id: string
  track_title: string
  certificate_title: string
  verification_code: string
  issued_at: string
}

/** Resposta de `POST /me/tracks/:id/certificate`; idempotente (`already_issued` na segunda chamada). */
export interface TrackCertificateIssue {
  issued: boolean
  already_issued: boolean
  verification_code: string
  issued_at: string
}

/** Conclusão de curso: 100 % das lições publicadas feitas (pré-condição do certificado). */
export interface CourseCompletion {
  id: string
  user_id: string
  course_id: string
  completed_at: string
}
