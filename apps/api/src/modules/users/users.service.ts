import { Injectable } from "@nestjs/common"
import type { ActivityDay, Badge, Profile, PublicProfile, UpdateMyProfileInput, UserBadge } from "@levelusp/contracts"
import { Conflict, NotFound } from "@/common/errors/app-error"
import { saoPauloDate } from "../gamification/gamification.domain"
import { toProfile, toPublicProfile } from "./profile.mapper"
import { UsersRepository } from "./users.repository"

type BadgeRow = Awaited<ReturnType<UsersRepository["allBadges"]>>[number]

export function toBadge(b: BadgeRow): Badge {
  return {
    id: b.id, name: b.name, description: b.description, icon: b.icon, rarity: b.rarity,
    criteria_type: b.criteriaType, criteria_value: b.criteriaValue, sort_order: b.sortOrder, active: b.active, created_at: b.createdAt,
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async updateMe(userId: string, input: UpdateMyProfileInput): Promise<Profile> {
    if (input.username && (await this.repo.usernameTakenByOther(input.username, userId))) {
      throw Conflict("Este nome de usuário já está em uso.", "USERNAME_TAKEN")
    }
    const row = await this.repo.update(userId, {
      ...(input.full_name !== undefined ? { fullName: input.full_name } : {}),
      ...(input.username !== undefined ? { username: input.username } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.avatar_url !== undefined ? { avatarUrl: input.avatar_url } : {}),
    })
    if (!row) throw NotFound("Perfil")
    return toProfile(row)
  }

  async byUsername(username: string): Promise<PublicProfile> {
    const row = await this.repo.findByUsername(username)
    if (!row || row.suspended) throw NotFound("Perfil")
    return toPublicProfile(row)
  }

  async leaderboard(limit: number): Promise<PublicProfile[]> {
    return (await this.repo.leaderboard(limit)).map(toPublicProfile)
  }

  /** 365 dias, do mais antigo ao mais recente, sem buracos. */
  async activity(userId: string, now = new Date()): Promise<ActivityDay[]> {
    const since = new Date(now.getTime() - 365 * 86_400_000)
    const rows = await this.repo.activity(userId, since)
    const byDay = new Map(rows.map((r) => [r.day, r]))
    const days: ActivityDay[] = []
    for (let i = 364; i >= 0; i--) {
      const key = saoPauloDate(new Date(now.getTime() - i * 86_400_000))
      const r = byDay.get(key)
      days.push({ date: key, xp: r?.xp ?? 0, activities: r?.n ?? 0 })
    }
    return days
  }

  async badges(includeInactive = false): Promise<Badge[]> {
    return (await this.repo.allBadges(includeInactive)).map(toBadge)
  }

  async userBadges(userId: string): Promise<UserBadge[]> {
    return (await this.repo.userBadges(userId)).map((b) => ({ user_id: b.userId, badge_id: b.badgeId, earned_at: b.earnedAt }))
  }
}
