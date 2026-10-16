import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Res } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import type { Response } from "express"
import { z } from "zod"
import {
  adminUpdateUserSchema, invalidateSessionsSchema, inviteUserSchema, platformSettingsSchema,
  type AdminUpdateUserInput, type PlatformSettings,
} from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { AdminService } from "./admin.service"

const auditQuery = z.object({ limit: z.coerce.number().int().min(1).max(500).default(50) })
const recentQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) })
/** Corpo opcional: `{}` ou ausente = todas as sessões. */
const invalidateBody = z.preprocess((v) => v ?? {}, invalidateSessionsSchema)

@ApiTags("admin")
@Roles("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ── Usuários ───────────────────────────────────────────────────────────────

  @Get("users")
  users() {
    return this.admin.listUsers()
  }

  @Post("users/invite")
  invite(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(inviteUserSchema)) body: z.infer<typeof inviteUserSchema>) {
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
  async exportUser(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const data = await this.admin.exportUser(actor, id)
    res.setHeader("Content-Disposition", `attachment; filename="usuario-${id}-lgpd.json"`)
    res.setHeader("Cache-Control", "no-store")
    return data
  }

  @HttpCode(204)
  @Post("sessions/invalidate")
  async invalidate(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(invalidateBody)) body: { user_id?: string }): Promise<void> {
    await this.admin.invalidateSessions(actor, body.user_id)
  }

  // ── Painel ─────────────────────────────────────────────────────────────────

  @Get("metrics")
  metrics() {
    return this.admin.metrics()
  }

  @Get("activity/recent")
  recent(@Query(new ZodPipe(recentQuery)) q: { limit: number }) {
    return this.admin.recentActivity(q.limit)
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

  // ── Configurações e auditoria ──────────────────────────────────────────────

  @Get("settings")
  settings() {
    return this.admin.settings()
  }

  @Put("settings")
  saveSettings(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(platformSettingsSchema)) body: PlatformSettings) {
    return this.admin.saveSettings(actor, body)
  }

  @Get("audit")
  audit(@Query(new ZodPipe(auditQuery)) q: { limit: number }) {
    return this.admin.audits(q.limit)
  }
}
