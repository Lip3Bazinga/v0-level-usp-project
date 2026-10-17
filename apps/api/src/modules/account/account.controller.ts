import { Body, Controller, Delete, Get, HttpCode, Inject, Res } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"
import type { Response } from "express"
import { z } from "zod"
import { deleteAccountSchema, type DeleteAccountInput } from "@levelusp/contracts"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { CurrentUser } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { clearSessionCookie } from "../auth/session.cookie"
import { AccountService } from "./account.service"

/** DELETE pode chegar sem corpo: vira {} e a validação acusa a senha ausente. */
const deleteBody = z.preprocess((v) => v ?? {}, deleteAccountSchema)

@ApiTags("account")
@Controller("me")
export class AccountController {
  constructor(
    private readonly account: AccountService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(204)
  @Delete()
  async deleteMe(@CurrentUser() user: AuthUser, @Body(new ZodPipe(deleteBody)) body: DeleteAccountInput, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.account.deleteMe(user, body.password)
    clearSessionCookie(res, this.env.COOKIE_SECURE)
  }

  @Get("export")
  async export(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const data = await this.account.exportMine(user)
    res.setHeader("Content-Disposition", `attachment; filename="levelusp-meus-dados.json"`)
    res.setHeader("Cache-Control", "no-store")
    return data
  }
}
