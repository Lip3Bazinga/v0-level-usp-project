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

/** Cursos: catálogo público, autoria (dono ou admin) e matrículas. */
@Injectable()
export class CoursesService {
  constructor(
    private readonly repo: CoursesRepository,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Cursos publicados; com sessão, cada um diz se o usuário está matriculado. */
  async listPublished(user?: AuthUser): Promise<Course[]> {
    return (await this.repo.listPublished(user?.id)).map(toCourseWithAggregates)
  }

  /**
   * Curso visível ao usuário (rascunho só para o dono e admins).
   *
   * @throws AppError 404 quando não existe ou não é visível.
   */
  async get(user: AuthUser | undefined, id: string): Promise<Course> {
    const found = await this.repo.findWithAggregates(id, user?.id)
    if (!found || !canViewContent(user, found.course)) throw NotFound("Curso")
    return toCourseWithAggregates(found)
  }

  /** Aluno vê as lições publicadas; dono/admin vê todas (inclusive rascunhos). */
  async listLessons(user: AuthUser | undefined, id: string): Promise<Lesson[]> {
    const course = await this.repo.findById(id)
    if (!course || !canViewContent(user, course)) throw NotFound("Curso")
    return (await this.repo.listLessons(id, !canManage(user, course.createdBy))).map(toLesson)
  }

  /** Cursos do professor (admin: todos), inclusive rascunhos. */
  async listOwned(user: AuthUser): Promise<Course[]> {
    return (await this.repo.listByOwner(ownerScope(user))).map(toCourseWithAggregates)
  }

  /**
   * Cria o curso como rascunho, com o usuário como dono.
   *
   * @throws AppError 400 `INVALID_IMAGE_URL`, 403 quando a capa é uma imagem enviada por outra pessoa.
   */
  async create(user: AuthUser, input: CourseInput): Promise<Course> {
    await this.storage.assertUsableUrl(input.cover_image_url, user.id)
    const course = await this.repo.create({ ...buildPatch(input, COURSE_PATCH), title: input.title, createdBy: user.id, published: false })
    return toCourse(course, { lessonCount: 0 })
  }

  /**
   * Atualiza os campos enviados; trocar ou remover a capa apaga a imagem antiga do disco.
   *
   * @throws AppError 404 curso inexistente/invisível, 403 quem não é dono nem admin ou capa alheia.
   */
  async update(user: AuthUser, id: string, input: CourseUpdateInput): Promise<Course> {
    const course = await this.findManageable(user, id)
    const isChangingCover = input.cover_image_url !== undefined
    if (isChangingCover) await this.storage.assertUsableUrl(input.cover_image_url, user.id)
    const patch = buildPatch(input, COURSE_PATCH)
    if (Object.keys(patch).length) await this.repo.update(id, patch)
    // Capa trocada ou removida: apaga a imagem antiga do disco.
    if (isChangingCover && course.coverImageUrl && course.coverImageUrl !== input.cover_image_url) {
      await this.storage.delete(course.coverImageUrl, course.createdBy)
    }
    return this.get(user, id)
  }

  /**
   * Apaga o curso e a capa; um admin apagando curso de outra pessoa fica na auditoria.
   *
   * @throws AppError 404 curso inexistente/invisível, 403 quem não é dono nem admin.
   */
  async delete(user: AuthUser, id: string): Promise<void> {
    const course = await this.findManageable(user, id)
    await this.repo.delete(id)
    await this.storage.delete(course.coverImageUrl, course.createdBy)
    if (course.createdBy !== user.id) {
      await this.audit.log(user, "course.delete", `course:${id}`, { title: course.title, owner: course.createdBy }, "warning")
    }
  }

  /**
   * Publica ou despublica o curso.
   *
   * @throws AppError 404 curso inexistente/invisível, 403 quem não é dono nem admin.
   */
  async setPublished(user: AuthUser, id: string, published: boolean): Promise<Course> {
    await this.findManageable(user, id)
    await this.repo.update(id, { published })
    return this.get(user, id)
  }

  /**
   * Grava a nova ordem 1..n das lições do curso, numa transação.
   *
   * @throws AppError 400 `DUPLICATE_LESSON` ou `LESSON_NOT_IN_COURSE`; 404/403 como em {@link update}.
   */
  async reorder(user: AuthUser, id: string, lessonIds: string[]): Promise<void> {
    await this.findManageable(user, id)
    const courseLessonIds = new Set((await this.repo.listLessonOrders(id)).map((lesson) => lesson.id))
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

  /**
   * Tira a lição do curso (ela continua existindo, avulsa).
   *
   * @throws AppError 404 quando a lição não está neste curso; 404/403 do curso como em {@link update}.
   */
  async detachLesson(user: AuthUser, id: string, lessonId: string): Promise<void> {
    await this.findManageable(user, id)
    const lesson = await this.repo.findLessonRef(lessonId)
    if (!lesson || lesson.courseId !== id) throw NotFound("Lição")
    await this.repo.placeLesson(lessonId, { courseId: null })
  }

  /**
   * Matricula o usuário (idempotente).
   *
   * @throws AppError 404 quando o curso não existe ou é rascunho.
   */
  async enroll(user: AuthUser, id: string): Promise<void> {
    const course = await this.repo.findById(id)
    // Matrícula só em curso publicado; rascunho responde como inexistente.
    if (!course || !course.published) throw NotFound("Curso")
    await this.repo.enroll(user.id, id)
  }

  /** Cancela a matrícula (idempotente; o progresso nas lições é mantido). */
  async unenroll(user: AuthUser, id: string): Promise<void> {
    await this.repo.unenroll(user.id, id)
  }

  /** Ids dos cursos em que o usuário está matriculado. */
  listMyEnrollments(user: AuthUser): Promise<string[]> {
    return this.repo.listEnrolledCourseIds(user.id)
  }

  /** Posição depois da última lição do curso, ignorando a própria lição se já estiver nele. */
  private async endOfCourse(courseId: string, lessonId: string): Promise<number> {
    const orders = (await this.repo.listLessonOrders(courseId)).filter((lesson) => lesson.id !== lessonId).map((lesson) => lesson.order)
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
