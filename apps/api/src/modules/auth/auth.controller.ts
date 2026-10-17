import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"
import type { Request, Response } from "express"
import {
  changePasswordSchema, requestPasswordResetSchema, resetPasswordSchema, signInSchema, signUpSchema,
  type ChangePasswordInput, type RequestPasswordResetInput, type ResetPasswordInput, type SessionResponse,
  type SignInInput, type SignUpInput,
} from "@levelusp/contracts"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { CurrentUser, Public } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { IP_THROTTLE } from "@/common/rate-limit/rate-limit.policies"
import { AuthService, type ClientInfo, type IssuedSession } from "./auth.service"
import { clearSessionCookie, setSessionCookie } from "./session.cookie"

/** AUTH_THROTTLE_LIMIT permite afrouxar o limite por IP nos testes automatizados. */
const credentialThrottleLimit = () => Number(process.env.AUTH_THROTTLE_LIMIT ?? IP_THROTTLE.credentialLimit)
const CREDENTIAL_THROTTLE = { default: { limit: credentialThrottleLimit, ttl: IP_THROTTLE.windowMs } }
/** "Esqueci a senha" dispara e-mail: metade do limite das demais rotas de credencial. */
const PASSWORD_FORGOT_THROTTLE = { default: { limit: () => Math.ceil(credentialThrottleLimit() / 2), ttl: IP_THROTTLE.windowMs } }

const clientInfo = (request: Request): ClientInfo => ({ ip: request.ip ?? null, userAgent: request.headers["user-agent"] ?? null })

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post("sign-up")
  async signUp(@Body(new ZodPipe(signUpSchema)) body: SignUpInput, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<SessionResponse> {
    return this.startSession(response, await this.auth.signUp(body, clientInfo(request)))
  }

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @HttpCode(200)
  @Post("sign-in")
  async signIn(@Body(new ZodPipe(signInSchema)) body: SignInInput, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<SessionResponse> {
    return this.startSession(response, await this.auth.signIn(body, clientInfo(request)))
  }

  @HttpCode(204)
  @Post("sign-out")
  async signOut(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.signOut(user.sessionId)
    clearSessionCookie(response, this.env.COOKIE_SECURE)
  }

  @Get("me")
  getSession(@CurrentUser() user: AuthUser): Promise<SessionResponse> {
    return this.auth.getSession(user.id)
  }

  @Public()
  @Throttle(PASSWORD_FORGOT_THROTTLE)
  @HttpCode(202)
  @Post("password/forgot")
  async requestPasswordReset(@Body(new ZodPipe(requestPasswordResetSchema)) body: RequestPasswordResetInput): Promise<{ ok: true }> {
    await this.auth.requestPasswordReset(body.email)
    return { ok: true }
  }

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @HttpCode(200)
  @Post("password/reset")
  async resetPassword(@Body(new ZodPipe(resetPasswordSchema)) body: ResetPasswordInput): Promise<{ ok: true }> {
    await this.auth.resetPassword(body.token, body.password)
    return { ok: true }
  }

  @Throttle(CREDENTIAL_THROTTLE)
  @HttpCode(200)
  @Post("password/change")
  async changePassword(@CurrentUser() user: AuthUser, @Body(new ZodPipe(changePasswordSchema)) body: ChangePasswordInput): Promise<{ ok: true }> {
    await this.auth.changePassword(user, body.current_password, body.new_password)
    return { ok: true }
  }

  private startSession(response: Response, session: IssuedSession): SessionResponse {
    setSessionCookie(response, session, this.env.COOKIE_SECURE)
    return session.response
  }
}
