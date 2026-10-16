import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, gte, sql } from "drizzle-orm"
import { badges, lessonProgress, lessons, platformSettings, profiles, submissions, userBadges } from "@levelusp/db"
import type { PlatformMetrics } from "@levelusp/contracts"
import { InjectDb, type Database } from "@/infra/database/database.module"

const SP = sql.raw(`'America/Sao_Paulo'`)

/** Colunas públicas da lição — `test_cases` nunca é selecionado aqui. */
const LESSON_COLUMNS = {
  id: lessons.id, title: lessons.title, description: lessons.description, slug: lessons.slug, module: lessons.module,
  order: lessons.order, difficulty: lessons.difficulty, contentMarkdown: lessons.contentMarkdown, starterCode: lessons.starterCode,
  starterFiles: lessons.starterFiles, checkpoints: lessons.checkpoints, libraries: lessons.libraries, xpReward: lessons.xpReward,
  timeLimit: lessons.timeLimit, lessonType: lessons.lessonType, quizPassingScore: lessons.quizPassingScore, courseId: lessons.courseId,
  moduleId: lessons.moduleId, createdBy: lessons.createdBy, published: lessons.published, createdAt: lessons.createdAt, updatedAt: lessons.updatedAt,
}
export type AdminLessonRow = Omit<typeof lessons.$inferSelect, "testCases">

@Injectable()
export class AdminRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  // ── Usuários ───────────────────────────────────────────────────────────────

  listProfiles() {
    return this.db.select().from(profiles).orderBy(desc(profiles.createdAt))
  }

  findProfile(id: string) {
    return this.db.query.profiles.findFirst({ where: eq(profiles.id, id) })
  }

  async usernameTakenByOther(username: string, userId: string) {
    const row = await this.db.query.profiles.findFirst({
      where: and(eq(profiles.username, username), sql`${profiles.id} <> ${userId}`),
      columns: { id: true },
    })
    return Boolean(row)
  }

  async updateProfile(id: string, patch: Partial<typeof profiles.$inferInsert>) {
    const [row] = await this.db.update(profiles).set(patch).where(eq(profiles.id, id)).returning()
    return row
  }

  /**
   * Zera o progresso: apaga progresso por lição, submissões e badges e reinicia
   * os contadores de gamificação, tudo numa transação. (Exceção administrativa
   * à regra "só o GamificationService mexe em XP": aqui só se ZERA, nunca credita.)
   */
  resetProgress(userId: string) {
    return this.db.transaction(async (tx) => {
      await tx.delete(lessonProgress).where(eq(lessonProgress.userId, userId))
      await tx.delete(submissions).where(eq(submissions.userId, userId))
      await tx.delete(userBadges).where(eq(userBadges.userId, userId))
      const [row] = await tx
        .update(profiles)
        .set({ totalXp: 0, level: 1, currentStreak: 0, maxStreak: 0, lessonsCompleted: 0, coursesCompleted: 0, lastLoginDate: null })
        .where(eq(profiles.id, userId))
        .returning({ id: profiles.id })
      return Boolean(row)
    })
  }

  // ── Métricas ───────────────────────────────────────────────────────────────

  async metrics(): Promise<PlatformMetrics> {
    const res = await this.db.execute<Record<keyof PlatformMetrics, number>>(sql`
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
    return res.rows[0]!
  }

  recentCompletions(limit: number) {
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
      .where(and(eq(lessonProgress.status, "completed"), sql`${lessonProgress.completedAt} is not null`))
      .orderBy(desc(lessonProgress.completedAt))
      .limit(limit)
  }

  /** Conclusões e usuários distintos por dia civil (São Paulo) desde `since`. */
  completionsPerDay(since: Date) {
    return this.db
      .select({
        day: sql<string>`to_char(${lessonProgress.completedAt} at time zone ${SP}, 'YYYY-MM-DD')`,
        completions: sql<number>`count(*)::int`,
        users: sql<number>`count(distinct ${lessonProgress.userId})::int`,
      })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.status, "completed"), gte(lessonProgress.completedAt, since.toISOString())))
      .groupBy(sql`1`)
  }

  async analyticsTotals() {
    const res = await this.db.execute<{
      dau: number; wau: number; mau: number; total_users: number; average_xp: number
      retention_base: number; retention_active: number; streak7: number; started: number; completed5: number
    }>(sql`
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
             and last_login_date >= (now() at time zone ${SP})::date - 7)::int as retention_active,
        (select count(*) from profiles where current_streak >= 7)::int as streak7,
        (select count(*) from per_user where n >= 1)::int as started,
        (select count(*) from per_user where n >= 5)::int as completed5
    `)
    return res.rows[0]!
  }

  topLessons(limit: number) {
    return this.db
      .select({ lessonId: lessons.id, title: lessons.title, completions: sql<number>`count(*)::int` })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
      .where(eq(lessonProgress.status, "completed"))
      .groupBy(lessons.id, lessons.title)
      .orderBy(desc(sql`count(*)`), asc(lessons.title))
      .limit(limit)
  }

  roleDistribution() {
    return this.db
      .select({ role: profiles.role, count: sql<number>`count(*)::int` })
      .from(profiles)
      .groupBy(profiles.role)
      .orderBy(asc(profiles.role))
  }

  // ── Lições, configurações, badges ──────────────────────────────────────────

  allLessons(): Promise<AdminLessonRow[]> {
    return this.db.select(LESSON_COLUMNS).from(lessons).orderBy(asc(lessons.module), asc(lessons.order), asc(lessons.title))
  }

  settings() {
    return this.db.select({ key: platformSettings.key, value: platformSettings.value }).from(platformSettings).orderBy(asc(platformSettings.key))
  }

  upsertSettings(entries: { key: string; value: unknown }[]) {
    return this.db
      .insert(platformSettings)
      // JSON explícito: `null` vira jsonb 'null' (a coluna é NOT NULL), não SQL NULL.
      .values(entries.map((e) => ({ key: e.key, value: sql`${JSON.stringify(e.value ?? null)}::jsonb` })))
      .onConflictDoUpdate({ target: platformSettings.key, set: { value: sql`excluded.value` } })
  }

  findBadge(id: string) {
    return this.db.query.badges.findFirst({ where: eq(badges.id, id) })
  }

  async insertBadge(v: typeof badges.$inferInsert) {
    const [row] = await this.db.insert(badges).values(v).returning()
    return row!
  }

  async updateBadge(id: string, patch: Partial<typeof badges.$inferInsert>) {
    const [row] = await this.db.update(badges).set(patch).where(eq(badges.id, id)).returning()
    return row
  }

  async deleteBadge(id: string): Promise<boolean> {
    const rows = await this.db.delete(badges).where(eq(badges.id, id)).returning({ id: badges.id })
    return rows.length > 0
  }
}
