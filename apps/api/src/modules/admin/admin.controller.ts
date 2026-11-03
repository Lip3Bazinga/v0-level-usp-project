import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Res } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import type { Response } from "express"
import {
  adminUpdateUserSchema, invalidateSessionsSchema, inviteUserSchema, limitQuerySchema, optionalBodySchema, platformSettingsSchema,
  type AdminUpdateUserInput, type InvalidateSessionsInput, type InviteUserInput, type LimitQuery, type PlatformSettings, type Profile, type UserDataExport, type PlatformMetrics, type RecentActivity, type AnalyticsMetrics, type Lesson, type AuditLog, type OkResponse,
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
  listUsers(): Promise<Profile[]> {
    return this.admin.listUsers()
  }

  @Post("users/invite")
  inviteUser(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(inviteUserSchema)) body: InviteUserInput): Promise<Profile> {
    return this.admin.inviteUser(actor, body.email, body.full_name)
  }

  @Patch("users/:id")
  updateUser(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(adminUpdateUserSchema)) body: AdminUpdateUserInput): Promise<Profile> {
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
  async sendPasswordReset(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string): Promise<OkResponse> {
    await this.admin.sendPasswordReset(actor, id)
    return { ok: true }
  }

  @Get("users/:id/export")
  async getUserDataExport(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string, @Res({ passthrough: true }) response: Response): Promise<UserDataExport> {
    const data = await this.admin.getUserDataExport(actor, id)
    response.setHeader("Content-Disposition", `attachment; filename="usuario-${id}-lgpd.json"`)
    response.setHeader("Cache-Control", "no-store")
    return data
  }

  @HttpCode(204)
  @Post("sessions/invalidate")
  async invalidateSessions(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(invalidateSessionsBody)) body: InvalidateSessionsInput): Promise<void> {
    await this.admin.invalidateSessions(actor, body.user_id)
  }

  @Get("metrics")
  getMetrics(): Promise<PlatformMetrics> {
    return this.admin.getMetrics()
  }

  @Get("activity/recent")
  listRecentActivity(@Query(new ZodPipe(recentActivityQuery)) query: LimitQuery): Promise<RecentActivity[]> {
    return this.admin.listRecentActivity(query.limit)
  }

  @Get("activity/daily")
  listDailyActivity(): Promise<number[]> {
    return this.admin.listDailyActivity()
  }

  @Get("analytics")
  getAnalytics(): Promise<AnalyticsMetrics> {
    return this.admin.getAnalytics()
  }

  @Get("lessons")
  listLessons(): Promise<Lesson[]> {
    return this.admin.listLessons()
  }

  @Get("settings")
  getSettings(): Promise<PlatformSettings> {
    return this.admin.getSettings()
  }

  @Put("settings")
  updateSettings(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(platformSettingsSchema)) body: PlatformSettings): Promise<PlatformSettings> {
    return this.admin.updateSettings(actor, body)
  }

  @Get("audit")
  listAudits(@Query(new ZodPipe(auditQuery)) query: LimitQuery): Promise<AuditLog[]> {
    return this.admin.listAudits(query.limit)
  }
}
