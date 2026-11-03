import { Injectable } from "@nestjs/common"
import { asc, count, eq, like, or, sql } from "drizzle-orm"
import { lessonQuizQuestions, lessons, type LessonInsert } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { LessonMetricsRow } from "./catalog.mapper"
import { lessonSummaryColumns, publicLessonColumns, type LessonSummaryRow, type PublicLessonRow } from "./lesson-columns"
import type { LessonRow } from "@levelusp/db"

/** Coluna externa qualificada para subconsultas correlacionadas (ver courses.repository). */
const outerLessonId = sql.raw(`"lessons"."id"`)

/** Ordem do catálogo: por curso (avulsas por último) e posição no curso. */
const catalogOrder = [asc(lessons.courseId), asc(lessons.order), asc(lessons.createdAt)]

/** Lições e quizzes vinculados. Leituras para o aluno selecionam só as colunas públicas (sem gabarito). */
@Injectable()
export class LessonsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Resumo das lições publicadas, na ordem do catálogo. */
  listPublishedSummaries(): Promise<LessonSummaryRow[]> {
    return this.db.select(lessonSummaryColumns).from(lessons).where(eq(lessons.published, true)).orderBy(...catalogOrder)
  }

  /** Lições publicadas sem gabarito, na ordem do catálogo. */
  listPublished(): Promise<PublicLessonRow[]> {
    return this.db.select(publicLessonColumns).from(lessons).where(eq(lessons.published, true)).orderBy(...catalogOrder)
  }

  /** Lição sem gabarito, publicada ou não (a visibilidade é decidida no service). */
  async findPublic(id: string): Promise<PublicLessonRow | undefined> {
    const [lesson] = await this.db.select(publicLessonColumns).from(lessons).where(eq(lessons.id, id)).limit(1)
    return lesson
  }

  /** Linha completa, COM gabarito — só para autoria (dono/admin). */
  findFull(id: string): Promise<LessonRow | undefined> {
    return this.db.query.lessons.findFirst({ where: eq(lessons.id, id) })
  }

  /** `ownerId` null = todas (admin). */
  listByOwner(ownerId: string | null): Promise<PublicLessonRow[]> {
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

  /** Insere a lição. Slug repetido lança o erro de unicidade do Postgres. */
  async create(values: LessonInsert): Promise<LessonRow> {
    return requireRow(await this.db.insert(lessons).values(values).returning(), "lessons")
  }

  /** Atualiza os campos enviados; `undefined` quando a lição não existe. */
  async update(id: string, patch: Partial<LessonInsert>): Promise<LessonRow | undefined> {
    const [lesson] = await this.db.update(lessons).set(patch).where(eq(lessons.id, id)).returning()
    return lesson
  }

  /** Apaga a lição: progresso, submissões e questões saem em cascata; anotações perdem o vínculo. */
  async delete(id: string): Promise<void> {
    await this.db.delete(lessons).where(eq(lessons.id, id))
  }

  /** Quantas questões o quiz da lição tem. */
  async countQuizQuestions(lessonId: string): Promise<number> {
    const [questions] = await this.db.select({ total: count() }).from(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, lessonId))
    return questions?.total ?? 0
  }
}
