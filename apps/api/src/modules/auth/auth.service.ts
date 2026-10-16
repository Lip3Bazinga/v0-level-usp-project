import { Inject, Injectable, Logger } from "@nestjs/common"
import type { SessionResponse, SignInInput, SignUpInput } from "@levelusp/contracts"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { AppError, BadRequest, Conflict, Forbidden, Unauthorized } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { MailService } from "@/infra/mail/mail.service"
import { GamificationService } from "../gamification/gamification.service"
import { toProfile } from "../users/profile.mapper"
import { AuthRepository } from "./auth.repository"
import { PasswordService } from "./password.service"
import { hashToken, newToken } from "./tokens"

const MAX_FAILED_LOGINS = 10
const LOCK_MINUTES = 15
const RESET_TTL_MINUTES = 60
/** Convites valem mais que um pedido de redefinição comum: 72 h. */
const INVITE_TTL_MINUTES = 72 * 60
/** Renova a validade da sessão no máximo a cada 5 min (evita escrita por requisição). */
const TOUCH_INTERVAL_MS = 5 * 60_000

export interface ClientInfo {
  ip: string | null
  userAgent: string | null
}

export interface IssuedSession {
  token: string
  expiresAt: Date
  response: SessionResponse
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly repo: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly gamification: GamificationService,
    private readonly mail: MailService,
  ) {}

  async signUp(input: SignUpInput, client: ClientInfo): Promise<IssuedSession> {
    if (!this.env.SIGNUP_ENABLED) throw Forbidden("O cadastro está fechado neste ambiente. Peça um convite.")
    if (await this.repo.findUserByEmail(input.email)) throw Conflict("Já existe uma conta com este e-mail.", "EMAIL_TAKEN")
    const username = await this.uniqueUsername(input.email)
    const { user } = await this.repo.createUserWithProfile({
      email: input.email,
      passwordHash: await this.passwords.hash(input.password),
      fullName: input.full_name,
      username,
    })
    this.logger.log({ userId: user.id }, "conta criada")
    return this.issueSession(user.id, client)
  }

  async signIn(input: SignInInput, client: ClientInfo): Promise<IssuedSession> {
    const user = await this.repo.findUserByEmail(input.email)
    const invalid = new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.")

    if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new AppError(429, "ACCOUNT_LOCKED", "Muitas tentativas. Tente novamente em alguns minutos.")
    }
    const ok = await this.passwords.verify(user?.passwordHash, input.password)
    if (!user || !ok) {
      if (user) {
        const lock = user.failedLoginCount + 1 >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null
        await this.repo.recordFailedLogin(user.id, lock)
      }
      throw invalid
    }
    const profile = await this.repo.findProfile(user.id)
    if (!profile) throw invalid
    if (profile.suspended) throw Forbidden("Sua conta está suspensa. Fale com a coordenação.")

    const rehash = this.passwords.needsRehash(user.passwordHash!) ? await this.passwords.hash(input.password) : undefined
    await this.repo.recordSuccessfulLogin(user.id, rehash)
    return this.issueSession(user.id, client)
  }

  async signOut(sessionId: string): Promise<void> {
    await this.repo.revokeSession(sessionId)
  }

  /** Resolve o cookie de sessão. Chamado pelo guard em toda requisição autenticada. */
  async resolveSession(token: string): Promise<AuthUser | null> {
    if (!token || token.length > 100) return null
    const id = hashToken(token)
    const row = await this.repo.findActiveSession(id)
    if (!row) return null
    const { session, profile } = row
    if (profile.suspended) {
      await this.repo.revokeSession(id)
      return null
    }
    if (Date.now() - new Date(session.lastSeenAt).getTime() > TOUCH_INTERVAL_MS) {
      await this.repo.touchSession(id, this.expiry().toISOString())
    }
    return { id: profile.id, email: profile.email, role: profile.role, fullName: profile.fullName, sessionId: id }
  }

  async me(userId: string): Promise<SessionResponse> {
    const profile = await this.repo.findProfile(userId)
    if (!profile) throw Unauthorized()
    return { user: toProfile(profile) }
  }

  /** Sempre responde igual, exista ou não a conta (não revela e-mails cadastrados). */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email)
    if (!user) return
    const token = newToken()
    await this.repo.createResetToken(hashToken(token), user.id, new Date(Date.now() + RESET_TTL_MINUTES * 60_000).toISOString())
    const link = `${this.env.APP_ORIGIN}/redefinir-senha?token=${encodeURIComponent(token)}`
    await this.mail.send({
      to: user.email,
      subject: "LevelUSP — redefinição de senha",
      text: `Recebemos um pedido para redefinir sua senha.\n\nUse este link em até ${RESET_TTL_MINUTES} minutos:\n${link}\n\nSe não foi você, ignore este e-mail.`,
    })
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await this.repo.consumeResetToken(hashToken(token))
    if (!userId) throw BadRequest("Link inválido ou expirado. Peça um novo.", "INVALID_TOKEN")
    await this.repo.updatePassword(userId, await this.passwords.hash(password))
    await this.repo.revokeAllSessions(userId)
  }

  async changePassword(user: AuthUser, current: string, next: string): Promise<void> {
    const creds = await this.repo.findUserById(user.id)
    if (!(await this.passwords.verify(creds?.passwordHash, current))) {
      throw new AppError(400, "INVALID_PASSWORD", "Senha atual incorreta.")
    }
    await this.repo.updatePassword(user.id, await this.passwords.hash(next))
    await this.repo.revokeAllSessions(user.id, user.sessionId)
  }

  /**
   * Convite administrativo: cria a conta SEM senha e envia um link para a
   * pessoa definir a senha (mesmo fluxo/tokens da redefinição).
   */
  async inviteUser(email: string, fullName?: string) {
    if (await this.repo.findUserByEmail(email)) throw Conflict("Já existe uma conta com este e-mail.", "EMAIL_TAKEN")
    const username = await this.uniqueUsername(email)
    const { user, profile } = await this.repo.createUserWithProfile({
      email,
      passwordHash: null,
      fullName: fullName?.trim() || (email.split("@")[0] ?? ""),
      username,
    })
    const token = newToken()
    await this.repo.createResetToken(hashToken(token), user.id, new Date(Date.now() + INVITE_TTL_MINUTES * 60_000).toISOString())
    const link = `${this.env.APP_ORIGIN}/redefinir-senha?token=${encodeURIComponent(token)}`
    await this.mail.send({
      to: user.email,
      subject: "LevelUSP — você foi convidado(a)",
      text: `Você foi convidado(a) para o LevelUSP.\n\nDefina sua senha em até ${INVITE_TTL_MINUTES / 60} horas:\n${link}\n\nSe não esperava este convite, ignore este e-mail.`,
    })
    this.logger.log({ userId: user.id }, "conta criada por convite")
    return profile
  }

  revokeAllSessions(userId: string) {
    return this.repo.revokeAllSessions(userId)
  }

  revokeEverySession() {
    return this.repo.revokeEverySession()
  }

  /** Gera o username a partir do e-mail, como fazia o gatilho handle_new_user. */
  async uniqueUsername(email: string): Promise<string> {
    const base = (email.split("@")[0] ?? "aluno").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 24).padEnd(3, "_")
    let candidate = base
    for (let i = 0; i < 20 && (await this.repo.usernameTaken(candidate)); i++) {
      candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`
    }
    return candidate
  }

  private expiry(): Date {
    return new Date(Date.now() + this.env.SESSION_TTL_DAYS * 86_400_000)
  }

  private async issueSession(userId: string, client: ClientInfo): Promise<IssuedSession> {
    const token = newToken()
    const expiresAt = this.expiry()
    await this.repo.createSession({
      id: hashToken(token),
      userId,
      expiresAt: expiresAt.toISOString(),
      ip: client.ip,
      userAgent: client.userAgent?.slice(0, 300) ?? null,
    })
    const streak = await this.gamification.touchStreak(userId)
    const response = await this.me(userId)
    // A animação de sequência só aparece quando a sequência mudou (primeiro acesso do dia).
    return { token, expiresAt, response: { ...response, ...(streak.increased ? { streak } : {}) } }
  }
}
