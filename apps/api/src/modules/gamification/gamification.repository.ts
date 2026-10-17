import { Injectable } from "@nestjs/common"
import { and, asc, count, eq, inArray, sql } from "drizzle-orm"
import { badges, courses, lessonProgress, lessons, profiles, userBadges } from "@levelusp/db"
import { InjectDb, type Database, type DbOrTx } from "@/infra/database/database.module"

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
@Injectable()
export class GamificationRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findLessonReward(lessonId: string, tx: DbOrTx = this.db) {
    return tx.query.lessons.findFirst({ where: eq(lessons.id, lessonId), columns: { id: true, xpReward: true, courseId: true } })
  }

  /** FOR UPDATE: serializa as conclusões do mesmo aluno, mesmo sem linha de progresso ainda. */
  async lockProgression(userId: string, tx: DbOrTx = this.db) {
    const [progression] = await tx.select({ totalXp: profiles.totalXp, level: profiles.level }).from(profiles).where(eq(profiles.id, userId)).for("update")
    return progression
  }

  async lockStreak(userId: string, tx: DbOrTx = this.db) {
    const [streak] = await tx
      .select({ lastActivityDate: profiles.lastLoginDate, currentStreak: profiles.currentStreak })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .for("update")
    return streak
  }

  async saveStreak({ userId, streak, today }: StreakUpdate, tx: DbOrTx = this.db): Promise<void> {
    await tx
      .update(profiles)
      .set({ currentStreak: streak, maxStreak: sql`greatest(${profiles.maxStreak}, ${streak})`, lastLoginDate: today })
      .where(eq(profiles.id, userId))
  }

  async progressStatus(userId: string, lessonId: string, tx: DbOrTx = this.db) {
    const [progress] = await tx
      .select({ status: lessonProgress.status })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
    return progress?.status
  }

  async markCompleted({ userId, lessonId, xpEarned, score }: CompletionRecord, tx: DbOrTx = this.db): Promise<void> {
    const completion = { status: "completed" as const, xpEarned, score, completedAt: sql`now()` }
    await tx
      .insert(lessonProgress)
      .values({ userId, lessonId, ...completion })
      .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: completion })
  }

  async creditLesson({ userId, totalXp, level }: ProgressionUpdate, tx: DbOrTx = this.db): Promise<void> {
    await tx
      .update(profiles)
      .set({ totalXp, level, lessonsCompleted: sql`${profiles.lessonsCompleted} + 1` })
      .where(eq(profiles.id, userId))
  }

  publishedLessonIds(courseId: string, tx: DbOrTx = this.db) {
    return tx.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.courseId, courseId), eq(lessons.published, true)))
  }

  async completedCount(userId: string, lessonIds: string[], tx: DbOrTx = this.db): Promise<number> {
    const [completed] = await tx
      .select({ total: count() })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"), inArray(lessonProgress.lessonId, lessonIds)))
    return completed?.total ?? 0
  }

  async incrementCoursesCompleted(userId: string, tx: DbOrTx = this.db): Promise<void> {
    await tx.update(profiles).set({ coursesCompleted: sql`${profiles.coursesCompleted} + 1` }).where(eq(profiles.id, userId))
  }

  async courseTitle(courseId: string, tx: DbOrTx = this.db): Promise<string | undefined> {
    const course = await tx.query.courses.findFirst({ where: eq(courses.id, courseId), columns: { title: true } })
    return course?.title
  }

  findProfile(userId: string, tx: DbOrTx = this.db) {
    return tx.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  }

  badgeRules(tx: DbOrTx = this.db) {
    return tx.select().from(badges).orderBy(asc(badges.sortOrder))
  }

  async ownedBadgeIds(userId: string, tx: DbOrTx = this.db): Promise<Set<string>> {
    const owned = await tx.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId))
    return new Set(owned.map((userBadge) => userBadge.badgeId))
  }

  async grantBadges(userId: string, badgeIds: string[], tx: DbOrTx = this.db): Promise<void> {
    await tx.insert(userBadges).values(badgeIds.map((badgeId) => ({ userId, badgeId }))).onConflictDoNothing()
  }
}
