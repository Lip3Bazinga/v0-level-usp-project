import { Injectable } from "@nestjs/common"
import { and, asc, count, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm"
import { courses, examAttempts, examQuestions, exams, lessonProgress, lessons, modules, notifications } from "@levelusp/db"
import { InjectDb, type Database, type DbOrTx } from "@/infra/database/database.module"

export type ExamRow = typeof exams.$inferSelect
export type AttemptRow = typeof examAttempts.$inferSelect
export type QuestionRow = typeof examQuestions.$inferSelect
type NotificationInsert = typeof notifications.$inferInsert

/** Só o que o aluno pode ver de uma questão (sem gabarito nem explicação). */
const publicQuestionColumns = { id: examQuestions.id, prompt: examQuestions.prompt, options: examQuestions.options }

@Injectable()
export class ExamsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  transaction<T>(fn: (tx: DbOrTx) => Promise<T>): Promise<T> {
    return this.db.transaction(fn)
  }

  /** Serializa início de tentativa por aluno+prova (evita duas tentativas paralelas). */
  async lockAttempts(tx: DbOrTx, userId: string, examId: string) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`exam:${examId}:${userId}`}, 0))`)
  }

  findCourse(id: string) {
    return this.db.query.courses.findFirst({
      where: eq(courses.id, id),
      columns: { id: true, title: true, published: true, createdBy: true },
    })
  }

  findActiveExamByCourse(courseId: string) {
    return this.db.query.exams.findFirst({ where: and(eq(exams.courseId, courseId), eq(exams.active, true)) })
  }

  /** Lições publicadas do curso com o nome do módulo (texto legado e tabela de módulos). */
  publishedLessons(courseId: string) {
    return this.db
      .select({ id: lessons.id, module: lessons.module, moduleTitle: modules.title })
      .from(lessons)
      .leftJoin(modules, eq(modules.id, lessons.moduleId))
      .where(and(eq(lessons.courseId, courseId), eq(lessons.published, true)))
  }

  async completedAmong(userId: string, lessonIds: string[]): Promise<Set<string>> {
    if (!lessonIds.length) return new Set()
    const rows = await this.db
      .select({ id: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"), inArray(lessonProgress.lessonId, lessonIds)))
    return new Set(rows.map((r) => r.id))
  }

  attempts(examId: string, userId: string, tx: DbOrTx = this.db) {
    return tx
      .select()
      .from(examAttempts)
      .where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, userId)))
      .orderBy(desc(examAttempts.startedAt))
      .limit(50)
  }

  findAttempt(id: string, userId: string, examId: string) {
    return this.db.query.examAttempts.findFirst({
      where: and(eq(examAttempts.id, id), eq(examAttempts.userId, userId), eq(examAttempts.examId, examId)),
    })
  }

  async activeQuestionCount(examId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(examQuestions)
      .where(and(eq(examQuestions.examId, examId), eq(examQuestions.active, true)))
    return row?.n ?? 0
  }

  async activeQuestionIds(examId: string, tx: DbOrTx = this.db): Promise<string[]> {
    const rows = await tx
      .select({ id: examQuestions.id })
      .from(examQuestions)
      .where(and(eq(examQuestions.examId, examId), eq(examQuestions.active, true)))
      .orderBy(asc(examQuestions.sortOrder), asc(examQuestions.createdAt))
    return rows.map((r) => r.id)
  }

  /** Questões da tentativa, sem gabarito, na ordem sorteada. */
  async publicQuestions(examId: string, ids: string[], tx: DbOrTx = this.db) {
    if (!ids.length) return []
    const rows = await tx.select(publicQuestionColumns).from(examQuestions).where(and(eq(examQuestions.examId, examId), inArray(examQuestions.id, ids)))
    return orderByIds(rows, ids)
  }

  /** Questões da tentativa COM gabarito — uso exclusivo da correção no servidor. */
  async questionsForGrading(examId: string, ids: string[]) {
    if (!ids.length) return []
    const rows = await this.db
      .select({ id: examQuestions.id, correctIndex: examQuestions.correctIndex, explanation: examQuestions.explanation })
      .from(examQuestions)
      .where(and(eq(examQuestions.examId, examId), inArray(examQuestions.id, ids)))
    return orderByIds(rows, ids)
  }

  async insertAttempt(tx: DbOrTx, examId: string, userId: string, questionIds: string[]) {
    const [row] = await tx.insert(examAttempts).values({ examId, userId, questionIds }).returning()
    return row!
  }

  /**
   * Encerra (nota 0, reprovada) tentativas abertas cujo prazo de envio já
   * passou, com submitted_at = instante em que expiraram.
   */
  closeStaleAttempts(tx: DbOrTx, examId: string, userId: string, timeLimitMinutes: number, cutoff: Date) {
    return tx
      .update(examAttempts)
      .set({ submittedAt: sql`${examAttempts.startedAt} + make_interval(mins => ${timeLimitMinutes})`, score: 0, passed: false, answers: {} })
      .where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, userId), isNull(examAttempts.submittedAt), lt(examAttempts.startedAt, cutoff.toISOString())))
  }

  /** Grava o resultado só se a tentativa ainda estiver aberta (idempotência). */
  async finalizeAttempt(id: string, data: { answers: Record<string, number>; score: number; passed: boolean; submittedAt?: string }) {
    const [row] = await this.db
      .update(examAttempts)
      .set({ answers: data.answers, score: data.score, passed: data.passed, submittedAt: data.submittedAt ?? sql`now()` })
      .where(and(eq(examAttempts.id, id), isNull(examAttempts.submittedAt)))
      .returning({ id: examAttempts.id })
    return Boolean(row)
  }

  /** Melhor tentativa aprovada do aluno na prova (null se não aprovado). */
  async passedAttempt(examId: string, userId: string) {
    const [row] = await this.db
      .select({ id: examAttempts.id, score: examAttempts.score })
      .from(examAttempts)
      .where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, userId), eq(examAttempts.passed, true), sql`${examAttempts.submittedAt} is not null`))
      .orderBy(desc(examAttempts.score))
      .limit(1)
    return row ?? null
  }

  async notify(n: NotificationInsert) {
    await this.db.insert(notifications).values(n)
  }

  // ── Administração ──────────────────────────────────────────────────────────

  listExams() {
    return this.db
      .select({ id: exams.id, course_id: exams.courseId, course_title: courses.title, title: exams.title })
      .from(exams)
      .innerJoin(courses, eq(courses.id, exams.courseId))
      .orderBy(asc(courses.title))
  }

  findExam(id: string) {
    return this.db.query.exams.findFirst({ where: eq(exams.id, id), columns: { id: true, title: true } })
  }

  questionsOfExam(examId: string) {
    return this.db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))
      .orderBy(asc(examQuestions.sortOrder), asc(examQuestions.createdAt))
  }

  findQuestion(id: string) {
    return this.db.query.examQuestions.findFirst({ where: eq(examQuestions.id, id) })
  }

  async insertQuestion(values: typeof examQuestions.$inferInsert) {
    const [row] = await this.db.insert(examQuestions).values(values).returning()
    return row!
  }

  async updateQuestion(id: string, patch: Partial<typeof examQuestions.$inferInsert>) {
    const [row] = await this.db.update(examQuestions).set(patch).where(eq(examQuestions.id, id)).returning()
    return row
  }
}

function orderByIds<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter((r): r is T => Boolean(r))
}
