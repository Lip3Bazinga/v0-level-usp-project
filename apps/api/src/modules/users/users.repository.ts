import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm"
import { badges, lessonProgress, profiles, userBadges, type ProfileInsert } from "@levelusp/db"
import { SAO_PAULO_TIME_ZONE } from "@/common/time/time"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { ProfileRow, BadgeRow, UserBadgeRow } from "@levelusp/db"

const saoPauloZone = sql.raw(`'${SAO_PAULO_TIME_ZONE}'`)

/** Perfis (dados de domínio do usuário) e o que se lê deles publicamente. */
/** XP e conclusões de um dia civil (São Paulo, `yyyy-mm-dd`). */
export interface ActivityDayRow {
  day: string
  xp: number
  completions: number
}

/** Perfis, ranking e badges do catálogo. */
@Injectable()
export class UsersRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Perfil pelo id. */
  findById(id: string): Promise<ProfileRow | undefined> {
    return this.db.query.profiles.findFirst({ where: eq(profiles.id, id) })
  }

  /** Perfil pelo username (comparado em minúsculas). */
  findByUsername(username: string): Promise<ProfileRow | undefined> {
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

  /** Atualiza os campos enviados; `undefined` quando o perfil não existe. */
  async update(id: string, patch: Partial<ProfileInsert>): Promise<ProfileRow | undefined> {
    const [profile] = await this.db.update(profiles).set(patch).where(eq(profiles.id, id)).returning()
    return profile
  }

  /** Todos os perfis, mais recentes primeiro. */
  list(): Promise<ProfileRow[]> {
    return this.db.select().from(profiles).orderBy(desc(profiles.createdAt))
  }

  /** Alunos não suspensos por XP (empate: quem chegou antes). */
  listLeaderboard(limit: number): Promise<ProfileRow[]> {
    return this.db
      .select()
      .from(profiles)
      .where(and(eq(profiles.suspended, false), eq(profiles.role, "student")))
      .orderBy(desc(profiles.totalXp), asc(profiles.createdAt))
      .limit(limit)
  }

  /** XP e conclusões por dia (fuso de São Paulo) desde `since`. */
  listActivity(userId: string, since: Date): Promise<ActivityDayRow[]> {
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

  /** Badges do catálogo na ordem de exibição; inativos só quando pedido. */
  listBadges(includeInactive: boolean): Promise<BadgeRow[]> {
    return this.db.select().from(badges).where(includeInactive ? undefined : eq(badges.active, true)).orderBy(asc(badges.sortOrder))
  }

  /** Conquistas do usuário, mais recentes primeiro. */
  listUserBadges(userId: string): Promise<UserBadgeRow[]> {
    return this.db.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(desc(userBadges.earnedAt))
  }
}
