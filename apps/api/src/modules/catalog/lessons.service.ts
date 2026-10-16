import { Injectable } from "@nestjs/common"
import type { Lesson, LessonInput, LessonMetrics, LessonSummary, LessonUpdateInput, LessonWithTests } from "@levelusp/contracts"
import { Forbidden, NotFound, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { AuditService } from "../audit/audit.service"
import { canManage, canView, generateSlug, passRate, pickUniqueSlug, publishBlocker } from "./catalog.domain"
import { toLesson, toLessonSummary, toLessonWithTests } from "./catalog.mapper"
import { CoursesRepository } from "./courses.repository"
import { LessonsRepository } from "./lessons.repository"
import { ModulesRepository } from "./modules.repository"

type LessonInsert = Parameters<LessonsRepository["insert"]>[0]

/** Converte a entrada (snake_case) nas colunas do banco, só com os campos presentes. */
function lessonValues(input: LessonUpdateInput): Partial<LessonInsert> {
  const v: Partial<LessonInsert> = {}
  if (input.title !== undefined) v.title = input.title
  if (input.description !== undefined) v.description = input.description
  if (input.module !== undefined) v.module = input.module
  if (input.module_id !== undefined) v.moduleId = input.module_id
  if (input.course_id !== undefined) v.courseId = input.course_id
  if (input.order !== undefined) v.order = input.order
  if (input.difficulty !== undefined) v.difficulty = input.difficulty
  if (input.content_markdown !== undefined) v.contentMarkdown = input.content_markdown
  if (input.starter_code !== undefined) v.starterCode = input.starter_code
  if (input.starter_files !== undefined) v.starterFiles = input.starter_files
  if (input.checkpoints !== undefined) v.checkpoints = input.checkpoints
  if (input.libraries !== undefined) v.libraries = input.libraries
  if (input.lesson_type !== undefined) v.lessonType = input.lesson_type
  if (input.quiz_passing_score !== undefined) v.quizPassingScore = input.quiz_passing_score
  if (input.xp_reward !== undefined) v.xpReward = input.xp_reward
  if (input.time_limit !== undefined) v.timeLimit = input.time_limit
  if (input.test_cases !== undefined) v.testCases = input.test_cases
  return v
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null
  return e?.code === "23505" || e?.cause?.code === "23505"
}

@Injectable()
export class LessonsService {
  constructor(
    private readonly repo: LessonsRepository,
    private readonly courses: CoursesRepository,
    private readonly modules: ModulesRepository,
    private readonly audit: AuditService,
  ) {}

  async summaries(): Promise<LessonSummary[]> {
    return (await this.repo.publishedSummaries()).map(toLessonSummary)
  }

  async listPublished(): Promise<Lesson[]> {
    return (await this.repo.published()).map(toLesson)
  }

  /** Visão do aluno: nunca inclui o gabarito. */
  async get(user: AuthUser | undefined, id: string): Promise<Lesson> {
    const row = await this.repo.findPublic(id)
    if (!row || !canView(user, row.published, row.createdBy)) throw NotFound("Lição")
    return toLesson(row)
  }

  async authoring(user: AuthUser, id: string): Promise<LessonWithTests> {
    return toLessonWithTests(await this.manageable(user, id))
  }

  async teacherLessons(user: AuthUser): Promise<Lesson[]> {
    return (await this.repo.listByOwner(user.role === "admin" ? null : user.id)).map(toLesson)
  }

  async metrics(user: AuthUser): Promise<LessonMetrics[]> {
    const rows = await this.repo.metrics(user.role === "admin" ? null : user.id)
    return rows.map((r) => ({
      lesson_id: r.lessonId,
      started: r.started,
      completed: r.completed,
      submissions: r.submissions,
      pass_rate: passRate(r.passed, r.submissions),
    }))
  }

  /** Cria sempre como rascunho, com slug único derivado do título. */
  async create(user: AuthUser, input: LessonInput): Promise<LessonWithTests> {
    await this.assertRefs(user, input)
    const values = { ...lessonValues(input), title: input.title, createdBy: user.id, published: false }
    const base = generateSlug(input.title)
    const slug = pickUniqueSlug(base, await this.repo.slugsLike(base || "licao"))
    try {
      return toLessonWithTests(await this.repo.insert({ ...values, slug }))
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      // Corrida com outra criação de mesmo título: sufixo aleatório resolve.
      const fallback = `${slug}-${Math.random().toString(36).slice(2, 8)}`
      return toLessonWithTests(await this.repo.insert({ ...values, slug: fallback }))
    }
  }

  async update(user: AuthUser, id: string, input: LessonUpdateInput): Promise<LessonWithTests> {
    const current = await this.manageable(user, id)
    await this.assertRefs(user, input, current)
    const patch = lessonValues(input)
    // Lição publicada não pode ficar num estado que o aluno não consegue concluir.
    if (current.published) await this.assertPublishable(id, patch.lessonType ?? current.lessonType, patch.testCases ?? current.testCases)
    const row = Object.keys(patch).length ? await this.repo.update(id, patch) : current
    if (!row) throw NotFound("Lição")
    return toLessonWithTests(row)
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const lesson = await this.manageable(user, id)
    await this.repo.delete(id)
    if (lesson.createdBy !== user.id) {
      await this.audit.log(user, "lesson.delete", `lesson:${id}`, { title: lesson.title, owner: lesson.createdBy }, "warning")
    }
  }

  async publish(user: AuthUser, id: string, published: boolean): Promise<Lesson> {
    const lesson = await this.manageable(user, id)
    if (published) await this.assertPublishable(id, lesson.lessonType, lesson.testCases)
    const row = await this.repo.update(id, { published })
    if (!row) throw NotFound("Lição")
    return toLesson(row)
  }

  private async assertPublishable(id: string, lessonType: LessonWithTests["lesson_type"], testCases: unknown[]) {
    const quizQuestionCount = lessonType === "quiz" ? await this.repo.quizQuestionCount(id) : 0
    const blocker = publishBlocker({ lessonType, testCaseCount: testCases.length, quizQuestionCount })
    if (blocker) throw Unprocessable(blocker.message, blocker.code)
  }

  /** Módulo precisa existir; curso precisa ser do professor (ou admin). */
  private async assertRefs(user: AuthUser, input: LessonUpdateInput, current?: { moduleId: string | null; courseId: string | null }) {
    if (input.module_id && input.module_id !== current?.moduleId && !(await this.modules.findById(input.module_id))) {
      throw Unprocessable("Módulo não encontrado.", "INVALID_MODULE")
    }
    if (input.course_id && input.course_id !== current?.courseId) {
      const course = await this.courses.findById(input.course_id)
      if (!course || !canView(user, course.published, course.createdBy)) throw Unprocessable("Curso não encontrado.", "INVALID_COURSE")
      if (!canManage(user, course.createdBy)) throw Forbidden("Você só pode vincular lições aos seus próprios cursos.")
    }
  }

  /** Rascunho de outro = 404 (não revela existência); publicada de outro = 403. */
  private async manageable(user: AuthUser, id: string) {
    const lesson = await this.repo.findFull(id)
    if (!lesson || !canView(user, lesson.published, lesson.createdBy)) throw NotFound("Lição")
    if (!canManage(user, lesson.createdBy)) throw Forbidden("Só o autor da lição (ou um admin) pode alterá-la.")
    return lesson
  }
}
