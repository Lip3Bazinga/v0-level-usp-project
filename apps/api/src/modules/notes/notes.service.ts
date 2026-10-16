import { Injectable } from "@nestjs/common"
import type { Note, NoteInput, NoteUpdateInput } from "@levelusp/contracts"
import { BadRequest, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { NotesRepository, toNote } from "./notes.repository"

/** Conteúdo vinculável: publicado, ou rascunho do próprio autor (admin vê tudo). */
const visible = (user: AuthUser, row: { published: boolean; createdBy: string | null }) =>
  row.published || row.createdBy === user.id || user.role === "admin"

@Injectable()
export class NotesService {
  constructor(private readonly repo: NotesRepository) {}

  list(user: AuthUser): Promise<Note[]> {
    return this.repo.listByUser(user.id)
  }

  async create(user: AuthUser, input: NoteInput): Promise<Note> {
    const lesson = input.lesson_id ? await this.repo.findLesson(input.lesson_id) : undefined
    if (input.lesson_id && (!lesson || !visible(user, lesson))) throw NotFound("Lição")
    const course = input.course_id ? await this.repo.findCourse(input.course_id) : undefined
    if (input.course_id && (!course || !visible(user, course))) throw NotFound("Curso")
    const row = await this.repo.insert({
      userId: user.id,
      title: input.title ?? null,
      content: input.content,
      lessonId: input.lesson_id ?? null,
      courseId: input.course_id ?? null,
    })
    return toNote(row, { lessonTitle: lesson?.title, courseTitle: course?.title })
  }

  async update(user: AuthUser, id: string, input: NoteUpdateInput): Promise<Note> {
    if (input.title === undefined && input.content === undefined) throw BadRequest("Nada para atualizar.")
    const row = await this.repo.updateOwned(user.id, id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
    })
    // Nota de outro usuário responde 404 (não revela que existe).
    if (!row) throw NotFound("Nota")
    return toNote(row)
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    if (!(await this.repo.deleteOwned(user.id, id))) throw NotFound("Nota")
  }
}
