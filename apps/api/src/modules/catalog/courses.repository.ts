import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm"
import { courses, enrollments, lessons, type CourseInsert } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { CourseWithAggregatesRow } from "./catalog.mapper"
import { publicLessonColumns } from "./lesson-columns"

/**
 * Referência qualificada à coluna externa nas subconsultas correlacionadas
 * (numa consulta de tabela única o Drizzle omite o nome da tabela em
 * `${courses.id}`, e o "id" seria resolvido na tabela interna).
 */
const outerCourseId = sql.raw(`"courses"."id"`)
/** Lições publicadas do curso (o número que o aluno vê no card). */
const publishedLessonCount = sql<number>`(select count(*)::int from lessons l where l.course_id = ${outerCourseId} and l.published = true)`
const isEnrolled = (userId: string) =>
  sql<boolean>`exists(select 1 from enrollments e where e.course_id = ${outerCourseId} and e.user_id = ${userId})`

export interface LessonPlacement {
  courseId: string | null
  /** Posição no curso; ausente mantém a atual. */
  order?: number
}

@Injectable()
export class CoursesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Cursos com contagem de lições e, se houver usuário, a matrícula dele. */
  private selectWithAggregates(userId: string | undefined, where: SQL | undefined) {
    return this.db
      .select({ course: courses, lessonCount: publishedLessonCount, enrolled: userId ? isEnrolled(userId) : sql<null>`null` })
      .from(courses)
      .where(where)
  }

  listPublished(userId?: string): Promise<CourseWithAggregatesRow[]> {
    return this.selectWithAggregates(userId, eq(courses.published, true)).orderBy(asc(courses.title))
  }

  /** `ownerId` null = todos (admin). */
  listByOwner(ownerId: string | null): Promise<CourseWithAggregatesRow[]> {
    return this.selectWithAggregates(undefined, ownerId ? eq(courses.createdBy, ownerId) : undefined).orderBy(desc(courses.createdAt))
  }

  async findWithAggregates(id: string, userId?: string): Promise<CourseWithAggregatesRow | undefined> {
    const [course] = await this.selectWithAggregates(userId, eq(courses.id, id)).limit(1)
    return course
  }

  findById(id: string) {
    return this.db.query.courses.findFirst({ where: eq(courses.id, id) })
  }

  async create(values: CourseInsert) {
    return requireRow(await this.db.insert(courses).values(values).returning(), "courses")
  }

  async update(id: string, patch: Partial<CourseInsert>): Promise<void> {
    await this.db.update(courses).set(patch).where(eq(courses.id, id))
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(courses).where(eq(courses.id, id))
  }

  /** Lições do curso sem gabarito, na ordem do curso. */
  listLessons(courseId: string, onlyPublished: boolean) {
    return this.db
      .select(publicLessonColumns)
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), onlyPublished ? eq(lessons.published, true) : undefined))
      .orderBy(asc(lessons.order), asc(lessons.createdAt))
  }

  listLessonOrders(courseId: string) {
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
  async reorder(courseId: string, lessonIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const [index, lessonId] of lessonIds.entries()) {
        await tx.update(lessons).set({ order: index + 1 }).where(and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId)))
      }
    })
  }

  async placeLesson(lessonId: string, { courseId, order }: LessonPlacement): Promise<void> {
    await this.db
      .update(lessons)
      .set({ courseId, ...(order !== undefined ? { order } : {}) })
      .where(eq(lessons.id, lessonId))
  }

  async enroll(userId: string, courseId: string): Promise<void> {
    await this.db.insert(enrollments).values({ userId, courseId }).onConflictDoNothing()
  }

  async unenroll(userId: string, courseId: string): Promise<void> {
    await this.db.delete(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
  }

  async listEnrolledCourseIds(userId: string): Promise<string[]> {
    const enrolled = await this.db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
      .orderBy(asc(enrollments.enrolledAt))
    return enrolled.map((enrollment) => enrollment.courseId)
  }
}
