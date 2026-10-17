import { Injectable } from "@nestjs/common"
import type { Note, NoteInput, NoteUpdateInput } from "@levelusp/contracts"
import type { NoteInsert } from "@levelusp/db"
import { canViewContent } from "@/common/authorization/ownership"
import { BadRequest, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { buildPatch, type PatchMapping } from "@/common/mapping/patch"
import { toNote } from "./notes.mapper"
import { NotesRepository } from "./notes.repository"

const NOTE_PATCH: PatchMapping<NoteUpdateInput, NoteInsert> = {
  title: (title) => ({ title }),
  content: (content) => ({ content }),
}

@Injectable()
export class NotesService {
  constructor(private readonly repo: NotesRepository) {}

  async list(user: AuthUser): Promise<Note[]> {
    return (await this.repo.listByUser(user.id)).map(({ note, lessonTitle, courseTitle }) => toNote(note, { lessonTitle, courseTitle }))
  }

  /** Só vincula conteúdo visível ao usuário: publicado, ou rascunho do próprio autor (admin vê tudo). */
  async create(user: AuthUser, input: NoteInput): Promise<Note> {
    const lesson = input.lesson_id ? await this.repo.findLesson(input.lesson_id) : undefined
    if (input.lesson_id && (!lesson || !canViewContent(user, lesson))) throw NotFound("Lição")
    const course = input.course_id ? await this.repo.findCourse(input.course_id) : undefined
    if (input.course_id && (!course || !canViewContent(user, course))) throw NotFound("Curso")
    const note = await this.repo.insert({
      userId: user.id,
      title: input.title ?? null,
      content: input.content,
      lessonId: input.lesson_id ?? null,
      courseId: input.course_id ?? null,
    })
    return toNote(note, { lessonTitle: lesson?.title, courseTitle: course?.title })
  }

  async update(user: AuthUser, id: string, input: NoteUpdateInput): Promise<Note> {
    if (input.title === undefined && input.content === undefined) throw BadRequest("Nada para atualizar.")
    const note = await this.repo.updateOwned(user.id, id, buildPatch(input, NOTE_PATCH))
    // Nota de outro usuário responde 404 (não revela que existe).
    if (!note) throw NotFound("Nota")
    return toNote(note)
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    if (!(await this.repo.deleteOwned(user.id, id))) throw NotFound("Nota")
  }
}
