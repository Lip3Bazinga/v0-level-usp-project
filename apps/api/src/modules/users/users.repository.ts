import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm"
import { badges, lessonProgress, profiles, userBadges, type ProfileInsert } from "@levelusp/db"
import { SAO_PAULO_TIME_ZONE } from "@/common/time/time"
import { InjectDb, type Database } from "@/infra/database/database.module"

const saoPauloZone = sql.raw(`'${SAO_PAULO_TIME_ZONE}'`)

/** Perfis (dados de domínio do usuário) e o que se lê deles publicamente. */
@Injectable()
export class UsersRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findById(id: string) {
    return this.db.query.profiles.findFirst({ where: eq(profiles.id, id) })
  }

  findByUsername(username: string) {
    return this.db.query.profiles.findFirst({ where: eq(profiles.username, username.toLowerCase()) })
  }

  /** `exceptUserId`: ignora o próprio usuário ao validar uma troca de username. */
  async isUsernameTaken(username: string, exceptUserId?: string): Promise<boolean> {
    const owner = await this.db.query.profiles.findFirst({
      where: and(eq(profiles.username, username), exceptUserId ? ne(profiles.id, exceptUserId) : undefined),
      columns: { id: true },
    })
    return Boolean(owner)
  }

  async update(id: string, patch: Partial<ProfileInsert>) {
    const [profile] = await this.db.update(profiles).set(patch).where(eq(profiles.id, id)).returning()
    return profile
  }

  list() {
    return this.db.select().from(profiles).orderBy(desc(profiles.createdAt))
  }

  listLeaderboard(limit: number) {
    return this.db
      .select()
      .from(profiles)
      .where(and(eq(profiles.suspended, false), eq(profiles.role, "student")))
      .orderBy(desc(profiles.totalXp), asc(profiles.createdAt))
      .limit(limit)
  }

  /** XP e conclusões por dia (fuso de São Paulo) desde `since`. */
  listActivity(userId: string, since: Date) {
    return this.db
      .select({
        day: sql<string>`to_char(${lessonProgress.completedAt} at time zone ${saoPauloZone}, 'YYYY-MM-DD')`,
        xp: sql<number>`coalesce(sum(${lessonProgress.xpEarned}), 0)::int`,
        completions: sql<number>`count(*)::int`,
      })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "completed"), gte(lessonProgress.completedAt, since.toISOString())))
      .groupBy(sql`1`)
  }

  listBadges(includeInactive: boolean) {
    return this.db.select().from(badges).where(includeInactive ? undefined : eq(badges.active, true)).orderBy(asc(badges.sortOrder))
  }

  listUserBadges(userId: string) {
    return this.db.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(desc(userBadges.earnedAt))
  }
}
