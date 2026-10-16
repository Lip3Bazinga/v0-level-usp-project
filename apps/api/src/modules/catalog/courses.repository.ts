import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm"
import { courses, enrollments, lessons } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"
import { publicLessonColumns } from "./lessons.repository"

type CourseInsert = typeof courses.$inferInsert

/**
 * Referência qualificada à coluna externa nas subconsultas correlacionadas
 * (numa consulta de tabela única o Drizzle omite o nome da tabela em
 * `${courses.id}`, e o "id" seria resolvido na tabela interna).
 */
const courseId = sql.raw(`"courses"."id"`)
/** Lições publicadas do curso (o número que o aluno vê no card). */
const publishedLessonCount = sql<number>`(select count(*)::int from lessons l where l.course_id = ${courseId} and l.published = true)`
const enrolledBy = (userId: string) =>
  sql<boolean>`exists(select 1 from enrollments e where e.course_id = ${courseId} and e.user_id = ${userId})`

@Injectable()
export class CoursesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Cursos com contagem de lições e, se houver usuário, a matrícula dele. */
  private selectWithExtras(userId: string | undefined, where: SQL | undefined) {
    return this.db
      .select({ course: courses, lessonCount: publishedLessonCount, enrolled: userId ? enrolledBy(userId) : sql<null>`null` })
      .from(courses)
      .where(where)
  }

  listPublished(userId?: string) {
    return this.selectWithExtras(userId, eq(courses.published, true)).orderBy(asc(courses.title))
  }

  /** `ownerId` null = todos (admin). */
  listByOwner(ownerId: string | null) {
    return this.selectWithExtras(undefined, ownerId ? eq(courses.createdBy, ownerId) : undefined).orderBy(desc(courses.createdAt))
  }

  async findWithExtras(id: string, userId?: string) {
    const [row] = await this.selectWithExtras(userId, eq(courses.id, id)).limit(1)
    return row
  }

  findById(id: string) {
    return this.db.query.courses.findFirst({ where: eq(courses.id, id) })
  }

  async insert(values: CourseInsert) {
    const [row] = await this.db.insert(courses).values(values).returning()
    return row!
  }

  async update(id: string, patch: Partial<CourseInsert>) {
    await this.db.update(courses).set(patch).where(eq(courses.id, id))
  }

  async delete(id: string) {
    await this.db.delete(courses).where(eq(courses.id, id))
  }

  /** Lições do curso sem gabarito, na ordem do curso. */
  lessonsOf(courseId: string, onlyPublished: boolean) {
    return this.db
      .select(publicLessonColumns)
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), onlyPublished ? eq(lessons.published, true) : undefined))
      .orderBy(asc(lessons.order), asc(lessons.createdAt))
  }

  lessonOrders(courseId: string) {
    return this.db.select({ id: lessons.id, order: lessons.order }).from(lessons).where(eq(lessons.courseId, courseId))
  }

  /** Dados mínimos de uma lição para checar dono ao anexar/desanexar. */
  findLessonRef(lessonId: string) {
    return this.db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      columns: { id: true, courseId: true, createdBy: true, published: true },
    })
  }

  /** Grava a ordem 1..n numa única transação (tudo ou nada). */
  async reorder(courseId: string, lessonIds: string[]) {
    await this.db.transaction(async (tx) => {
      for (const [i, id] of lessonIds.entries()) {
        await tx.update(lessons).set({ order: i + 1 }).where(and(eq(lessons.id, id), eq(lessons.courseId, courseId)))
      }
    })
  }

  async setLessonCourse(lessonId: string, courseId: string | null, order?: number) {
    await this.db
      .update(lessons)
      .set({ courseId, ...(order !== undefined ? { order } : {}) })
      .where(eq(lessons.id, lessonId))
  }

  async enroll(userId: string, courseId: string) {
    await this.db.insert(enrollments).values({ userId, courseId }).onConflictDoNothing()
  }

  async unenroll(userId: string, courseId: string) {
    await this.db.delete(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
  }

  async enrolledCourseIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
      .orderBy(asc(enrollments.enrolledAt))
    return rows.map((r) => r.courseId)
  }
}
