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
import { AuthService, type ClientInfo } from "./auth.service"
import { clearSessionCookie, setSessionCookie } from "./session.cookie"

const client = (req: Request): ClientInfo => ({ ip: req.ip ?? null, userAgent: req.headers["user-agent"] ?? null })
/**
 * Limite apertado nas rotas de credencial: 10 por minuto por IP.
 * AUTH_THROTTLE_LIMIT permite afrouxar nos testes automatizados.
 */
const authLimit = () => Number(process.env.AUTH_THROTTLE_LIMIT ?? 10)
const AUTH_LIMIT = { default: { limit: authLimit, ttl: 60_000 } }

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post("sign-up")
  async signUp(@Body(new ZodPipe(signUpSchema)) body: SignUpInput, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    const s = await this.auth.signUp(body, client(req))
    setSessionCookie(res, s.token, s.expiresAt, this.env.COOKIE_SECURE)
    return s.response
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @HttpCode(200)
  @Post("sign-in")
  async signIn(@Body(new ZodPipe(signInSchema)) body: SignInInput, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    const s = await this.auth.signIn(body, client(req))
    setSessionCookie(res, s.token, s.expiresAt, this.env.COOKIE_SECURE)
    return s.response
  }

  @HttpCode(204)
  @Post("sign-out")
  async signOut(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.signOut(user.sessionId)
    clearSessionCookie(res, this.env.COOKIE_SECURE)
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser): Promise<SessionResponse> {
    return this.auth.me(user.id)
  }

  @Public()
  @Throttle({ default: { limit: () => Math.ceil(authLimit() / 2), ttl: 60_000 } })
  @HttpCode(202)
  @Post("password/forgot")
  async forgot(@Body(new ZodPipe(requestPasswordResetSchema)) body: RequestPasswordResetInput): Promise<{ ok: true }> {
    await this.auth.requestPasswordReset(body.email)
    return { ok: true }
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @HttpCode(200)
  @Post("password/reset")
  async reset(@Body(new ZodPipe(resetPasswordSchema)) body: ResetPasswordInput): Promise<{ ok: true }> {
    await this.auth.resetPassword(body.token, body.password)
    return { ok: true }
  }

  @Throttle(AUTH_LIMIT)
  @HttpCode(200)
  @Post("password/change")
  async change(@CurrentUser() user: AuthUser, @Body(new ZodPipe(changePasswordSchema)) body: ChangePasswordInput): Promise<{ ok: true }> {
    await this.auth.changePassword(user, body.current_password, body.new_password)
    return { ok: true }
  }
}
