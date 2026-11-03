import { Injectable } from "@nestjs/common"
import type {
  AdminUpdateUserInput, AnalyticsMetrics, AuditLog, Badge, BadgeInput, BadgeUpdateInput, Lesson, PlatformMetrics,
  PlatformSettings, Profile, RecentActivity, UserDataExport,
} from "@levelusp/contracts"
import type { BadgeInsert, ProfileInsert, ProfileRow } from "@levelusp/db"
import { isUniqueViolation } from "@/common/database/pg-errors"
import { BadRequest, Conflict, Forbidden, NotFound, type AppError } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { buildPatch, presentFields, type PatchMapping } from "@/common/mapping/patch"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { MS_PER_DAY } from "@/common/time/time"
import { AccountRepository } from "../account/account.repository"
import { AccountService } from "../account/account.service"
import { AuditService } from "../audit/audit.service"
import { AuthService } from "../auth/auth.service"
import { toLesson } from "../catalog/catalog.mapper"
import { toBadge } from "../gamification/badge.mapper"
import { toProfile } from "../users/profile.mapper"
import { UsersRepository } from "../users/users.repository"
import { dailySeries, MAX_SETTINGS_PER_REQUEST, selfActionViolation } from "./admin.domain"
import { toAnalyticsTotals, toRecentActivity, toTopLesson } from "./admin.mapper"
import { AdminRepository } from "./admin.repository"

/** Séries diárias do painel cobrem 30 dias. */
const SERIES_DAYS = 30
const TOP_LESSONS_LIMIT = 10
/** Campos com trilha de auditoria própria (mudam o acesso da pessoa). */
const ACCESS_FIELDS = new Set(["role", "suspended"])

const USER_PATCH: PatchMapping<AdminUpdateUserInput, ProfileInsert> = {
  full_name: (fullName) => ({ fullName }),
  username: (username) => ({ username }),
  role: (role) => ({ role }),
  suspended: (suspended) => ({ suspended }),
  bio: (bio) => ({ bio }),
}

const BADGE_PATCH: PatchMapping<BadgeUpdateInput, BadgeInsert> = {
  name: (name) => ({ name }),
  description: (description) => ({ description }),
  icon: (icon) => ({ icon }),
  rarity: (rarity) => ({ rarity }),
  criteria_type: (criteriaType) => ({ criteriaType }),
  criteria_value: (criteriaValue) => ({ criteriaValue }),
  sort_order: (sortOrder) => ({ sortOrder }),
  active: (active) => ({ active }),
}

interface UserUpdateAudit {
  before: ProfileRow
  input: AdminUpdateUserInput
  /** Campos enviados no PATCH (já sem os `undefined`). */
  fields: string[]
}

const badgeExists = (): AppError => Conflict("Já existe uma badge com este identificador.", "BADGE_EXISTS")

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly users: UsersRepository,
    private readonly accounts: AccountService,
    private readonly accountRepo: AccountRepository,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async listUsers(): Promise<Profile[]> {
    return (await this.users.list()).map(toProfile)
  }

  async updateUser(actor: AuthUser, id: string, input: AdminUpdateUserInput): Promise<Profile> {
    const fields = presentFields(input)
    if (!fields.length) throw BadRequest("Nada para atualizar.")
    const violation = selfActionViolation(actor.id, id, { kind: "update", patch: input })
    if (violation) throw Forbidden(violation)

    const before = await this.findUser(id)
    if (input.username && (await this.users.isUsernameTaken(input.username, id))) {
      throw Conflict("Este nome de usuário já está em uso.", "USERNAME_TAKEN")
    }
    const updated = await this.users.update(id, buildPatch(input, USER_PATCH))
    if (!updated) throw NotFound("Usuário")

    // Suspensão derruba todas as sessões na hora (o guard também recusa perfis suspensos).
    if (input.suspended === true) await this.auth.revokeAllSessions(id)
    await this.auditUserUpdate(actor, { before, input, fields })
    return toProfile(updated)
  }

  async deleteUser(actor: AuthUser, id: string): Promise<void> {
    const violation = selfActionViolation(actor.id, id, { kind: "delete" })
    if (violation) throw Forbidden(violation)
    const target = await this.findUser(id)
    await this.accountRepo.delete(id)
    await this.audit.log(actor, "user.delete", target.email, { user_id: id, role: target.role }, "danger")
  }

  async resetProgress(actor: AuthUser, id: string): Promise<void> {
    const target = await this.findUser(id)
    await this.repo.resetProgress(id)
    await this.audit.log(actor, "user.reset_progress", target.email, { user_id: id, previous_xp: target.totalXp }, "danger")
  }

  async sendPasswordReset(actor: AuthUser, id: string): Promise<void> {
    const target = await this.findUser(id)
    this.rateLimit.consume(RATE_LIMITS.adminPasswordReset, id)
    await this.auth.requestPasswordReset(target.email)
    await this.audit.log(actor, "user.password_reset", target.email, { user_id: id }, "warning")
  }

  async inviteUser(actor: AuthUser, email: string, fullName?: string): Promise<Profile> {
    this.rateLimit.consume(RATE_LIMITS.adminInvite, actor.id)
    try {
      const profile = await this.auth.inviteUser(email, fullName)
      await this.audit.log(actor, "user.invite", email, { user_id: profile.id })
      return toProfile(profile)
    } catch (error) {
      if (isUniqueViolation(error)) throw Conflict("Já existe uma conta com este e-mail.", "EMAIL_TAKEN")
      throw error
    }
  }

  async getUserDataExport(actor: AuthUser, id: string): Promise<UserDataExport> {
    const data = await this.accounts.getDataExport(id)
    await this.audit.log(actor, "user.export", data.profile.email, { user_id: id }, "warning")
    return data
  }

  async invalidateSessions(actor: AuthUser, userId?: string): Promise<void> {
    if (userId) {
      const target = await this.findUser(userId)
      await this.auth.revokeAllSessions(userId)
      await this.audit.log(actor, "sessions.invalidate_user", target.email, { user_id: userId }, "danger")
      return
    }
    // Global: inclui a sessão do próprio admin (todos precisam entrar de novo).
    await this.auth.revokeEverySession()
    await this.audit.log(actor, "sessions.invalidate_all", "todas as sessões", {}, "danger")
  }

  getMetrics(): Promise<PlatformMetrics> {
    return this.repo.getMetrics()
  }

  async listRecentActivity(limit = 20): Promise<RecentActivity[]> {
    return (await this.repo.listRecentCompletions(limit)).flatMap(toRecentActivity)
  }

  async listDailyActivity(now = new Date()): Promise<number[]> {
    const perDay = await this.repo.listCompletionsPerDay(seriesStart(now))
    return dailySeries(perDay.map(({ day, completions }) => ({ day, count: completions })), SERIES_DAYS, now)
  }

  async getAnalytics(now = new Date()): Promise<AnalyticsMetrics> {
    const [perDay, totals, topLessons, roles] = await Promise.all([
      this.repo.listCompletionsPerDay(seriesStart(now)),
      this.repo.getAnalyticsTotals(),
      this.repo.listTopLessons(TOP_LESSONS_LIMIT),
      this.repo.listRoleDistribution(),
    ])
    return {
      dailyActiveUsers: dailySeries(perDay.map(({ day, users }) => ({ day, count: users })), SERIES_DAYS, now),
      completionsByDay: dailySeries(perDay.map(({ day, completions }) => ({ day, count: completions })), SERIES_DAYS, now),
      topLessons: topLessons.map(toTopLesson),
      roleDistribution: roles.map(({ role, count }) => ({ role, count })),
      ...toAnalyticsTotals(totals),
    }
  }

  async listLessons(): Promise<Lesson[]> {
    return (await this.repo.listLessons()).map(toLesson)
  }

  async getSettings(): Promise<PlatformSettings> {
    const settings = await this.repo.listSettings()
    return Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  }

  async updateSettings(actor: AuthUser, input: PlatformSettings): Promise<PlatformSettings> {
    const entries = Object.entries(input).map(([key, value]) => ({ key, value }))
    if (entries.length > MAX_SETTINGS_PER_REQUEST) throw BadRequest(`Envie no máximo ${MAX_SETTINGS_PER_REQUEST} configurações por vez.`)
    if (entries.length) {
      await this.repo.upsertSettings(entries)
      await this.audit.log(actor, "settings.update", "platform_settings", { keys: entries.map((entry) => entry.key) }, "warning")
    }
    return this.getSettings()
  }

  listAudits(limit: number): Promise<AuditLog[]> {
    return this.audit.list(limit)
  }

  async createBadge(actor: AuthUser, input: BadgeInput): Promise<Badge> {
    if (await this.repo.findBadge(input.id)) throw badgeExists()
    try {
      const badge = await this.repo.createBadge({
        id: input.id,
        name: input.name,
        description: input.description,
        icon: input.icon,
        rarity: input.rarity,
        criteriaType: input.criteria_type,
        criteriaValue: input.criteria_value,
        sortOrder: input.sort_order,
        active: input.active,
      })
      await this.audit.log(actor, "badge.create", badge.id, { name: badge.name })
      return toBadge(badge)
    } catch (error) {
      if (isUniqueViolation(error)) throw badgeExists()
      throw error
    }
  }

  async updateBadge(actor: AuthUser, id: string, input: BadgeUpdateInput): Promise<Badge> {
    const patch = buildPatch(input, BADGE_PATCH)
    if (!Object.keys(patch).length) throw BadRequest("Nada para atualizar.")
    const badge = await this.repo.updateBadge(id, patch)
    if (!badge) throw NotFound("Badge")
    await this.audit.log(actor, "badge.update", id, { fields: Object.keys(patch) })
    return toBadge(badge)
  }

  async deleteBadge(actor: AuthUser, id: string): Promise<void> {
    if (!(await this.repo.deleteBadge(id))) throw NotFound("Badge")
    await this.audit.log(actor, "badge.delete", id, {}, "danger")
  }

  private async findUser(id: string): Promise<ProfileRow> {
    const profile = await this.users.findById(id)
    if (!profile) throw NotFound("Usuário")
    return profile
  }

  /** Papel e suspensão têm entradas próprias (severidade maior); o resto vai junto em "user.update". */
  private async auditUserUpdate(actor: AuthUser, { before, input, fields }: UserUpdateAudit): Promise<void> {
    const target = before.email
    if (input.role !== undefined && input.role !== before.role) {
      await this.audit.log(actor, "user.role_change", target, { user_id: before.id, from: before.role, to: input.role }, "warning")
    }
    if (input.suspended !== undefined && input.suspended !== before.suspended) {
      await this.audit.log(actor, input.suspended ? "user.suspend" : "user.unsuspend", target, { user_id: before.id }, "warning")
    }
    const otherFields = fields.filter((field) => !ACCESS_FIELDS.has(field))
    if (otherFields.length) await this.audit.log(actor, "user.update", target, { user_id: before.id, fields: otherFields })
  }
}

/** Um dia de folga: garante que o dia mais antigo da série (no fuso de São Paulo) venha inteiro. */
function seriesStart(now: Date): Date {
  return new Date(now.getTime() - (SERIES_DAYS + 1) * MS_PER_DAY)
}
