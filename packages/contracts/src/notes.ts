import { z } from "zod"

export interface Note {
  id: string
  user_id: string
  lesson_id: string | null
  course_id: string | null
  title: string | null
  content: string
  created_at: string
  updated_at: string
  lesson_title?: string
  course_title?: string
}

export const noteInputSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  content: z.string().max(200_000).default(""),
  lesson_id: z.uuid().nullable().optional(),
  course_id: z.uuid().nullable().optional(),
})
export type NoteInput = z.infer<typeof noteInputSchema>
export const noteUpdateSchema = z
  .object({ title: z.string().trim().max(200).nullable(), content: z.string().max(200_000) })
  .partial()
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>
