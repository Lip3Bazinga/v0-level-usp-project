import { Injectable } from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"
import { courses, lessons, notes } from "@levelusp/db"
import type { Note } from "@levelusp/contracts"
import { InjectDb, type Database } from "@/infra/database/database.module"

type NoteRow = typeof notes.$inferSelect

export function toNote(r: NoteRow, extra: { lessonTitle?: string | null; courseTitle?: string | null } = {}): Note {
  return {
    id: r.id,
    user_id: r.userId,
    lesson_id: r.lessonId,
    course_id: r.courseId,
    title: r.title,
    content: r.content,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    ...(extra.lessonTitle != null ? { lesson_title: extra.lessonTitle } : {}),
    ...(extra.courseTitle != null ? { course_title: extra.courseTitle } : {}),
  }
}

@Injectable()
export class NotesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Notas do dono com título da lição/curso vinculados (mais recentes primeiro). */
  async listByUser(userId: string): Promise<Note[]> {
    const rows = await this.db
      .select({ note: notes, lessonTitle: lessons.title, courseTitle: courses.title })
      .from(notes)
      .leftJoin(lessons, eq(lessons.id, notes.lessonId))
      .leftJoin(courses, eq(courses.id, notes.courseId))
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt))
    return rows.map((r) => toNote(r.note, r))
  }

  findOwned(userId: string, id: string) {
    return this.db.query.notes.findFirst({ where: and(eq(notes.id, id), eq(notes.userId, userId)) })
  }

  async insert(values: typeof notes.$inferInsert) {
    const [row] = await this.db.insert(notes).values(values).returning()
    return row!
  }

  async updateOwned(userId: string, id: string, patch: Partial<typeof notes.$inferInsert>) {
    const [row] = await this.db.update(notes).set(patch).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning()
    return row
  }

  async deleteOwned(userId: string, id: string): Promise<boolean> {
    const rows = await this.db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning({ id: notes.id })
    return rows.length > 0
  }

  findLesson(id: string) {
    return this.db.query.lessons.findFirst({ where: eq(lessons.id, id), columns: { id: true, title: true, published: true, createdBy: true } })
  }

  findCourse(id: string) {
    return this.db.query.courses.findFirst({ where: eq(courses.id, id), columns: { id: true, title: true, published: true, createdBy: true } })
  }
}
