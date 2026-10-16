import { Injectable } from "@nestjs/common"
import type {
  AdminUpdateUserInput, AnalyticsMetrics, AuditLog, Badge, BadgeInput, BadgeUpdateInput, Lesson, PlatformMetrics,
  PlatformSettings, Profile, RecentActivity, UserDataExport,
} from "@levelusp/contracts"
import { BadRequest, Conflict, Forbidden, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { AccountService } from "../account/account.service"
import { AuditService } from "../audit/audit.service"
import { AuthService } from "../auth/auth.service"
import { AccountRepository } from "../account/account.repository"
import { toProfile } from "../users/profile.mapper"
import { toBadge } from "../users/users.service"
import { dailySeries, MAX_SETTINGS_PER_REQUEST, percentage, selfActionViolation } from "./admin.domain"
import { toLesson } from "./admin.mapper"
import { AdminRepository } from "./admin.repository"
import { isUniqueViolation } from "./pg-errors"

const SERIES_DAYS = 30

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly accounts: AccountService,
    private readonly accountRepo: AccountRepository,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // ── Usuários ───────────────────────────────────────────────────────────────

  async listUsers(): Promise<Profile[]> {
    return (await this.repo.listProfiles()).map(toProfile)
  }

  async updateUser(actor: AuthUser, id: string, input: AdminUpdateUserInput): Promise<Profile> {
    const fields = Object.keys(input).filter((k) => input[k as keyof AdminUpdateUserInput] !== undefined)
    if (!fields.length) throw BadRequest("Nada para atualizar.")
    const violation = selfActionViolation(actor.id, id, { kind: "update", patch: input })
    if (violation) throw Forbidden(violation)

    const before = await this.repo.findProfile(id)
    if (!before) throw NotFound("Usuário")
    if (input.username && (await this.repo.usernameTakenByOther(input.username, id))) {
      throw Conflict("Este nome de usuário já está em uso.", "USERNAME_TAKEN")
    }
    const row = await this.repo.updateProfile(id, {
      ...(input.full_name !== undefined ? { fullName: input.full_name } : {}),
      ...(input.username !== undefined ? { username: input.username } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.suspended !== undefined ? { suspended: input.suspended } : {}),
    })
    if (!row) throw NotFound("Usuário")

    // Suspensão derruba todas as sessões na hora (o guard também recusa perfis suspensos).
    if (input.suspended === true) await this.auth.revokeAllSessions(id)

    const target = before.email
    if (input.role !== undefined && input.role !== before.role) {
      await this.audit.log(actor, "user.role_change", target, { user_id: id, from: before.role, to: input.role }, "warning")
    }
    if (input.suspended !== undefined && input.suspended !== before.suspended) {
      await this.audit.log(actor, input.suspended ? "user.suspend" : "user.unsuspend", target, { user_id: id }, "warning")
    }
    const other = fields.filter((f) => f !== "role" && f !== "suspended")
    if (other.length) await this.audit.log(actor, "user.update", target, { user_id: id, fields: other })
    return toProfile(row)
  }

  async deleteUser(actor: AuthUser, id: string): Promise<void> {
    const violation = selfActionViolation(actor.id, id, { kind: "delete" })
    if (violation) throw Forbidden(violation)
    const target = await this.repo.findProfile(id)
    if (!target) throw NotFound("Usuário")
    await this.accountRepo.deleteUser(id)
    await this.audit.log(actor, "user.delete", target.email, { user_id: id, role: target.role }, "danger")
  }

  async resetProgress(actor: AuthUser, id: string): Promise<void> {
    const target = await this.repo.findProfile(id)
    if (!target) throw NotFound("Usuário")
    await this.repo.resetProgress(id)
    await this.audit.log(actor, "user.reset_progress", target.email, { user_id: id, previous_xp: target.totalXp }, "danger")
  }

  async sendPasswordReset(actor: AuthUser, id: string): Promise<void> {
    const target = await this.repo.findProfile(id)
    if (!target) throw NotFound("Usuário")
    this.rateLimit.consume(`admin.password_reset:${id}`, 5, 60 * 60_000, "Muitos links enviados para esta conta. Aguarde um pouco.")
    await this.auth.requestPasswordReset(target.email)
    await this.audit.log(actor, "user.password_reset", target.email, { user_id: id }, "warning")
  }

  async invite(actor: AuthUser, email: string, fullName?: string): Promise<Profile> {
    this.rateLimit.consume(`admin.invite:${actor.id}`, 50, 60 * 60_000, "Muitos convites seguidos. Aguarde um pouco.")
    try {
      const profile = await this.auth.inviteUser(email, fullName)
      await this.audit.log(actor, "user.invite", email, { user_id: profile.id })
      return toProfile(profile)
    } catch (err) {
      if (isUniqueViolation(err)) throw Conflict("Já existe uma conta com este e-mail.", "EMAIL_TAKEN")
      throw err
    }
  }

  async exportUser(actor: AuthUser, id: string): Promise<UserDataExport> {
    const data = await this.accounts.exportData(id)
    await this.audit.log(actor, "user.export", data.profile.email, { user_id: id }, "warning")
    return data
  }

  async invalidateSessions(actor: AuthUser, userId?: string): Promise<void> {
    if (userId) {
      const target = await this.repo.findProfile(userId)
      if (!target) throw NotFound("Usuário")
      await this.auth.revokeAllSessions(userId)
      await this.audit.log(actor, "sessions.invalidate_user", target.email, { user_id: userId }, "danger")
      return
    }
    // Global: inclui a sessão do próprio admin (todos precisam entrar de novo).
    await this.auth.revokeEverySession()
    await this.audit.log(actor, "sessions.invalidate_all", "todas as sessões", {}, "danger")
  }

  // ── Painel ─────────────────────────────────────────────────────────────────

  metrics(): Promise<PlatformMetrics> {
    return this.repo.metrics()
  }

  async recentActivity(limit = 20): Promise<RecentActivity[]> {
    const rows = await this.repo.recentCompletions(limit)
    return rows.map((r) => ({ id: r.id, user_name: r.userName, lesson_title: r.lessonTitle, xp_earned: r.xpEarned, completed_at: r.completedAt! }))
  }

  async dailyActivity(now = new Date()): Promise<number[]> {
    const rows = await this.repo.completionsPerDay(new Date(now.getTime() - (SERIES_DAYS + 1) * 86_400_000))
    return dailySeries(rows.map((r) => ({ day: r.day, n: r.completions })), SERIES_DAYS, now)
  }

  async analytics(now = new Date()): Promise<AnalyticsMetrics> {
    const [perDay, totals, top, roles] = await Promise.all([
      this.repo.completionsPerDay(new Date(now.getTime() - (SERIES_DAYS + 1) * 86_400_000)),
      this.repo.analyticsTotals(),
      this.repo.topLessons(10),
      this.repo.roleDistribution(),
    ])
    return {
      dailyActiveUsers: dailySeries(perDay.map((r) => ({ day: r.day, n: r.users })), SERIES_DAYS, now),
      completionsByDay: dailySeries(perDay.map((r) => ({ day: r.day, n: r.completions })), SERIES_DAYS, now),
      topLessons: top.map((t) => ({ lesson_id: t.lessonId, title: t.title, completions: t.completions })),
      roleDistribution: roles.map((r) => ({ role: r.role, count: r.count })),
      averageXp: totals.average_xp,
      retention7d: percentage(totals.retention_active, totals.retention_base),
      dau: totals.dau,
      wau: totals.wau,
      mau: totals.mau,
      totalUsers: totals.total_users,
      funnelStarted: totals.started,
      funnelCompleted5: totals.completed5,
      funnelStreak7: totals.streak7,
    }
  }

  async lessons(): Promise<Lesson[]> {
    return (await this.repo.allLessons()).map(toLesson)
  }

  // ── Configurações e auditoria ──────────────────────────────────────────────

  async settings(): Promise<PlatformSettings> {
    const rows = await this.repo.settings()
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  }

  async saveSettings(actor: AuthUser, input: PlatformSettings): Promise<PlatformSettings> {
    const entries = Object.entries(input).map(([key, value]) => ({ key, value }))
    if (entries.length > MAX_SETTINGS_PER_REQUEST) throw BadRequest(`Envie no máximo ${MAX_SETTINGS_PER_REQUEST} configurações por vez.`)
    if (entries.length) {
      await this.repo.upsertSettings(entries)
      await this.audit.log(actor, "settings.update", "platform_settings", { keys: entries.map((e) => e.key) }, "warning")
    }
    return this.settings()
  }

  audits(limit: number): Promise<AuditLog[]> {
    return this.audit.list(limit)
  }

  // ── Badges ─────────────────────────────────────────────────────────────────

  async createBadge(actor: AuthUser, input: BadgeInput): Promise<Badge> {
    if (await this.repo.findBadge(input.id)) throw Conflict("Já existe uma badge com este identificador.", "BADGE_EXISTS")
    try {
      const row = await this.repo.insertBadge({
        id: input.id, name: input.name, description: input.description, icon: input.icon, rarity: input.rarity,
        criteriaType: input.criteria_type, criteriaValue: input.criteria_value, sortOrder: input.sort_order, active: input.active,
      })
      await this.audit.log(actor, "badge.create", row.id, { name: row.name })
      return toBadge(row)
    } catch (err) {
      if (isUniqueViolation(err)) throw Conflict("Já existe uma badge com este identificador.", "BADGE_EXISTS")
      throw err
    }
  }

  async updateBadge(actor: AuthUser, id: string, input: BadgeUpdateInput): Promise<Badge> {
    const patch = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.rarity !== undefined ? { rarity: input.rarity } : {}),
      ...(input.criteria_type !== undefined ? { criteriaType: input.criteria_type } : {}),
      ...(input.criteria_value !== undefined ? { criteriaValue: input.criteria_value } : {}),
      ...(input.sort_order !== undefined ? { sortOrder: input.sort_order } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    }
    if (!Object.keys(patch).length) throw BadRequest("Nada para atualizar.")
    const row = await this.repo.updateBadge(id, patch)
    if (!row) throw NotFound("Badge")
    await this.audit.log(actor, "badge.update", id, { fields: Object.keys(patch) })
    return toBadge(row)
  }

  async deleteBadge(actor: AuthUser, id: string): Promise<void> {
    if (!(await this.repo.deleteBadge(id))) throw NotFound("Badge")
    await this.audit.log(actor, "badge.delete", id, {}, "danger")
  }
}
