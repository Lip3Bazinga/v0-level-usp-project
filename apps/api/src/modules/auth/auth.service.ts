import { Inject, Injectable, Logger } from "@nestjs/common"
import { nonEmpty, type SessionResponse, type SignInInput, type SignUpInput } from "@levelusp/contracts"
import type { ProfileRow, UserRow } from "@levelusp/db"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { AppError, BadRequest, Conflict, Forbidden, ServiceUnavailable, Unauthorized } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { MS_PER_DAY, MS_PER_HOUR, isoAfter, MS_PER_MINUTE } from "@/common/time/time"
import { MailService } from "@/infra/mail/mail.service"
import { GamificationService } from "../gamification/gamification.service"
import { toProfile } from "../users/profile.mapper"
import { UsersRepository } from "../users/users.repository"
import { displayNameFromEmail, isLocked, registerFailedLogin, usernameBaseFromEmail, usernameWithSuffix } from "./auth.domain"
import { AuthRepository } from "./auth.repository"
import { PasswordService } from "./password.service"
import type { SessionCookie } from "./session.cookie"
import { hashToken, newToken } from "./tokens"

const RESET_TTL_MINUTES = 60
/** Convites valem mais que um pedido de redefinição comum. */
const INVITE_TTL_HOURS = 72
/** Renova a validade da sessão no máximo a cada 5 min (evita escrita por requisição). */
const SESSION_TOUCH_INTERVAL_MS = 5 * MS_PER_MINUTE
/** Tokens válidos têm 43 caracteres; algo muito maior nem é consultado. */
const MAX_SESSION_TOKEN_LENGTH = 100
const MAX_USER_AGENT_LENGTH = 300
const MAX_USERNAME_ATTEMPTS = 20
const PASSWORD_LINK_PATH = "/redefinir-senha"
const INVITE_MAIL_FAILED_MESSAGE =
  "A conta foi criada, mas o e-mail de convite não pôde ser enviado agora. Peça para a pessoa usar \"Esqueci minha senha\" com este e-mail."

/** De onde veio o login, guardado na sessão para o usuário revisar. */
export interface ClientInfo {
  ip: string | null
  userAgent: string | null
}

/** Sessão criada: o cookie a gravar e o corpo da resposta. */
export interface IssuedSession extends SessionCookie {
  response: SessionResponse
}

/** Mesma resposta para senha errada, conta inexistente e conta bloqueada: não revela quais e-mails existem. */
const invalidCredentials = (): AppError =>
  new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos (ou muitas tentativas: aguarde alguns minutos).")

/** Cadastro, login, sessões e senhas. Senhas em argon2id; tokens só como hash SHA-256 no banco. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly repo: AuthRepository,
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly gamification: GamificationService,
    private readonly mail: MailService,
  ) {}

  /**
   * Cria a conta (com username derivado do e-mail) e já abre a sessão.
   *
   * @throws AppError 403 com o cadastro fechado no ambiente, 409 `EMAIL_TAKEN`.
   */
  async signUp(input: SignUpInput, client: ClientInfo): Promise<IssuedSession> {
    if (!this.env.SIGNUP_ENABLED) throw Forbidden("O cadastro está fechado neste ambiente. Peça um convite.")
    if (await this.repo.findUserByEmail(input.email)) throw Conflict("Já existe uma conta com este e-mail.", "EMAIL_TAKEN")
    const { user } = await this.repo.createUserWithProfile({
      email: input.email,
      passwordHash: await this.passwords.hash(input.password),
      fullName: input.full_name,
      username: await this.uniqueUsername(input.email),
    })
    this.logger.log({ userId: user.id }, "conta criada")
    return this.issueSession(user.id, client)
  }

  /**
   * Autentica e abre a sessão. Senha errada e conta bloqueada respondem igual (sem revelar qual),
   * com custo constante; falhas contam para o bloqueio temporário e hashes bcrypt viram argon2id.
   *
   * @throws AppError 401 `INVALID_CREDENTIALS`, 403 conta suspensa.
   */
  async signIn(input: SignInInput, client: ClientInfo): Promise<IssuedSession> {
    const user = await this.repo.findUserByEmail(input.email)
    const now = Date.now()
    const locked = user ? isLocked(user, now) : false
    const isPasswordValid = await this.passwords.verify(user?.passwordHash, input.password) // custo constante
    if (!user || !isPasswordValid || locked) {
      if (user && !locked) await this.recordFailure(user, now)
      throw invalidCredentials()
    }
    const profile = await this.users.findById(user.id)
    if (!profile) throw invalidCredentials()
    if (profile.suspended) throw Forbidden("Sua conta está suspensa. Fale com a coordenação.")

    const upgradedHash = user.passwordHash && this.passwords.needsRehash(user.passwordHash) ? await this.passwords.hash(input.password) : undefined
    await this.repo.recordSuccessfulLogin(user.id, upgradedHash)
    return this.issueSession(user.id, client)
  }

  /** Revoga a sessão atual. */
  async signOut(sessionId: string): Promise<void> {
    await this.repo.revokeSession(sessionId)
  }

  /** Resolve o cookie de sessão. Chamado pelo guard em toda requisição autenticada. */
  async resolveSession(token: string): Promise<AuthUser | null> {
    if (!token || token.length > MAX_SESSION_TOKEN_LENGTH) return null
    const sessionId = hashToken(token)
    const active = await this.repo.findActiveSession(sessionId)
    if (!active) return null
    const { session, profile } = active
    if (profile.suspended) {
      await this.repo.revokeSession(sessionId)
      return null
    }
    if (Date.now() - new Date(session.lastSeenAt).getTime() > SESSION_TOUCH_INTERVAL_MS) {
      await this.repo.touchSession(sessionId, this.sessionExpiry().toISOString())
    }
    return { id: profile.id, email: profile.email, role: profile.role, fullName: profile.fullName, sessionId }
  }

  /**
   * Perfil da sessão para `GET /auth/me`.
   *
   * @throws AppError 401 se o perfil não existe mais.
   */
  async getSession(userId: string): Promise<SessionResponse> {
    const profile = await this.users.findById(userId)
    if (!profile) throw Unauthorized()
    return { user: toProfile(profile) }
  }

  /** Sempre responde igual, exista ou não a conta (não revela e-mails cadastrados). */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email)
    if (!user) return
    const link = await this.createPasswordLink(user.id, RESET_TTL_MINUTES * MS_PER_MINUTE)
    // Envio fora da requisição: o tempo de resposta não revela se a conta existe
    // e uma falha de SMTP não vira erro 500 para quem pediu.
    void this.mail
      .send({
        to: user.email,
        subject: "LevelUSP — redefinição de senha",
        text: `Recebemos um pedido para redefinir sua senha.\n\nUse este link em até ${RESET_TTL_MINUTES} minutos:\n${link}\n\nSe não foi você, ignore este e-mail.`,
      })
      .catch((error: unknown) => this.logger.error({ err: error, userId: user.id }, "falha ao enviar e-mail de redefinição"))
  }

  /**
   * Troca a senha pelo link (token de uso único) e encerra todas as sessões.
   *
   * @throws AppError 400 `INVALID_TOKEN` (inexistente, usado ou expirado).
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await this.repo.consumePasswordToken(hashToken(token))
    if (!userId) throw BadRequest("Link inválido ou expirado. Peça um novo.", "INVALID_TOKEN")
    await this.repo.updatePassword(userId, await this.passwords.hash(password))
    await this.repo.revokeAllSessions(userId)
  }

  /**
   * Troca a senha confirmando a atual; as outras sessões são encerradas, a atual continua.
   *
   * @throws AppError 400 `INVALID_PASSWORD`.
   */
  async changePassword(user: AuthUser, currentPassword: string, newPassword: string): Promise<void> {
    const credentials = await this.repo.findUserById(user.id)
    if (!(await this.passwords.verify(credentials?.passwordHash, currentPassword))) {
      throw new AppError(400, "INVALID_PASSWORD", "Senha atual incorreta.")
    }
    await this.repo.updatePassword(user.id, await this.passwords.hash(newPassword))
    await this.repo.revokeAllSessions(user.id, user.sessionId)
  }

  /**
   * Convite administrativo: cria a conta SEM senha e envia um link para a
   * pessoa definir a senha (mesmo fluxo/tokens da redefinição).
   */
  async inviteUser(email: string, fullName?: string): Promise<ProfileRow> {
    if (await this.repo.findUserByEmail(email)) throw Conflict("Já existe uma conta com este e-mail.", "EMAIL_TAKEN")
    const { user, profile } = await this.repo.createUserWithProfile({
      email,
      passwordHash: null,
      fullName: nonEmpty(fullName?.trim()) ?? displayNameFromEmail(email),
      username: await this.uniqueUsername(email),
    })
    const link = await this.createPasswordLink(user.id, INVITE_TTL_HOURS * MS_PER_HOUR)
    this.logger.log({ userId: user.id }, "conta criada por convite")
    try {
      await this.mail.send({
        to: user.email,
        subject: "LevelUSP — você foi convidado(a)",
        text: `Você foi convidado(a) para o LevelUSP.\n\nDefina sua senha em até ${INVITE_TTL_HOURS} horas:\n${link}\n\nSe não esperava este convite, ignore este e-mail.`,
      })
    } catch (error) {
      // O detalhe do SMTP (host, resposta do servidor) fica só no log.
      this.logger.error({ err: error, userId: user.id }, "falha ao enviar e-mail de convite")
      throw ServiceUnavailable(INVITE_MAIL_FAILED_MESSAGE, "MAIL_UNAVAILABLE")
    }
    return profile
  }

  /** Encerra todas as sessões de um usuário (suspensão, ação administrativa). */
  revokeAllSessions(userId: string): Promise<void> {
    return this.repo.revokeAllSessions(userId)
  }

  /** Encerra as sessões de todos os usuários. */
  revokeEverySession(): Promise<void> {
    return this.repo.revokeEverySession()
  }

  private async uniqueUsername(email: string): Promise<string> {
    const base = usernameBaseFromEmail(email)
    let candidate = base
    for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS && (await this.users.isUsernameTaken(candidate)); attempt++) {
      candidate = usernameWithSuffix(base)
    }
    return candidate
  }

  private async recordFailure(user: UserRow, now: number): Promise<void> {
    const { failures, lockedUntil } = registerFailedLogin(user, now)
    await this.repo.recordFailedLogin(user.id, failures, lockedUntil)
  }

  /** Link de definição de senha (redefinição ou convite) com token de uso único. */
  private async createPasswordLink(userId: string, ttlMs: number): Promise<string> {
    const token = newToken()
    await this.repo.createPasswordToken({ tokenHash: hashToken(token), userId, expiresAt: isoAfter(ttlMs) })
    return `${this.env.PUBLIC_BASE_URL}${PASSWORD_LINK_PATH}?token=${encodeURIComponent(token)}`
  }

  private sessionExpiry(): Date {
    return new Date(Date.now() + this.env.SESSION_TTL_DAYS * MS_PER_DAY)
  }

  private async issueSession(userId: string, client: ClientInfo): Promise<IssuedSession> {
    const token = newToken()
    const expiresAt = this.sessionExpiry()
    await this.repo.createSession({
      id: hashToken(token),
      userId,
      expiresAt: expiresAt.toISOString(),
      ip: client.ip,
      userAgent: client.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
    })
    const streak = await this.gamification.touchStreak(userId)
    const response = await this.getSession(userId)
    // A animação de sequência só aparece quando a sequência mudou (primeiro acesso do dia).
    return { token, expiresAt, response: { ...response, ...(streak.increased ? { streak } : {}) } }
  }
}
