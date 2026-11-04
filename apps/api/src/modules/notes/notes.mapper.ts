import type { Note } from "@levelusp/contracts"
import type { NoteRow } from "@levelusp/db"

export interface NoteLinks {
  lessonTitle?: string | null
  courseTitle?: string | null
}

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
