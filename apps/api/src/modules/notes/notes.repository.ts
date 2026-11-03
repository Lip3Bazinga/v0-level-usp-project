import { Injectable } from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"
import { courses, lessons, notes, type NoteInsert } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { NoteRow, LessonRow, CourseRow } from "@levelusp/db"

const linkableColumns = { id: true, title: true, published: true, createdBy: true } as const

/** Nota com os títulos da lição e do curso vinculados (null quando não há vínculo). */
export interface NoteWithLinksRow {
  note: NoteRow
  lessonTitle: string | null
  courseTitle: string | null
}

/** Anotações dos alunos. Escritas filtram pelo dono: nota de outra pessoa se comporta como inexistente. */
@Injectable()
export class NotesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Notas do dono com título da lição/curso vinculados (mais recentes primeiro). */
  listByUser(userId: string): Promise<NoteWithLinksRow[]> {
    return this.db
      .select({ note: notes, lessonTitle: lessons.title, courseTitle: courses.title })
      .from(notes)
      .leftJoin(lessons, eq(lessons.id, notes.lessonId))
      .leftJoin(courses, eq(courses.id, notes.courseId))
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt))
  }

  /** Insere a nota. */
  async create(values: NoteInsert): Promise<NoteRow> {
    return requireRow(await this.db.insert(notes).values(values).returning(), "notes")
  }

  /** Atualiza a nota só se for de `userId`; `undefined` quando não existe ou é de outra pessoa. */
  async updateOwned(userId: string, id: string, patch: Partial<NoteInsert>): Promise<NoteRow | undefined> {
    const [note] = await this.db.update(notes).set(patch).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning()
    return note
  }

  /** Apaga a nota só se for de `userId`; devolve se havia o que apagar. */
  async deleteOwned(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning({ id: notes.id })
    return deleted.length > 0
  }

  /** Lição a vincular, com o mínimo para checar visibilidade. */
  findLesson(id: string): Promise<Pick<LessonRow, "id" | "title" | "published" | "createdBy"> | undefined> {
    return this.db.query.lessons.findFirst({ where: eq(lessons.id, id), columns: linkableColumns })
  }

  /** Curso a vincular, com o mínimo para checar visibilidade. */
  findCourse(id: string): Promise<Pick<CourseRow, "id" | "title" | "published" | "createdBy"> | undefined> {
    return this.db.query.courses.findFirst({ where: eq(courses.id, id), columns: linkableColumns })
  }
}
