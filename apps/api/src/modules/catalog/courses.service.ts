import { sanitizeRichContent } from "@/common/sanitize/rich-content"
import { Injectable } from "@nestjs/common"
import type { AttachLessonInput, Course, CourseInput, CourseUpdateInput, Lesson } from "@levelusp/contracts"
import { BadRequest, Forbidden, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { StorageService } from "@/infra/storage/storage.service"
import { AuditService } from "../audit/audit.service"
import { canManage, canView, checkReorder, nextOrder } from "./catalog.domain"
import { toCourse, toLesson } from "./catalog.mapper"
import { CoursesRepository } from "./courses.repository"

type CourseInsert = Parameters<CoursesRepository["insert"]>[0]
type WithExtras = NonNullable<Awaited<ReturnType<CoursesRepository["findWithExtras"]>>>

const withExtras = (r: WithExtras): Course =>
  toCourse(r.course, { lessonCount: r.lessonCount, ...(r.enrolled === null ? {} : { enrolled: r.enrolled }) })

/** Converte a entrada (snake_case) nas colunas do banco, só com os campos presentes. */
function courseValues(input: CourseUpdateInput): Partial<CourseInsert> {
  const v: Partial<CourseInsert> = {}
  if (input.title !== undefined) v.title = input.title
  if (input.description !== undefined) v.description = input.description
  if (input.long_description !== undefined) v.longDescription = sanitizeRichContent(input.long_description)
  if (input.cover_image_url !== undefined) v.coverImageUrl = input.cover_image_url
  if (input.level !== undefined) v.level = input.level
  if (input.tags !== undefined) v.tags = input.tags
  if (input.estimated_hours !== undefined) v.estimatedHours = input.estimated_hours
  if (input.final_project_title !== undefined) v.finalProjectTitle = input.final_project_title
  if (input.final_project_description !== undefined) v.finalProjectDescription = input.final_project_description
  if (input.final_project_starter_code !== undefined) v.finalProjectStarterCode = input.final_project_starter_code
  return v
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly repo: CoursesRepository,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async listPublished(user?: AuthUser): Promise<Course[]> {
    return (await this.repo.listPublished(user?.id)).map(withExtras)
  }

  async get(user: AuthUser | undefined, id: string): Promise<Course> {
    const row = await this.repo.findWithExtras(id, user?.id)
    if (!row || !canView(user, row.course.published, row.course.createdBy)) throw NotFound("Curso")
    return withExtras(row)
  }

  /** Aluno vê as lições publicadas; dono/admin vê todas (inclusive rascunhos). */
  async lessons(user: AuthUser | undefined, id: string): Promise<Lesson[]> {
    const course = await this.repo.findById(id)
    if (!course || !canView(user, course.published, course.createdBy)) throw NotFound("Curso")
    const rows = await this.repo.lessonsOf(id, !canManage(user, course.createdBy))
    return rows.map(toLesson)
  }

  async teacherCourses(user: AuthUser): Promise<Course[]> {
    return (await this.repo.listByOwner(user.role === "admin" ? null : user.id)).map(withExtras)
  }

  async create(user: AuthUser, input: CourseInput): Promise<Course> {
    await this.storage.assertUsableUrl(input.cover_image_url, user.id)
    const row = await this.repo.insert({ ...courseValues(input), title: input.title, createdBy: user.id, published: false })
    return toCourse(row, { lessonCount: 0 })
  }

  async update(user: AuthUser, id: string, input: CourseUpdateInput): Promise<Course> {
    const course = await this.manageable(user, id)
    if (input.cover_image_url !== undefined) await this.storage.assertUsableUrl(input.cover_image_url, user.id)
    const patch = courseValues(input)
    if (Object.keys(patch).length) await this.repo.update(id, patch)
    // Capa trocada ou removida: apaga a imagem antiga do disco.
    if (input.cover_image_url !== undefined && course.coverImageUrl && course.coverImageUrl !== input.cover_image_url) {
      await this.storage.remove(course.coverImageUrl, course.createdBy)
    }
    return this.get(user, id)
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const course = await this.manageable(user, id)
    await this.repo.delete(id)
    await this.storage.remove(course.coverImageUrl, course.createdBy)
    if (course.createdBy !== user.id) {
      await this.audit.log(user, "course.delete", `course:${id}`, { title: course.title, owner: course.createdBy }, "warning")
    }
  }

  async publish(user: AuthUser, id: string, published: boolean): Promise<Course> {
    await this.manageable(user, id)
    await this.repo.update(id, { published })
    return this.get(user, id)
  }

  async reorder(user: AuthUser, id: string, lessonIds: string[]): Promise<void> {
    await this.manageable(user, id)
    const current = new Set((await this.repo.lessonOrders(id)).map((l) => l.id))
    const check = checkReorder(lessonIds, current)
    if (!check.ok) {
      throw check.reason === "DUPLICATE"
        ? BadRequest("A lista de lições tem itens repetidos.", "DUPLICATE_LESSON")
        : BadRequest("Todas as lições precisam pertencer a este curso.", "LESSON_NOT_IN_COURSE")
    }
    await this.repo.reorder(id, lessonIds)
  }

  /** Vincula uma lição do professor ao curso (no fim, se `order` não vier). */
  async attachLesson(user: AuthUser, id: string, input: AttachLessonInput): Promise<void> {
    await this.manageable(user, id)
    const lesson = await this.repo.findLessonRef(input.lesson_id)
    if (!lesson || !canView(user, lesson.published, lesson.createdBy)) throw NotFound("Lição")
    if (!canManage(user, lesson.createdBy)) throw Forbidden("Você só pode adicionar suas próprias lições ao curso.")
    const order = input.order ?? nextOrder((await this.repo.lessonOrders(id)).filter((l) => l.id !== lesson.id).map((l) => l.order))
    await this.repo.setLessonCourse(lesson.id, id, order)
  }

  async detachLesson(user: AuthUser, id: string, lessonId: string): Promise<void> {
    await this.manageable(user, id)
    const lesson = await this.repo.findLessonRef(lessonId)
    if (!lesson || lesson.courseId !== id) throw NotFound("Lição")
    await this.repo.setLessonCourse(lessonId, null)
  }

  async enroll(user: AuthUser, id: string): Promise<void> {
    const course = await this.repo.findById(id)
    // Matrícula só em curso publicado; rascunho responde como inexistente.
    if (!course || !course.published) throw NotFound("Curso")
    await this.repo.enroll(user.id, id)
  }

  async unenroll(user: AuthUser, id: string): Promise<void> {
    await this.repo.unenroll(user.id, id)
  }

  myEnrollments(user: AuthUser): Promise<string[]> {
    return this.repo.enrolledCourseIds(user.id)
  }

  /** Rascunho de outro = 404 (não revela existência); publicado de outro = 403. */
  private async manageable(user: AuthUser, id: string) {
    const course = await this.repo.findById(id)
    if (!course || !canView(user, course.published, course.createdBy)) throw NotFound("Curso")
    if (!canManage(user, course.createdBy)) throw Forbidden("Só o autor do curso (ou um admin) pode alterá-lo.")
    return course
  }
}
