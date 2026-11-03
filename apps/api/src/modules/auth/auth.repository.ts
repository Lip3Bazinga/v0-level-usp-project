import { Injectable } from "@nestjs/common"
import { and, eq, gt, isNull, ne, sql } from "drizzle-orm"
import { passwordResetTokens, profiles, sessions, users } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { MS_PER_SECOND } from "@/common/time/time"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { DbTransaction, ProfileRow, SessionRow, UserRow } from "@levelusp/db"

/** Credencial e perfil a criar no cadastro; `passwordHash` null nos convites (a senha vem pelo link). */
export interface NewAccount {
  email: string
  passwordHash: string | null
  fullName: string
  username: string
}

/** Regra de bloqueio por senhas erradas (ver `auth.domain.ts`). */
export interface LockoutPolicy {
  maxFailures: number
  lockMs: number
}

/** Sessão a gravar; o token em si só existe no cookie. */
export interface NewSession {
  /** SHA-256 do token do cookie. */
  id: string
  userId: string
  expiresAt: string
  ip: string | null
  userAgent: string | null
}

/** Credencial e perfil criados juntos no cadastro. */
export interface CreatedAccount {
  user: UserRow
  profile: ProfileRow
}

/** Sessão ainda válida (não revogada nem expirada) com o perfil do dono. */
export interface ActiveSession {
  session: SessionRow
  profile: ProfileRow
}

/** Token de redefinição de senha (só o hash é gravado) e sua validade. */
export interface NewPasswordToken {
  tokenHash: string
  userId: string
  expiresAt: string
}

/** Credenciais, sessões e tokens de senha. Perfis ficam no UsersRepository. */
@Injectable()
export class AuthRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findUserByEmail(email: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email.toLowerCase()}` })
  }

  findUserById(id: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.id, id) })
  }

  /** Cria credencial + perfil na mesma transação. */
  createUserWithProfile(account: NewAccount): Promise<CreatedAccount> {
    return this.db.transaction(async (tx: DbTransaction) => {
      const user = requireRow(await tx.insert(users).values({ email: account.email, passwordHash: account.passwordHash }).returning(), "users")
      const profile = requireRow(
        await tx.insert(profiles).values({ id: user.id, email: account.email, fullName: account.fullName, username: account.username }).returning(),
        "profiles",
      )
      return { user, profile }
    })
  }

  /**
   * Conta uma senha errada de forma atômica (um único UPDATE, que trava a linha):
   * tentativas em paralelo não leem o mesmo contador e todas contam. Bloqueio
   * vencido recomeça a contagem; bloqueio vigente não é estendido; ao atingir
   * `policy.maxFailures`, bloqueia por `policy.lockMs`.
   */
  async recordFailedLogin(userId: string, policy: LockoutPolicy): Promise<void> {
    const isLockExpired = sql`(${users.lockedUntil} is not null and ${users.lockedUntil} <= now())`
    const nextCount = sql`case when ${isLockExpired} then 1 else ${users.failedLoginCount} + 1 end`
    await this.db
      .update(users)
      .set({
        failedLoginCount: nextCount,
        lockedUntil: sql`case
          when ${users.lockedUntil} > now() then ${users.lockedUntil}
          when ${nextCount} >= ${policy.maxFailures} then now() + make_interval(secs => ${policy.lockMs / MS_PER_SECOND})
          else null end`,
      })
      .where(eq(users.id, userId))
  }

  /** `upgradedHash`: hash legado (bcrypt) trocado por argon2id neste login. */
  async recordSuccessfulLogin(userId: string, upgradedHash?: string): Promise<void> {
    await this.db
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, lastSignInAt: sql`now()`, ...(upgradedHash ? { passwordHash: upgradedHash } : {}) })
      .where(eq(users.id, userId))
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash, failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, userId))
  }

  async createSession(session: NewSession): Promise<void> {
    await this.db.insert(sessions).values(session)
  }

  /** Sessão válida + perfil do dono, numa consulta (caminho quente de toda requisição). */
  async findActiveSession(id: string): Promise<ActiveSession | undefined> {
    const [active] = await this.db
      .select({ session: sessions, profile: profiles })
      .from(sessions)
      .innerJoin(profiles, eq(profiles.id, sessions.userId))
      .where(and(eq(sessions.id, id), isNull(sessions.revokedAt), gt(sessions.expiresAt, sql`now()`)))
      .limit(1)
    return active
  }

  async touchSession(id: string, expiresAt: string): Promise<void> {
    await this.db.update(sessions).set({ lastSeenAt: sql`now()`, expiresAt }).where(eq(sessions.id, id))
  }

  async revokeSession(id: string): Promise<void> {
    await this.db.update(sessions).set({ revokedAt: sql`now()` }).where(eq(sessions.id, id))
  }

  /** `exceptSessionId`: mantém a sessão atual (troca de senha pelo próprio usuário). */
  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined))
  }

  async revokeEverySession(): Promise<void> {
    await this.db.update(sessions).set({ revokedAt: sql`now()` }).where(isNull(sessions.revokedAt))
  }

  async createPasswordToken(token: NewPasswordToken): Promise<void> {
    await this.db.insert(passwordResetTokens).values(token)
  }

  /** Invalida todos os links de senha ainda não usados do usuário (a senha mudou: links antigos morrem). */
  async revokePasswordTokens(userId: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: sql`now()` })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))
  }

  /** Consome o token atomicamente: só um uso, dentro da validade. */
  async consumePasswordToken(tokenHash: string): Promise<string | null> {
    const [consumed] = await this.db
      .update(passwordResetTokens)
      .set({ usedAt: sql`now()` })
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, sql`now()`)))
      .returning({ userId: passwordResetTokens.userId })
    return consumed?.userId ?? null
  }
}
