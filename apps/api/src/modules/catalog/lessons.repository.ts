import { Injectable } from "@nestjs/common"
import { asc, count, eq, like, or, sql } from "drizzle-orm"
import { lessonQuizQuestions, lessons, type LessonInsert } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { LessonMetricsRow } from "./catalog.mapper"
import { lessonSummaryColumns, publicLessonColumns } from "./lesson-columns"

/** Coluna externa qualificada para subconsultas correlacionadas (ver courses.repository). */
const outerLessonId = sql.raw(`"lessons"."id"`)

/** Ordem do catálogo: por curso (avulsas por último) e posição no curso. */
const catalogOrder = [asc(lessons.courseId), asc(lessons.order), asc(lessons.createdAt)]

@Injectable()
export class LessonsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  listPublishedSummaries() {
    return this.db.select(lessonSummaryColumns).from(lessons).where(eq(lessons.published, true)).orderBy(...catalogOrder)
  }

  listPublished() {
    return this.db.select(publicLessonColumns).from(lessons).where(eq(lessons.published, true)).orderBy(...catalogOrder)
  }

  async findPublic(id: string) {
    const [lesson] = await this.db.select(publicLessonColumns).from(lessons).where(eq(lessons.id, id)).limit(1)
    return lesson
  }

  /** Linha completa, COM gabarito — só para autoria (dono/admin). */
  findFull(id: string) {
    return this.db.query.lessons.findFirst({ where: eq(lessons.id, id) })
  }

  /** `ownerId` null = todas (admin). */
  listByOwner(ownerId: string | null) {
    return this.db
      .select(publicLessonColumns)
      .from(lessons)
      .where(ownerId ? eq(lessons.createdBy, ownerId) : undefined)
      .orderBy(...catalogOrder)
  }

  /** Início, conclusão e submissões por lição (para o painel do professor). */
  listMetrics(ownerId: string | null): Promise<LessonMetricsRow[]> {
    return this.db
      .select({
        lessonId: lessons.id,
        started: sql<number>`(select count(*)::int from lesson_progress p where p.lesson_id = ${outerLessonId})`,
        completed: sql<number>`(select count(*)::int from lesson_progress p where p.lesson_id = ${outerLessonId} and p.status = 'completed')`,
        submissions: sql<number>`(select count(*)::int from submissions s where s.lesson_id = ${outerLessonId})`,
        passed: sql<number>`(select count(*)::int from submissions s where s.lesson_id = ${outerLessonId} and s.passed = true)`,
      })
      .from(lessons)
      .where(ownerId ? eq(lessons.createdBy, ownerId) : undefined)
      .orderBy(...catalogOrder)
  }

  /** Slugs que colidem com `base` (o próprio ou `base-N`). */
  async listSlugsLike(base: string): Promise<string[]> {
    const colliding = await this.db
      .select({ slug: lessons.slug })
      .from(lessons)
      .where(or(eq(lessons.slug, base), like(lessons.slug, `${base}-%`)))
    return colliding.flatMap((lesson) => (lesson.slug ? [lesson.slug] : []))
  }

  async create(values: LessonInsert) {
    return requireRow(await this.db.insert(lessons).values(values).returning(), "lessons")
  }

  async update(id: string, patch: Partial<LessonInsert>) {
    const [lesson] = await this.db.update(lessons).set(patch).where(eq(lessons.id, id)).returning()
    return lesson
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(lessons).where(eq(lessons.id, id))
  }

  async countQuizQuestions(lessonId: string): Promise<number> {
    const [questions] = await this.db.select({ total: count() }).from(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, lessonId))
    return questions?.total ?? 0
  }
}
