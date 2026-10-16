import { Injectable } from "@nestjs/common"
import { and, eq, gt, isNull, sql } from "drizzle-orm"
import { passwordResetTokens, profiles, sessions, users } from "@levelusp/db"
import { InjectDb, type Database, type DbOrTx } from "@/infra/database/database.module"

export type UserRow = typeof users.$inferSelect
export type ProfileRow = typeof profiles.$inferSelect

@Injectable()
export class AuthRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findUserByEmail(email: string) {
    return this.db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email.toLowerCase()}` })
  }

  findUserById(id: string) {
    return this.db.query.users.findFirst({ where: eq(users.id, id) })
  }

  findProfile(id: string, tx: DbOrTx = this.db) {
    return tx.query.profiles.findFirst({ where: eq(profiles.id, id) })
  }

  async usernameTaken(username: string): Promise<boolean> {
    const row = await this.db.query.profiles.findFirst({ where: eq(profiles.username, username), columns: { id: true } })
    return Boolean(row)
  }

  /** Cria credencial + perfil na mesma transação. */
  async createUserWithProfile(input: { email: string; passwordHash: string | null; fullName: string; username: string }) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email: input.email, passwordHash: input.passwordHash }).returning()
      const [profile] = await tx
        .insert(profiles)
        .values({ id: user!.id, email: input.email, fullName: input.fullName, username: input.username })
        .returning()
      return { user: user!, profile: profile! }
    })
  }

  recordFailedLogin(userId: string, lockUntil: string | null) {
    return this.db
      .update(users)
      .set({ failedLoginCount: sql`${users.failedLoginCount} + 1`, lockedUntil: lockUntil })
      .where(eq(users.id, userId))
  }

  recordSuccessfulLogin(userId: string, newHash?: string) {
    return this.db
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, lastSignInAt: sql`now()`, ...(newHash ? { passwordHash: newHash } : {}) })
      .where(eq(users.id, userId))
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.db.update(users).set({ passwordHash, failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, userId))
  }

  // ── Sessões ────────────────────────────────────────────────────────────────

  createSession(s: { id: string; userId: string; expiresAt: string; ip: string | null; userAgent: string | null }) {
    return this.db.insert(sessions).values(s)
  }

  /** Sessão válida + perfil do dono, numa consulta (caminho quente de toda requisição). */
  async findActiveSession(id: string) {
    const rows = await this.db
      .select({ session: sessions, profile: profiles })
      .from(sessions)
      .innerJoin(profiles, eq(profiles.id, sessions.userId))
      .where(and(eq(sessions.id, id), isNull(sessions.revokedAt), gt(sessions.expiresAt, sql`now()`)))
      .limit(1)
    return rows[0]
  }

  touchSession(id: string, expiresAt: string) {
    return this.db.update(sessions).set({ lastSeenAt: sql`now()`, expiresAt }).where(eq(sessions.id, id))
  }

  revokeSession(id: string) {
    return this.db.update(sessions).set({ revokedAt: sql`now()` }).where(eq(sessions.id, id))
  }

  revokeAllSessions(userId: string, exceptId?: string) {
    const cond = exceptId
      ? and(eq(sessions.userId, userId), isNull(sessions.revokedAt), sql`${sessions.id} <> ${exceptId}`)
      : and(eq(sessions.userId, userId), isNull(sessions.revokedAt))
    return this.db.update(sessions).set({ revokedAt: sql`now()` }).where(cond)
  }

  revokeEverySession() {
    return this.db.update(sessions).set({ revokedAt: sql`now()` }).where(isNull(sessions.revokedAt))
  }

  // ── Redefinição de senha ───────────────────────────────────────────────────

  createResetToken(tokenHash: string, userId: string, expiresAt: string) {
    return this.db.insert(passwordResetTokens).values({ tokenHash, userId, expiresAt })
  }

  /** Consome o token atomicamente: só um uso, dentro da validade. */
  async consumeResetToken(tokenHash: string): Promise<string | null> {
    const [row] = await this.db
      .update(passwordResetTokens)
      .set({ usedAt: sql`now()` })
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, sql`now()`)))
      .returning({ userId: passwordResetTokens.userId })
    return row?.userId ?? null
  }
}
