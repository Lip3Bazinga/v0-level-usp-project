import type { Note } from "@levelusp/contracts"
import type { NoteRow } from "@levelusp/db"

/** Títulos dos conteúdos vinculados à nota; ausentes ou null não aparecem na resposta. */
export interface NoteLinks {
  lessonTitle?: string | null
  courseTitle?: string | null
}

/** Nota no formato do contrato, com os títulos vinculados quando houver. */
export function toNote(note: NoteRow, links: NoteLinks = {}): Note {
  return {
    id: note.id,
    user_id: note.userId,
    lesson_id: note.lessonId,
    course_id: note.courseId,
    title: note.title,
    content: note.content,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    ...(links.lessonTitle != null ? { lesson_title: links.lessonTitle } : {}),
    ...(links.courseTitle != null ? { course_title: links.courseTitle } : {}),
  }
}
