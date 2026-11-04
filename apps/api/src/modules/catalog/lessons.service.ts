import { Injectable } from "@nestjs/common"
import type { Lesson, LessonInput, LessonMetrics, LessonSummary, LessonType, LessonUpdateInput, LessonWithTests, TestCase } from "@levelusp/contracts"
import type { LessonInsert, LessonRow } from "@levelusp/db"
import { canManage, canViewContent, ownerScope } from "@/common/authorization/ownership"
import { isUniqueViolation } from "@/common/database/pg-errors"
import { Forbidden, NotFound, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { buildPatch, type PatchMapping } from "@/common/mapping/patch"
import { sanitizeRichContent } from "@/common/sanitize/rich-content"
import { AuditService } from "../audit/audit.service"
import { DEFAULT_SLUG, generateSlug, pickUniqueSlug, publishBlocker, withRandomSuffix } from "./catalog.domain"
import { toLesson, toLessonMetrics, toLessonSummary, toLessonWithTests } from "./catalog.mapper"
import { CoursesRepository } from "./courses.repository"
import { LessonsRepository } from "./lessons.repository"
import { ModulesRepository } from "./modules.repository"

/** Entrada (snake_case) → colunas, só com os campos presentes. */
const LESSON_PATCH: PatchMapping<LessonUpdateInput, LessonInsert> = {
  title: (title) => ({ title }),
  description: (description) => ({ description }),
  module: (module) => ({ module }),
  module_id: (moduleId) => ({ moduleId }),
  course_id: (courseId) => ({ courseId }),
  order: (order) => ({ order }),
  difficulty: (difficulty) => ({ difficulty }),
  content_markdown: (contentMarkdown) => ({ contentMarkdown: sanitizeRichContent(contentMarkdown) }),
  starter_code: (starterCode) => ({ starterCode }),
  starter_files: (starterFiles) => ({ starterFiles }),
  checkpoints: (checkpoints) => ({ checkpoints }),
  libraries: (libraries) => ({ libraries }),
  lesson_type: (lessonType) => ({ lessonType }),
  quiz_passing_score: (quizPassingScore) => ({ quizPassingScore }),
  xp_reward: (xpReward) => ({ xpReward }),
  time_limit: (timeLimit) => ({ timeLimit }),
  test_cases: (testCases) => ({ testCases }),
}

interface CurrentPlacement {
  moduleId: string | null
  courseId: string | null
}

/** Lições: catálogo público sem gabarito e autoria com gabarito (dono ou admin). */
@Injectable()
export class LessonsService {
  constructor(
    private readonly repo: LessonsRepository,
    private readonly courses: CoursesRepository,
    private readonly modules: ModulesRepository,
    private readonly audit: AuditService,
  ) {}

  /** Resumo das lições publicadas. */
  async listSummaries(): Promise<LessonSummary[]> {
    return (await this.repo.listPublishedSummaries()).map(toLessonSummary)
  }

  /** Lições publicadas, sem gabarito. */
  async listPublished(): Promise<Lesson[]> {
    return (await this.repo.listPublished()).map(toLesson)
  }

  /** Visão do aluno: nunca inclui o gabarito. */
  async get(user: AuthUser | undefined, id: string): Promise<Lesson> {
    const lesson = await this.repo.findPublic(id)
    if (!lesson || !canViewContent(user, lesson)) throw NotFound("Lição")
    return toLesson(lesson)
  }

  /**
   * Lição com o gabarito, para edição.
   *
   * @throws AppError 404 lição inexistente/invisível, 403 quem não é dono nem admin.
   */
  async getForAuthoring(user: AuthUser, id: string): Promise<LessonWithTests> {
    return toLessonWithTests(await this.findManageable(user, id))
  }

  /** Lições do professor (admin: todas), sem gabarito. */
  async listOwned(user: AuthUser): Promise<Lesson[]> {
    return (await this.repo.listByOwner(ownerScope(user))).map(toLesson)
  }

  /** Métricas das lições do professor (admin: todas). */
  async listMetrics(user: AuthUser): Promise<LessonMetrics[]> {
    return (await this.repo.listMetrics(ownerScope(user))).map(toLessonMetrics)
  }

  /** Cria sempre como rascunho, com slug único derivado do título. */
  async create(user: AuthUser, input: LessonInput): Promise<LessonWithTests> {
    await this.assertReferences(user, input)
    const values = { ...buildPatch(input, LESSON_PATCH), title: input.title, createdBy: user.id, published: false }
    const baseSlug = generateSlug(input.title)
    const slug = pickUniqueSlug(baseSlug, await this.repo.listSlugsLike(baseSlug || DEFAULT_SLUG))
    try {
      return toLessonWithTests(await this.repo.create({ ...values, slug }))
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      return toLessonWithTests(await this.repo.create({ ...values, slug: withRandomSuffix(slug) }))
    }
  }

  /**
   * Atualiza os campos enviados. Lição publicada não pode ficar sem gabarito (código) ou sem questões (quiz).
   *
   * @throws AppError 404/403 como em {@link getForAuthoring}; 422 `NO_TESTS`/`NO_QUESTIONS`,
   * `INVALID_MODULE`, `INVALID_COURSE`; 403 ao vincular a curso de outra pessoa.
   */
  async update(user: AuthUser, id: string, input: LessonUpdateInput): Promise<LessonWithTests> {
    const current = await this.findManageable(user, id)
    await this.assertReferences(user, input, current)
    const patch = buildPatch(input, LESSON_PATCH)
    // Lição publicada não pode ficar num estado que o aluno não consegue concluir.
    if (current.published) await this.assertPublishable(id, patch.lessonType ?? current.lessonType, patch.testCases ?? current.testCases)
    const lesson = Object.keys(patch).length ? await this.repo.update(id, patch) : current
    if (!lesson) throw NotFound("Lição")
    return toLessonWithTests(lesson)
  }

  /**
   * Apaga a lição; um admin apagando lição de outra pessoa fica na auditoria.
   *
   * @throws AppError 404/403 como em {@link getForAuthoring}.
   */
  async delete(user: AuthUser, id: string): Promise<void> {
    const lesson = await this.findManageable(user, id)
    await this.repo.delete(id)
    if (lesson.createdBy !== user.id) {
      await this.audit.log(user, "lesson.delete", `lesson:${id}`, { title: lesson.title, owner: lesson.createdBy }, "warning")
    }
  }

  /**
   * Publica ou despublica; só publica lição que o aluno consegue concluir.
   *
   * @throws AppError 404/403 como em {@link getForAuthoring}; 422 `NO_TESTS` ou `NO_QUESTIONS`.
   */
  async setPublished(user: AuthUser, id: string, published: boolean): Promise<Lesson> {
    const current = await this.findManageable(user, id)
    if (published) await this.assertPublishable(id, current.lessonType, current.testCases)
    const lesson = await this.repo.update(id, { published })
    if (!lesson) throw NotFound("Lição")
    return toLesson(lesson)
  }

  private async assertPublishable(id: string, lessonType: LessonType, testCases: readonly TestCase[]): Promise<void> {
    const quizQuestionCount = lessonType === "quiz" ? await this.repo.countQuizQuestions(id) : 0
    const blocker = publishBlocker({ lessonType, testCaseCount: testCases.length, quizQuestionCount })
    if (blocker) throw Unprocessable(blocker.message, blocker.code)
  }

  /** Módulo precisa existir; curso precisa ser do professor (ou admin). */
  private async assertReferences(user: AuthUser, input: LessonUpdateInput, current?: CurrentPlacement): Promise<void> {
    if (input.module_id && input.module_id !== current?.moduleId && !(await this.modules.findById(input.module_id))) {
      throw Unprocessable("Módulo não encontrado.", "INVALID_MODULE")
    }
    if (input.course_id && input.course_id !== current?.courseId) {
      const course = await this.courses.findById(input.course_id)
      if (!course || !canViewContent(user, course)) throw Unprocessable("Curso não encontrado.", "INVALID_COURSE")
      if (!canManage(user, course.createdBy)) throw Forbidden("Você só pode vincular lições aos seus próprios cursos.")
    }
  }

  /** Rascunho de outro = 404 (não revela existência); publicada de outro = 403. */
  private async findManageable(user: AuthUser, id: string): Promise<LessonRow> {
    const lesson = await this.repo.findFull(id)
    if (!lesson || !canViewContent(user, lesson)) throw NotFound("Lição")
    if (!canManage(user, lesson.createdBy)) throw Forbidden("Só o autor da lição (ou um admin) pode alterá-la.")
    return lesson
  }
}
