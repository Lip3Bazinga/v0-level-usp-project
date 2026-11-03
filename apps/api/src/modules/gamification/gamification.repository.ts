import { Injectable } from "@nestjs/common"
import { and, asc, count, eq, inArray, sql } from "drizzle-orm"
import { badges, courses, lessonProgress, lessons, profiles, userBadges } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { DbTransaction, DbExecutor, LessonRow, ProfileRow, BadgeRow } from "@levelusp/db"

export interface CompletionRecord {
  userId: string
  lessonId: string
  xpEarned: number
  score: number | null
}

export interface StreakUpdate {
  userId: string
  streak: number
  /** Data civil (yyyy-mm-dd) da atividade. */
  today: string
}

export interface ProgressionUpdate {
  userId: string
  totalXp: number
  level: number
}

/** Escritas de XP, nível, sequência e badges — usadas SOMENTE pelo GamificationService. */
/** Estado da sequência diária: último dia com atividade (São Paulo) e dias seguidos. */
export interface StreakRow {
  lastActivityDate: string | null
  currentStreak: number
}

@Injectable()
export class GamificationRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findLessonReward(lessonId: string, executor: DbExecutor = this.db): Promise<Pick<LessonRow, "id" | "courseId" | "xpReward"> | undefined> {
    return executor.query.lessons.findFirst({ where: eq(lessons.id, lessonId), columns: { id: true, xpReward: true, courseId: true } })
  }

  /** FOR UPDATE: serializa as conclusões do mesmo aluno, mesmo sem linha de progresso ainda. */
  async lockProgression(userId: string, tx: DbTransaction): Promise<Pick<ProfileRow, "totalXp" | "level"> | undefined> {
    const [progression] = await tx.select({ totalXp: profiles.totalXp, level: profiles.level }).from(profiles).where(eq(profiles.id, userId)).for("update")
    return progression
  }

  async lockStreak(userId: string, executor: DbExecutor = this.db): Promise<StreakRow | undefined> {
    const [streak] = await executor
      .select({ lastActivityDate: profiles.lastLoginDate, currentStreak: profiles.currentStreak })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .for("update")
    return streak
  }

  async updateStreak({ userId, streak, today }: StreakUpdate, executor: DbExecutor = this.db): Promise<void> {
    await executor
      .update(profiles)
      .set({ currentStreak: streak, maxStreak: sql`greatest(${profiles.maxStreak}, ${streak})`, lastLoginDate: today })
      .where(eq(profiles.id, userId))
  }

  async findProgressStatus(userId: string, lessonId: string, executor: DbExecutor = this.db): Promise<"not_started" | "in_progress" | "completed" | undefined> {
    const [progress] = await executor
      .select({ status: lessonProgress.status })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
    return progress?.status
  }

  async markCompleted({ userId, lessonId, xpEarned, score }: CompletionRecord, executor: DbExecutor = this.db): Promise<void> {
    const completion = { status: "completed" as const, xpEarned, score, completedAt: sql`now()` }
    await executor
      .insert(lessonProgress)
      .values({ userId, lessonId, ...completion })
      .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: completion })
  }

  async creditLesson({ userId, totalXp, level }: ProgressionUpdate, executor: DbExecutor = this.db): Promise<void> {
    await executor
      .update(profiles)
      .set({ totalXp, level, lessonsCompleted: sql`${profiles.lessonsCompleted} + 1` })
      .where(eq(profiles.id, userId))
  }

  listPublishedLessonIds(courseId: string, executor: DbExecutor = this.db): Promise<Pick<LessonRow, "id">[]> {
    return executor.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.courseId, courseId), eq(lessons.published, true)))
  }

  async countCompleted(userId: string, lessonIds: string[], executor: DbExecutor = this.db): Promise<number> {
    const [completed] = await executor
      .select({ total: count() })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"), inArray(lessonProgress.lessonId, lessonIds)))
    return completed?.total ?? 0
  }

  async incrementCoursesCompleted(userId: string, executor: DbExecutor = this.db): Promise<void> {
    await executor.update(profiles).set({ coursesCompleted: sql`${profiles.coursesCompleted} + 1` }).where(eq(profiles.id, userId))
  }

  async findCourseTitle(courseId: string, executor: DbExecutor = this.db): Promise<string | undefined> {
    const course = await executor.query.courses.findFirst({ where: eq(courses.id, courseId), columns: { title: true } })
    return course?.title
  }

  findProfile(userId: string, executor: DbExecutor = this.db): Promise<ProfileRow | undefined> {
    return executor.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  }

  listBadgeRules(executor: DbExecutor = this.db): Promise<BadgeRow[]> {
    return executor.select().from(badges).orderBy(asc(badges.sortOrder))
  }

  async listOwnedBadgeIds(userId: string, executor: DbExecutor = this.db): Promise<Set<string>> {
    const owned = await executor.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId))
    return new Set(owned.map((userBadge) => userBadge.badgeId))
  }

  async grantBadges(userId: string, badgeIds: string[], executor: DbExecutor = this.db): Promise<void> {
    await executor.insert(userBadges).values(badgeIds.map((badgeId) => ({ userId, badgeId }))).onConflictDoNothing()
  }
}
