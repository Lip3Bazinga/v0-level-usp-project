import { Injectable } from "@nestjs/common"
import type { AttachLessonInput, Course, CourseInput, CourseUpdateInput, Lesson } from "@levelusp/contracts"
import type { CourseInsert, CourseRow } from "@levelusp/db"
import { canManage, canViewContent, ownerScope } from "@/common/authorization/ownership"
import { BadRequest, Forbidden, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { buildPatch, type PatchMapping } from "@/common/mapping/patch"
import { sanitizeRichContent } from "@/common/sanitize/rich-content"
import { StorageService } from "@/infra/storage/storage.service"
import { AuditService } from "../audit/audit.service"
import { checkReorder, nextOrder } from "./catalog.domain"
import { toCourse, toCourseWithAggregates, toLesson } from "./catalog.mapper"
import { CoursesRepository } from "./courses.repository"

/** Entrada (snake_case) → colunas, só com os campos presentes. */
const COURSE_PATCH: PatchMapping<CourseUpdateInput, CourseInsert> = {
  title: (title) => ({ title }),
  description: (description) => ({ description }),
  long_description: (longDescription) => ({ longDescription: sanitizeRichContent(longDescription) }),
  cover_image_url: (coverImageUrl) => ({ coverImageUrl }),
  level: (level) => ({ level }),
  tags: (tags) => ({ tags }),
  estimated_hours: (estimatedHours) => ({ estimatedHours }),
  final_project_title: (finalProjectTitle) => ({ finalProjectTitle }),
  final_project_description: (finalProjectDescription) => ({ finalProjectDescription }),
  final_project_starter_code: (finalProjectStarterCode) => ({ finalProjectStarterCode }),
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly repo: CoursesRepository,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async listPublished(user?: AuthUser): Promise<Course[]> {
    return (await this.repo.listPublished(user?.id)).map(toCourseWithAggregates)
  }

  async get(user: AuthUser | undefined, id: string): Promise<Course> {
    const found = await this.repo.findWithAggregates(id, user?.id)
    if (!found || !canViewContent(user, found.course)) throw NotFound("Curso")
    return toCourseWithAggregates(found)
  }

  /** Aluno vê as lições publicadas; dono/admin vê todas (inclusive rascunhos). */
  async lessons(user: AuthUser | undefined, id: string): Promise<Lesson[]> {
    const course = await this.repo.findById(id)
    if (!course || !canViewContent(user, course)) throw NotFound("Curso")
    return (await this.repo.lessonsOf(id, !canManage(user, course.createdBy))).map(toLesson)
  }

  async teacherCourses(user: AuthUser): Promise<Course[]> {
    return (await this.repo.listByOwner(ownerScope(user))).map(toCourseWithAggregates)
  }

  async create(user: AuthUser, input: CourseInput): Promise<Course> {
    await this.storage.assertUsableUrl(input.cover_image_url, user.id)
    const course = await this.repo.insert({ ...buildPatch(input, COURSE_PATCH), title: input.title, createdBy: user.id, published: false })
    return toCourse(course, { lessonCount: 0 })
  }

  async update(user: AuthUser, id: string, input: CourseUpdateInput): Promise<Course> {
    const course = await this.findManageable(user, id)
    const isChangingCover = input.cover_image_url !== undefined
    if (isChangingCover) await this.storage.assertUsableUrl(input.cover_image_url, user.id)
    const patch = buildPatch(input, COURSE_PATCH)
    if (Object.keys(patch).length) await this.repo.update(id, patch)
    // Capa trocada ou removida: apaga a imagem antiga do disco.
    if (isChangingCover && course.coverImageUrl && course.coverImageUrl !== input.cover_image_url) {
      await this.storage.remove(course.coverImageUrl, course.createdBy)
    }
    return this.get(user, id)
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const course = await this.findManageable(user, id)
    await this.repo.delete(id)
    await this.storage.remove(course.coverImageUrl, course.createdBy)
    if (course.createdBy !== user.id) {
      await this.audit.log(user, "course.delete", `course:${id}`, { title: course.title, owner: course.createdBy }, "warning")
    }
  }

  async publish(user: AuthUser, id: string, published: boolean): Promise<Course> {
    await this.findManageable(user, id)
    await this.repo.update(id, { published })
    return this.get(user, id)
  }

  async reorder(user: AuthUser, id: string, lessonIds: string[]): Promise<void> {
    await this.findManageable(user, id)
    const courseLessonIds = new Set((await this.repo.lessonOrders(id)).map((lesson) => lesson.id))
    const reorderCheck = checkReorder(lessonIds, courseLessonIds)
    if (!reorderCheck.ok) {
      throw reorderCheck.reason === "DUPLICATE"
        ? BadRequest("A lista de lições tem itens repetidos.", "DUPLICATE_LESSON")
        : BadRequest("Todas as lições precisam pertencer a este curso.", "LESSON_NOT_IN_COURSE")
    }
    await this.repo.reorder(id, lessonIds)
  }

  /** Vincula uma lição do professor ao curso (no fim, se `order` não vier). */
  async attachLesson(user: AuthUser, id: string, input: AttachLessonInput): Promise<void> {
    await this.findManageable(user, id)
    const lesson = await this.repo.findLessonRef(input.lesson_id)
    if (!lesson || !canViewContent(user, lesson)) throw NotFound("Lição")
    if (!canManage(user, lesson.createdBy)) throw Forbidden("Você só pode adicionar suas próprias lições ao curso.")
    const order = input.order ?? (await this.endOfCourse(id, lesson.id))
    await this.repo.placeLesson(lesson.id, { courseId: id, order })
  }

  async detachLesson(user: AuthUser, id: string, lessonId: string): Promise<void> {
    await this.findManageable(user, id)
    const lesson = await this.repo.findLessonRef(lessonId)
    if (!lesson || lesson.courseId !== id) throw NotFound("Lição")
    await this.repo.placeLesson(lessonId, { courseId: null })
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

  /** Posição depois da última lição do curso, ignorando a própria lição se já estiver nele. */
  private async endOfCourse(courseId: string, lessonId: string): Promise<number> {
    const orders = (await this.repo.lessonOrders(courseId)).filter((lesson) => lesson.id !== lessonId).map((lesson) => lesson.order)
    return nextOrder(orders)
  }

  /** Rascunho de outro = 404 (não revela existência); publicado de outro = 403. */
  private async findManageable(user: AuthUser, id: string): Promise<CourseRow> {
    const course = await this.repo.findById(id)
    if (!course || !canViewContent(user, course)) throw NotFound("Curso")
    if (!canManage(user, course.createdBy)) throw Forbidden("Só o autor do curso (ou um admin) pode alterá-lo.")
    return course
  }
}
