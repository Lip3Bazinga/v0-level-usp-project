import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm"
import { courses, enrollments, lessons, type CourseInsert } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { CourseWithAggregatesRow } from "./catalog.mapper"
import { publicLessonColumns, type PublicLessonRow } from "./lesson-columns"
import type { DbTransaction, CourseRow, LessonRow } from "@levelusp/db"

/**
 * Referência qualificada à coluna externa nas subconsultas correlacionadas
 * (numa consulta de tabela única o Drizzle omite o nome da tabela em
 * `${courses.id}`, e o "id" seria resolvido na tabela interna).
 */
const outerCourseId = sql.raw(`"courses"."id"`)
/** Lições publicadas do curso (o número que o aluno vê no card). */
const publishedLessonCount = sql<number>`(select count(*)::int from lessons l where l.course_id = ${outerCourseId} and l.published = true)`
const isEnrolled = (userId: string): SQL<boolean> =>
  sql<boolean>`exists(select 1 from enrollments e where e.course_id = ${outerCourseId} and e.user_id = ${userId})`

/** Onde a lição fica: curso (null = avulsa) e posição. */
export interface LessonPlacement {
  courseId: string | null
  /** Posição no curso; ausente mantém a atual. */
  order?: number
}

/** Cursos, matrículas e a posição das lições dentro de cada curso. */
@Injectable()
export class CoursesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Cursos com contagem de lições e, se houver usuário, a matrícula dele. */
  private listWithAggregates(userId: string | undefined, where: SQL | undefined, orderBy?: SQL): Promise<CourseWithAggregatesRow[]> {
    const query = this.db
      .select({ course: courses, lessonCount: publishedLessonCount, enrolled: userId ? isEnrolled(userId) : sql<null>`null` })
      .from(courses)
      .where(where)
      .$dynamic()
    return orderBy ? query.orderBy(orderBy) : query
  }

  /** Cursos publicados por título, com agregados (e a matrícula de `userId`, se informado). */
  listPublished(userId?: string): Promise<CourseWithAggregatesRow[]> {
    return this.listWithAggregates(userId, eq(courses.published, true), asc(courses.title))
  }

  /** `ownerId` null = todos (admin). */
  listByOwner(ownerId: string | null): Promise<CourseWithAggregatesRow[]> {
    return this.listWithAggregates(undefined, ownerId ? eq(courses.createdBy, ownerId) : undefined, desc(courses.createdAt))
  }

  /** O filtro é pela chave primária: no máximo uma linha. */
  async findWithAggregates(id: string, userId?: string): Promise<CourseWithAggregatesRow | undefined> {
    const [course] = await this.listWithAggregates(userId, eq(courses.id, id))
    return course
  }

  /** Curso pelo id, publicado ou não. */
  findById(id: string): Promise<CourseRow | undefined> {
    return this.db.query.courses.findFirst({ where: eq(courses.id, id) })
  }

  /** Insere o curso. */
  async create(values: CourseInsert): Promise<CourseRow> {
    return requireRow(await this.db.insert(courses).values(values).returning(), "courses")
  }

  /** Atualiza só os campos enviados. */
  async update(id: string, patch: Partial<CourseInsert>): Promise<void> {
    await this.db.update(courses).set(patch).where(eq(courses.id, id))
  }

  /** Apaga o curso; as lições ficam avulsas e matrículas, prova e certificados saem em cascata. */
  async delete(id: string): Promise<void> {
    await this.db.delete(courses).where(eq(courses.id, id))
  }

  /** Lições do curso sem gabarito, na ordem do curso. */
  listLessons(courseId: string, onlyPublished: boolean): Promise<PublicLessonRow[]> {
    return this.db
      .select(publicLessonColumns)
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), onlyPublished ? eq(lessons.published, true) : undefined))
      .orderBy(asc(lessons.order), asc(lessons.createdAt))
  }

  /** Id e posição de todas as lições do curso. */
  listLessonOrders(courseId: string): Promise<Pick<LessonRow, "id" | "order">[]> {
    return this.db.select({ id: lessons.id, order: lessons.order }).from(lessons).where(eq(lessons.courseId, courseId))
  }

  /** Dados mínimos de uma lição para checar dono ao anexar/desanexar. */
  findLessonRef(lessonId: string): Promise<Pick<LessonRow, "id" | "courseId" | "published" | "createdBy"> | undefined> {
    return this.db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      columns: { id: true, courseId: true, createdBy: true, published: true },
    })
  }

  /** Grava a ordem 1..n numa única transação (tudo ou nada). */
  async reorder(courseId: string, lessonIds: string[]): Promise<void> {
    await this.db.transaction(async (tx: DbTransaction) => {
      for (const [index, lessonId] of lessonIds.entries()) {
        await tx.update(lessons).set({ order: index + 1 }).where(and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId)))
      }
    })
  }

  /** Move a lição para outro curso (ou a deixa avulsa); sem `order`, mantém a posição atual. */
  async placeLesson(lessonId: string, { courseId, order }: LessonPlacement): Promise<void> {
    await this.db
      .update(lessons)
      .set({ courseId, ...(order !== undefined ? { order } : {}) })
      .where(eq(lessons.id, lessonId))
  }

  /** Matricula o aluno; repetir não faz nada. */
  async enroll(userId: string, courseId: string): Promise<void> {
    await this.db.insert(enrollments).values({ userId, courseId }).onConflictDoNothing()
  }

  /** Cancela a matrícula; sem matrícula não faz nada. */
  async unenroll(userId: string, courseId: string): Promise<void> {
    await this.db.delete(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
  }

  /** Ids dos cursos em que o usuário está matriculado. */
  async listEnrolledCourseIds(userId: string): Promise<string[]> {
    const enrolled = await this.db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
      .orderBy(asc(enrollments.enrolledAt))
    return enrolled.map((enrollment) => enrollment.courseId)
  }
}
