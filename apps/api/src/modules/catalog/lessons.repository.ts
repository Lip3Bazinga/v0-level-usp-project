import { Injectable } from "@nestjs/common"
import { asc, count, eq, getTableColumns, like, or, sql } from "drizzle-orm"
import { lessonQuizQuestions, lessons } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"

type LessonInsert = typeof lessons.$inferInsert

/**
 * Colunas de `lessons` SEM `test_cases`. Toda consulta que alimenta uma
 * resposta para o aluno usa isto: o gabarito nem sai do banco.
 */
const { testCases: _gabarito, ...publicColumns } = getTableColumns(lessons)
export const publicLessonColumns = publicColumns

const summaryColumns = {
  id: lessons.id,
  title: lessons.title,
  slug: lessons.slug,
  module: lessons.module,
  moduleId: lessons.moduleId,
  order: lessons.order,
  difficulty: lessons.difficulty,
  lessonType: lessons.lessonType,
  xpReward: lessons.xpReward,
  courseId: lessons.courseId,
  published: lessons.published,
}

/** Coluna externa qualificada para subconsultas correlacionadas (ver courses.repository). */
const lessonId = sql.raw(`"lessons"."id"`)

/** Ordem do catálogo: por curso (avulsas por último) e posição no curso. */
const catalogOrder = [asc(lessons.courseId), asc(lessons.order), asc(lessons.createdAt)]

@Injectable()
export class LessonsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  publishedSummaries() {
    return this.db.select(summaryColumns).from(lessons).where(eq(lessons.published, true)).orderBy(...catalogOrder)
  }

  published() {
    return this.db.select(publicLessonColumns).from(lessons).where(eq(lessons.published, true)).orderBy(...catalogOrder)
  }

  async findPublic(id: string) {
    const [row] = await this.db.select(publicLessonColumns).from(lessons).where(eq(lessons.id, id)).limit(1)
    return row
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
  metrics(ownerId: string | null) {
    return this.db
      .select({
        lessonId: lessons.id,
        started: sql<number>`(select count(*)::int from lesson_progress p where p.lesson_id = ${lessonId})`,
        completed: sql<number>`(select count(*)::int from lesson_progress p where p.lesson_id = ${lessonId} and p.status = 'completed')`,
        submissions: sql<number>`(select count(*)::int from submissions s where s.lesson_id = ${lessonId})`,
        passed: sql<number>`(select count(*)::int from submissions s where s.lesson_id = ${lessonId} and s.passed = true)`,
      })
      .from(lessons)
      .where(ownerId ? eq(lessons.createdBy, ownerId) : undefined)
      .orderBy(...catalogOrder)
  }

  /** Slugs que colidem com `base` (o próprio ou `base-N`). */
  async slugsLike(base: string): Promise<string[]> {
    const rows = await this.db
      .select({ slug: lessons.slug })
      .from(lessons)
      .where(or(eq(lessons.slug, base), like(lessons.slug, `${base}-%`)))
    return rows.flatMap((r) => (r.slug ? [r.slug] : []))
  }

  async insert(values: LessonInsert) {
    const [row] = await this.db.insert(lessons).values(values).returning()
    return row!
  }

  async update(id: string, patch: Partial<LessonInsert>) {
    const [row] = await this.db.update(lessons).set(patch).where(eq(lessons.id, id)).returning()
    return row
  }

  async delete(id: string) {
    await this.db.delete(lessons).where(eq(lessons.id, id))
  }

  async quizQuestionCount(lessonId: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, lessonId))
    return row?.n ?? 0
  }
}
