import { Body, Controller, Delete, Get, HttpCode, Inject, Res } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"
import type { Response } from "express"
import { deleteAccountSchema, optionalBodySchema, type DeleteAccountInput } from "@levelusp/contracts"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { CurrentUser } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { IP_THROTTLE } from "@/common/rate-limit/rate-limit.policies"
import { clearSessionCookie } from "../auth/session.cookie"
import { AccountService } from "./account.service"

/** DELETE pode chegar sem corpo: vira {} e a validação acusa a senha ausente. */
const deleteAccountBody = optionalBodySchema(deleteAccountSchema)

@ApiTags("account")
@Controller("me")
export class AccountController {
  constructor(
    private readonly account: AccountService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Throttle({ default: { limit: IP_THROTTLE.accountDeletionLimit, ttl: IP_THROTTLE.windowMs } })
  @HttpCode(204)
  @Delete()
  async deleteMyAccount(@CurrentUser() user: AuthUser, @Body(new ZodPipe(deleteAccountBody)) body: DeleteAccountInput, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.account.deleteMyAccount(user, body.password)
    clearSessionCookie(response, this.env.COOKIE_SECURE)
  }

  @Get("export")
  async getMyDataExport(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) response: Response) {
    const data = await this.account.getMyDataExport(user)
    response.setHeader("Content-Disposition", `attachment; filename="levelusp-meus-dados.json"`)
    response.setHeader("Cache-Control", "no-store")
    return data
  }
}
