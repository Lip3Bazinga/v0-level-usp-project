import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, gte, isNotNull, sql } from "drizzle-orm"
import { badges, lessonProgress, lessons, platformSettings, profiles, submissions, userBadges, type BadgeInsert } from "@levelusp/db"
import type { PlatformMetrics } from "@levelusp/contracts"
import { requireRow } from "@/common/database/rows"
import { SAO_PAULO_TIME_ZONE } from "@/common/time/time"
import { InjectDb, type Database } from "@/infra/database/database.module"
import { publicLessonColumns, type PublicLessonRow } from "../catalog/lesson-columns"
import type { AnalyticsTotalsRow, CompletionsPerDayRow, RecentCompletionRow, RoleCountRow, TopLessonRow } from "./admin.mapper"
import type { DbTransaction, BadgeRow } from "@levelusp/db"

const saoPauloZone = sql.raw(`'${SAO_PAULO_TIME_ZONE}'`)

/** Configuração da plataforma: chave e valor JSON (`null` é gravado como jsonb `null`). */
export interface SettingEntry {
  key: string
  value: unknown
}

/** Consultas exclusivas do painel administrativo: métricas agregadas, configurações e badges. */
@Injectable()
export class AdminRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /**
   * Zera o progresso: apaga progresso por lição, submissões e badges e reinicia
   * os contadores de gamificação, tudo numa transação. (Exceção administrativa
   * à regra "só o GamificationService mexe em XP": aqui só se ZERA, nunca credita.)
   */
  resetProgress(userId: string): Promise<boolean> {
    return this.db.transaction(async (tx: DbTransaction) => {
      await tx.delete(lessonProgress).where(eq(lessonProgress.userId, userId))
      await tx.delete(submissions).where(eq(submissions.userId, userId))
      await tx.delete(userBadges).where(eq(userBadges.userId, userId))
      const [reset] = await tx
        .update(profiles)
        .set({ totalXp: 0, level: 1, currentStreak: 0, maxStreak: 0, lessonsCompleted: 0, coursesCompleted: 0, lastLoginDate: null })
        .where(eq(profiles.id, userId))
        .returning({ id: profiles.id })
      return Boolean(reset)
    })
  }

  /** Totais da plataforma numa única consulta. */
  async getMetrics(): Promise<PlatformMetrics> {
    const result = await this.db.execute<Record<keyof PlatformMetrics, number>>(sql`
      select
        (select count(*) from profiles)::int                                   as "totalUsers",
        (select count(*) from profiles where role = 'student')::int            as "totalStudents",
        (select count(*) from profiles where role = 'teacher')::int            as "totalTeachers",
        (select count(*) from profiles where role = 'admin')::int              as "totalAdmins",
        (select count(*) from lessons)::int                                    as "totalLessons",
        (select count(*) from lessons where published)::int                    as "publishedLessons",
        (select count(*) from lesson_progress where status = 'completed')::int as "totalCompletions",
        (select count(*) from teacher_approvals where status = 'pending')::int as "pendingApprovals",
        (select count(*) from courses)::int                                    as "totalCourses",
        (select count(*) from courses where published)::int                    as "publishedCourses",
        (select count(*) from enrollments)::int                                as "totalEnrollments",
        (select coalesce(sum(total_xp), 0) from profiles)::bigint::float8      as "totalXpAwarded"
    `)
    return requireRow(result.rows, "metrics")
  }

  /** Conclusões mais recentes com nomes do aluno e da lição (só as que têm data de conclusão). */
  listRecentCompletions(limit: number): Promise<RecentCompletionRow[]> {
    return this.db
      .select({
        id: lessonProgress.id,
        userName: profiles.fullName,
        lessonTitle: lessons.title,
        xpEarned: lessonProgress.xpEarned,
        completedAt: lessonProgress.completedAt,
      })
      .from(lessonProgress)
      .innerJoin(profiles, eq(profiles.id, lessonProgress.userId))
      .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
      .where(and(eq(lessonProgress.status, "completed"), isNotNull(lessonProgress.completedAt)))
      .orderBy(desc(lessonProgress.completedAt))
      .limit(limit)
  }

  /** Conclusões e usuários distintos por dia civil (São Paulo) desde `since`. */
  listCompletionsPerDay(since: Date): Promise<CompletionsPerDayRow[]> {
    return this.db
      .select({
        day: sql<string>`to_char(${lessonProgress.completedAt} at time zone ${saoPauloZone}, 'YYYY-MM-DD')`,
        completions: sql<number>`count(*)::int`,
        users: sql<number>`count(distinct ${lessonProgress.userId})::int`,
      })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.status, "completed"), gte(lessonProgress.completedAt, since.toISOString())))
      .groupBy(sql`1`)
  }

  /** DAU/WAU/MAU, retenção de 7 dias e funil de engajamento, numa única consulta. */
  async getAnalyticsTotals(): Promise<AnalyticsTotalsRow> {
    const result = await this.db.execute<AnalyticsTotalsRow>(sql`
      with done as (
        select user_id, completed_at from lesson_progress where status = 'completed' and completed_at is not null
      ), per_user as (
        select user_id, count(*) as n from done group by user_id
      )
      select
        (select count(distinct user_id) from done where completed_at >= now() - interval '1 day')::int   as dau,
        (select count(distinct user_id) from done where completed_at >= now() - interval '7 days')::int  as wau,
        (select count(distinct user_id) from done where completed_at >= now() - interval '30 days')::int as mau,
        (select count(*) from profiles)::int as total_users,
        (select coalesce(round(avg(total_xp)), 0) from profiles where role = 'student')::int as average_xp,
        (select count(*) from profiles where created_at <= now() - interval '7 days')::int as retention_base,
        (select count(*) from profiles
           where created_at <= now() - interval '7 days'
             and last_login_date >= (now() at time zone ${saoPauloZone})::date - 7)::int as retention_active,
        (select count(*) from profiles where current_streak >= 7)::int as streak7,
        (select count(*) from per_user where n >= 1)::int as started,
        (select count(*) from per_user where n >= 5)::int as completed5
    `)
    return requireRow(result.rows, "analytics")
  }

  /** Lições com mais conclusões (empate: ordem alfabética). */
  listTopLessons(limit: number): Promise<TopLessonRow[]> {
    return this.db
      .select({ lessonId: lessons.id, title: lessons.title, completions: sql<number>`count(*)::int` })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
      .where(eq(lessonProgress.status, "completed"))
      .groupBy(lessons.id, lessons.title)
      .orderBy(desc(sql`count(*)`), asc(lessons.title))
      .limit(limit)
  }

  /** Quantidade de perfis por papel. */
  listRoleDistribution(): Promise<RoleCountRow[]> {
    return this.db
      .select({ role: profiles.role, count: sql<number>`count(*)::int` })
      .from(profiles)
      .groupBy(profiles.role)
      .orderBy(asc(profiles.role))
  }

  /** Lições sem gabarito — `test_cases` nunca é selecionado aqui. */
  listLessons(): Promise<PublicLessonRow[]> {
    return this.db.select(publicLessonColumns).from(lessons).orderBy(asc(lessons.module), asc(lessons.order), asc(lessons.title))
  }

  /** Todas as configurações, por chave. */
  listSettings(): Promise<SettingEntry[]> {
    return this.db.select({ key: platformSettings.key, value: platformSettings.value }).from(platformSettings).orderBy(asc(platformSettings.key))
  }

  /** Grava as chaves enviadas (insere ou substitui); as demais não mudam. */
  async upsertSettings(entries: SettingEntry[]): Promise<void> {
    await this.db
      .insert(platformSettings)
      // JSON explícito: `null` vira jsonb 'null' (a coluna é NOT NULL), não SQL NULL.
      .values(entries.map((entry) => ({ key: entry.key, value: sql`${JSON.stringify(entry.value ?? null)}::jsonb` })))
      .onConflictDoUpdate({ target: platformSettings.key, set: { value: sql`excluded.value` } })
  }

  /** Badge pelo id (slug). */
  findBadge(id: string): Promise<BadgeRow | undefined> {
    return this.db.query.badges.findFirst({ where: eq(badges.id, id) })
  }

  /** Insere o badge. O id é chave primária: id repetido lança o erro de unicidade do Postgres. */
  async createBadge(badge: BadgeInsert): Promise<BadgeRow> {
    return requireRow(await this.db.insert(badges).values(badge).returning(), "badges")
  }

  /** Atualiza os campos enviados; `undefined` quando o badge não existe. */
  async updateBadge(id: string, patch: Partial<BadgeInsert>): Promise<BadgeRow | undefined> {
    const [badge] = await this.db.update(badges).set(patch).where(eq(badges.id, id)).returning()
    return badge
  }

  /** Apaga o badge (e as conquistas, em cascata); devolve se havia o que apagar. */
  async deleteBadge(id: string): Promise<boolean> {
    const deleted = await this.db.delete(badges).where(eq(badges.id, id)).returning({ id: badges.id })
    return deleted.length > 0
  }
}
