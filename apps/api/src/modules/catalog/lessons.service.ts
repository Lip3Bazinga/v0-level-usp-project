import { Injectable } from "@nestjs/common"
import type { Lesson, LessonInput, LessonMetrics, LessonRuntime, LessonStepsInput, LessonSummary, LessonType, LessonUpdateInput, LessonWithTests, TestCase } from "@levelusp/contracts"
import type { DbTransaction, LessonInsert, LessonRow } from "@levelusp/db"
import { canManage, canViewContent, ownerScope } from "@/common/authorization/ownership"
import { isUniqueViolation } from "@/common/database/pg-errors"
import { Forbidden, NotFound, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { buildPatch, type PatchMapping } from "@/common/mapping/patch"
import { sanitizeRichContent } from "@/common/sanitize/rich-content"
import { TransactionRunner } from "@/infra/database/database.module"
import { AuditService } from "../audit/audit.service"
import { DEFAULT_SLUG, generateSlug, pickUniqueSlug, publishBlocker, withRandomSuffix } from "./catalog.domain"
import { toLesson, toLessonMetrics, toLessonSummary, toLessonWithSteps, toLessonWithTests } from "./catalog.mapper"
import { CoursesRepository } from "./courses.repository"
import { toLessonStep, toLessonStepInput, toLessonStepInsert } from "./lesson-steps.mapper"
import { LessonStepsRepository } from "./lesson-steps.repository"
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
  runtime: (runtime) => ({ runtime }),
  is_project: (isProject) => ({ isProject }),
  objectives: (objectives) => ({ objectives }),
  solution_files: (solutionFiles) => ({ solutionFiles }),
  solution_after_attempts: (solutionAfterAttempts) => ({ solutionAfterAttempts }),
  // Passos moram em `lesson_steps`, não em colunas da lição: `replaceSteps` grava na mesma transação.
  steps: () => ({}),
}

/** O estado da lição que decide se ela pode ficar publicada (já com o que o PATCH vai gravar). */
interface PublishableLesson {
  lessonType: LessonType
  testCases: readonly TestCase[]
  runtime: LessonRuntime
  libraries: readonly string[]
  /** Tamanho da lista de passos que este PATCH vai gravar (ausente = usa o banco). */
  incomingStepCount?: number | undefined
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
    private readonly steps: LessonStepsRepository,
    private readonly transactions: TransactionRunner,
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

  /**
   * Visão do aluno: a lição com os passos públicos (sem solução, casos, dicas nem `correct_index`).
   *
   * @throws AppError 404 lição inexistente ou rascunho de outra pessoa.
   */
  async get(user: AuthUser | undefined, id: string): Promise<Lesson> {
    const lesson = await this.repo.findPublic(id)
    if (!lesson || !canViewContent(user, lesson)) throw NotFound("Lição")
    return toLessonWithSteps(lesson, (await this.steps.listByLesson(id)).map(toLessonStep))
  }

  /**
   * Lição com o gabarito, para edição.
   *
   * @throws AppError 404 lição inexistente/invisível, 403 quem não é dono nem admin.
   */
  async getForAuthoring(user: AuthUser, id: string): Promise<LessonWithTests> {
    return this.toAuthoring(await this.findManageable(user, id))
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
      return await this.toAuthoring(await this.createWithSteps({ ...values, slug }, input.steps))
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      return this.toAuthoring(await this.createWithSteps({ ...values, slug: withRandomSuffix(slug) }, input.steps))
    }
  }

  /**
   * Atualiza os campos enviados; `steps`, quando vem, substitui todos os passos. Lição publicada
   * não pode ficar sem gabarito (código), sem questões (quiz) ou sem passos (guiada).
   *
   * @throws AppError 404/403 como em {@link getForAuthoring}; 422 `NO_TESTS`/`NO_QUESTIONS`/`NO_STEPS`/`LIBRARY_PENDING`/`LIBRARY_RUNTIME`,
   * `INVALID_MODULE`, `INVALID_COURSE`; 403 ao vincular a curso de outra pessoa.
   */
  async update(user: AuthUser, id: string, input: LessonUpdateInput): Promise<LessonWithTests> {
    const current = await this.findManageable(user, id)
    await this.assertReferences(user, input, current)
    const patch = buildPatch(input, LESSON_PATCH)
    // Lição publicada não pode ficar num estado que o aluno não consegue concluir.
    if (current.published) {
      // Biblioteca só é reavaliada se o PATCH mexe em `libraries` ou `runtime`: lição publicada antes do manifesto
      // continua editável (título, texto…); com a lista vazia o bloqueio de biblioteca não se aplica.
      const touchesLibraries = patch.libraries !== undefined || patch.runtime !== undefined
      await this.assertPublishable(id, {
        lessonType: patch.lessonType ?? current.lessonType,
        testCases: patch.testCases ?? current.testCases,
        runtime: patch.runtime ?? current.runtime,
        libraries: touchesLibraries ? (patch.libraries ?? current.libraries) : [],
        incomingStepCount: input.steps?.length,
      })
    }
    const lesson = await this.transactions.run(async (tx: DbTransaction) => {
      const updated = Object.keys(patch).length ? await this.repo.update(id, patch, tx) : current
      if (updated && input.steps) await this.steps.replaceAll(id, input.steps.map((step) => toLessonStepInsert(step, id)), tx)
      return updated
    })
    if (!lesson) throw NotFound("Lição")
    return this.toAuthoring(lesson)
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
   * @throws AppError 404/403 como em {@link getForAuthoring}; 422 `NO_TESTS`, `NO_QUESTIONS`, `NO_STEPS`, `LIBRARY_PENDING` (biblioteca fora do manifesto) ou `LIBRARY_RUNTIME`.
   */
  async setPublished(user: AuthUser, id: string, published: boolean): Promise<Lesson> {
    const current = await this.findManageable(user, id)
    if (published) {
      await this.assertPublishable(id, { lessonType: current.lessonType, testCases: current.testCases, runtime: current.runtime, libraries: current.libraries })
    }
    const lesson = await this.repo.update(id, { published })
    if (!lesson) throw NotFound("Lição")
    return toLessonWithSteps(lesson, (await this.steps.listByLesson(id)).map(toLessonStep))
  }

  private async assertPublishable(id: string, lesson: PublishableLesson): Promise<void> {
    const { lessonType, testCases, runtime, libraries, incomingStepCount } = lesson
    const quizQuestionCount = lessonType === "quiz" ? await this.repo.countQuizQuestions(id) : 0
    const stepCount = lessonType === "guided" ? (incomingStepCount ?? (await this.steps.countByLesson(id))) : 0
    const blocker = publishBlocker({ lessonType, testCaseCount: testCases.length, quizQuestionCount, stepCount, runtime, libraries })
    if (blocker) throw Unprocessable(blocker.message, blocker.code)
  }

  /** Insere a lição e os passos na mesma transação (slug repetido desfaz tudo). */
  private createWithSteps(values: LessonInsert, steps: LessonStepsInput | undefined): Promise<LessonRow> {
    return this.transactions.run(async (tx: DbTransaction) => {
      const lesson = await this.repo.create(values, tx)
      if (steps?.length) await this.steps.replaceAll(lesson.id, steps.map((step) => toLessonStepInsert(step, lesson.id)), tx)
      return lesson
    })
  }

  /** Lição de autoria: passos públicos (prévia) e os mesmos passos com gabarito (edição). */
  private async toAuthoring(lesson: LessonRow): Promise<LessonWithTests> {
    const steps = await this.steps.listByLesson(lesson.id)
    return toLessonWithTests(lesson, steps.map(toLessonStep), steps.map(toLessonStepInput))
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
