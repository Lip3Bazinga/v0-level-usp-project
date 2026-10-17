import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Res } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import type { Response } from "express"
import {
  adminUpdateUserSchema, invalidateSessionsSchema, inviteUserSchema, limitQuerySchema, optionalBodySchema, platformSettingsSchema,
  type AdminUpdateUserInput, type InvalidateSessionsInput, type InviteUserInput, type LimitQuery, type PlatformSettings,
} from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { AdminService } from "./admin.service"

const auditQuery = limitQuerySchema({ defaultLimit: 50, maxLimit: 500 })
const recentActivityQuery = limitQuerySchema({ defaultLimit: 20, maxLimit: 100 })
/** Corpo opcional: `{}` ou ausente = todas as sessões. */
const invalidateSessionsBody = optionalBodySchema(invalidateSessionsSchema)

@ApiTags("admin")
@Roles("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("users")
  users() {
    return this.admin.listUsers()
  }

  @Post("users/invite")
  invite(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(inviteUserSchema)) body: InviteUserInput) {
    return this.admin.invite(actor, body.email, body.full_name)
  }

  @Patch("users/:id")
  updateUser(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(adminUpdateUserSchema)) body: AdminUpdateUserInput) {
    return this.admin.updateUser(actor, id, body)
  }

  @HttpCode(204)
  @Delete("users/:id")
  async deleteUser(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string): Promise<void> {
    await this.admin.deleteUser(actor, id)
  }

  @HttpCode(204)
  @Post("users/:id/reset-progress")
  async resetProgress(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string): Promise<void> {
    await this.admin.resetProgress(actor, id)
  }

  @HttpCode(202)
  @Post("users/:id/password-reset")
  async passwordReset(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string): Promise<{ ok: true }> {
    await this.admin.sendPasswordReset(actor, id)
    return { ok: true }
  }

  @Get("users/:id/export")
  async exportUser(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string, @Res({ passthrough: true }) response: Response) {
    const data = await this.admin.exportUser(actor, id)
    response.setHeader("Content-Disposition", `attachment; filename="usuario-${id}-lgpd.json"`)
    response.setHeader("Cache-Control", "no-store")
    return data
  }

  @HttpCode(204)
  @Post("sessions/invalidate")
  async invalidate(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(invalidateSessionsBody)) body: InvalidateSessionsInput): Promise<void> {
    await this.admin.invalidateSessions(actor, body.user_id)
  }

  @Get("metrics")
  metrics() {
    return this.admin.metrics()
  }

  @Get("activity/recent")
  recent(@Query(new ZodPipe(recentActivityQuery)) query: LimitQuery) {
    return this.admin.recentActivity(query.limit)
  }

  @Get("activity/daily")
  daily() {
    return this.admin.dailyActivity()
  }

  @Get("analytics")
  analytics() {
    return this.admin.analytics()
  }

  @Get("lessons")
  lessons() {
    return this.admin.lessons()
  }

  @Get("settings")
  settings() {
    return this.admin.settings()
  }

  @Put("settings")
  saveSettings(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(platformSettingsSchema)) body: PlatformSettings) {
    return this.admin.saveSettings(actor, body)
  }

  @Get("audit")
  audit(@Query(new ZodPipe(auditQuery)) query: LimitQuery) {
    return this.admin.audits(query.limit)
  }
}
