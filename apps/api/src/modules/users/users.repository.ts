import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, gte, sql } from "drizzle-orm"
import { badges, lessonProgress, profiles, userBadges } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"

@Injectable()
export class UsersRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findById(id: string) {
    return this.db.query.profiles.findFirst({ where: eq(profiles.id, id) })
  }

  findByUsername(username: string) {
    return this.db.query.profiles.findFirst({ where: eq(profiles.username, username.toLowerCase()) })
  }

  async usernameTakenByOther(username: string, userId: string) {
    const row = await this.db.query.profiles.findFirst({ where: and(eq(profiles.username, username), sql`${profiles.id} <> ${userId}`), columns: { id: true } })
    return Boolean(row)
  }

  async update(id: string, patch: Partial<typeof profiles.$inferInsert>) {
    const [row] = await this.db.update(profiles).set(patch).where(eq(profiles.id, id)).returning()
    return row
  }

  leaderboard(limit: number) {
    return this.db
      .select()
      .from(profiles)
      .where(and(eq(profiles.suspended, false), eq(profiles.role, "student")))
      .orderBy(desc(profiles.totalXp), asc(profiles.createdAt))
      .limit(limit)
  }

  /** XP e conclusões por dia (fuso de São Paulo) desde `since`. */
  activity(userId: string, since: Date) {
    return this.db
      .select({
        day: sql<string>`to_char(${lessonProgress.completedAt} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`,
        xp: sql<number>`coalesce(sum(${lessonProgress.xpEarned}), 0)::int`,
        n: sql<number>`count(*)::int`,
      })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"), gte(lessonProgress.completedAt, since.toISOString())))
      .groupBy(sql`1`)
  }

  allBadges(includeInactive: boolean) {
    return this.db.select().from(badges).where(includeInactive ? undefined : eq(badges.active, true)).orderBy(asc(badges.sortOrder))
  }

  userBadges(userId: string) {
    return this.db.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(desc(userBadges.earnedAt))
  }
}
