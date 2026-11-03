import { Injectable } from "@nestjs/common"
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm"
import { courses, examAttempts, examQuestions, exams, lessonProgress, lessons, modules, type ExamQuestionInsert } from "@levelusp/db"
import type { AnswerSheet } from "@levelusp/contracts"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { LessonForEligibility } from "./exams.domain"
import type { ExamSummaryRow, PublicExamQuestionRow } from "./exams.mapper"
import type { DbTransaction, DbExecutor, CourseRow, ExamRow, ExamAttemptRow, ExamQuestionRow } from "@levelusp/db"

/** Só o que o aluno pode ver de uma questão (sem gabarito nem explicação). */
const publicQuestionColumns = { id: examQuestions.id, prompt: examQuestions.prompt, options: examQuestions.options }
const questionOrder = [asc(examQuestions.sortOrder), asc(examQuestions.createdAt)]
/** Histórico suficiente para cooldown e melhor nota; ninguém faz centenas de tentativas. */
const MAX_LISTED_ATTEMPTS = 50

/** O mínimo do curso para checar visibilidade e titular o certificado. */
export type ExamCourseRow = Pick<CourseRow, "id" | "title" | "published" | "createdBy">

export interface AttemptOwner {
  examId: string
  userId: string
}

export interface NewAttempt extends AttemptOwner {
  questionIds: string[]
}

export interface StaleAttemptsFilter extends AttemptOwner {
  timeLimitMinutes: number
  /** Tentativas abertas iniciadas antes disso já não aceitam envio. */
  startedBefore: Date
}

export interface AttemptResult {
  answers: AnswerSheet
  score: number
  passed: boolean
  /** Ausente: agora. Expiradas usam o instante em que o prazo acabou. */
  submittedAt?: string
}

@Injectable()
export class ExamsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Serializa início de tentativa por aluno+prova (evita duas tentativas paralelas). */
  async lockAttempts({ examId, userId }: AttemptOwner, tx: DbTransaction): Promise<void> {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`exam:${examId}:${userId}`}, 0))`)
  }

  findCourse(id: string): Promise<ExamCourseRow | undefined> {
    return this.db.query.courses.findFirst({
      where: eq(courses.id, id),
      columns: { id: true, title: true, published: true, createdBy: true },
    })
  }

  findActiveExamByCourse(courseId: string): Promise<ExamRow | undefined> {
    return this.db.query.exams.findFirst({ where: and(eq(exams.courseId, courseId), eq(exams.active, true)) })
  }

  /** Lições publicadas do curso com o nome do módulo (texto legado e tabela de módulos). */
  listPublishedLessons(courseId: string): Promise<LessonForEligibility[]> {
    return this.db
      .select({ id: lessons.id, module: lessons.module, moduleTitle: modules.title })
      .from(lessons)
      .leftJoin(modules, eq(modules.id, lessons.moduleId))
      .where(and(eq(lessons.courseId, courseId), eq(lessons.published, true)))
  }

  async listCompletedLessonIds(userId: string, lessonIds: string[]): Promise<Set<string>> {
    if (!lessonIds.length) return new Set()
    const completed = await this.db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"), inArray(lessonProgress.lessonId, lessonIds)))
    return new Set(completed.map((progress) => progress.lessonId))
  }

  listAttempts({ examId, userId }: AttemptOwner, executor: DbExecutor = this.db): Promise<ExamAttemptRow[]> {
    return executor
      .select()
      .from(examAttempts)
      .where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, userId)))
      .orderBy(desc(examAttempts.startedAt))
      .limit(MAX_LISTED_ATTEMPTS)
  }

  findAttempt(id: string, { examId, userId }: AttemptOwner): Promise<ExamAttemptRow | undefined> {
    return this.db.query.examAttempts.findFirst({
      where: and(eq(examAttempts.id, id), eq(examAttempts.userId, userId), eq(examAttempts.examId, examId)),
    })
  }

  async countActiveQuestions(examId: string): Promise<number> {
    const [active] = await this.db
      .select({ total: count() })
      .from(examQuestions)
      .where(and(eq(examQuestions.examId, examId), eq(examQuestions.active, true)))
    return active?.total ?? 0
  }

  async listActiveQuestionIds(examId: string, executor: DbExecutor = this.db): Promise<string[]> {
    const active = await executor
      .select({ id: examQuestions.id })
      .from(examQuestions)
      .where(and(eq(examQuestions.examId, examId), eq(examQuestions.active, true)))
      .orderBy(...questionOrder)
    return active.map((question) => question.id)
  }

  /** Questões da tentativa, sem gabarito, na ordem sorteada. */
  async listPublicQuestions(examId: string, ids: string[], executor: DbExecutor = this.db): Promise<PublicExamQuestionRow[]> {
    if (!ids.length) return []
    const questions = await executor.select(publicQuestionColumns).from(examQuestions).where(and(eq(examQuestions.examId, examId), inArray(examQuestions.id, ids)))
    return orderByIds(questions, ids)
  }

  /** Questões da tentativa COM gabarito — uso exclusivo da correção no servidor. */
  async listQuestionsForGrading(examId: string, ids: string[]): Promise<Pick<ExamQuestionRow, "id" | "correctIndex" | "explanation">[]> {
    if (!ids.length) return []
    const questions = await this.db
      .select({ id: examQuestions.id, correctIndex: examQuestions.correctIndex, explanation: examQuestions.explanation })
      .from(examQuestions)
      .where(and(eq(examQuestions.examId, examId), inArray(examQuestions.id, ids)))
    return orderByIds(questions, ids)
  }

  async createAttempt(attempt: NewAttempt, executor: DbExecutor): Promise<ExamAttemptRow> {
    return requireRow(await executor.insert(examAttempts).values(attempt).returning(), "exam_attempts")
  }

  /**
   * Encerra (nota 0, reprovada) tentativas abertas cujo prazo de envio já
   * passou, com submitted_at = instante em que expiraram.
   */
  async closeStaleAttempts({ examId, userId, timeLimitMinutes, startedBefore }: StaleAttemptsFilter, executor: DbExecutor): Promise<void> {
    await executor
      .update(examAttempts)
      .set({ submittedAt: sql`${examAttempts.startedAt} + make_interval(mins => ${timeLimitMinutes})`, score: 0, passed: false, answers: {} })
      .where(
        and(
          eq(examAttempts.examId, examId),
          eq(examAttempts.userId, userId),
          isNull(examAttempts.submittedAt),
          lt(examAttempts.startedAt, startedBefore.toISOString()),
        ),
      )
  }

  /** Grava o resultado só se a tentativa ainda estiver aberta (idempotência). */
  async finalizeAttempt(id: string, result: AttemptResult): Promise<boolean> {
    const [finalized] = await this.db
      .update(examAttempts)
      .set({ answers: result.answers, score: result.score, passed: result.passed, submittedAt: result.submittedAt ?? sql`now()` })
      .where(and(eq(examAttempts.id, id), isNull(examAttempts.submittedAt)))
      .returning({ id: examAttempts.id })
    return Boolean(finalized)
  }

  /** Melhor tentativa aprovada do aluno na prova (null se não aprovado). */
  async findPassedAttempt({ examId, userId }: AttemptOwner): Promise<Pick<ExamAttemptRow, "id" | "score"> | null> {
    const [best] = await this.db
      .select({ id: examAttempts.id, score: examAttempts.score })
      .from(examAttempts)
      .where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, userId), eq(examAttempts.passed, true), isNotNull(examAttempts.submittedAt)))
      .orderBy(desc(examAttempts.score))
      .limit(1)
    return best ?? null
  }

  listExams(): Promise<ExamSummaryRow[]> {
    return this.db
      .select({ id: exams.id, courseId: exams.courseId, courseTitle: courses.title, title: exams.title })
      .from(exams)
      .innerJoin(courses, eq(courses.id, exams.courseId))
      .orderBy(asc(courses.title))
  }

  findExam(id: string): Promise<Pick<ExamRow, "id" | "title"> | undefined> {
    return this.db.query.exams.findFirst({ where: eq(exams.id, id), columns: { id: true, title: true } })
  }

  listQuestions(examId: string): Promise<ExamQuestionRow[]> {
    return this.db.select().from(examQuestions).where(eq(examQuestions.examId, examId)).orderBy(...questionOrder)
  }

  findQuestion(id: string): Promise<ExamQuestionRow | undefined> {
    return this.db.query.examQuestions.findFirst({ where: eq(examQuestions.id, id) })
  }

  async createQuestion(values: ExamQuestionInsert): Promise<ExamQuestionRow> {
    return requireRow(await this.db.insert(examQuestions).values(values).returning(), "exam_questions")
  }

  async updateQuestion(id: string, patch: Partial<ExamQuestionInsert>): Promise<ExamQuestionRow | undefined> {
    const [question] = await this.db.update(examQuestions).set(patch).where(eq(examQuestions.id, id)).returning()
    return question
  }
}

function orderByIds<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const rowById = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => {
    const row = rowById.get(id)
    return row ? [row] : []
  })
}
