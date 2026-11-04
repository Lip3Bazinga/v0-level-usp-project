import { Injectable } from "@nestjs/common"
import type { ActivityDay, Badge, Profile, PublicProfile, UpdateMyProfileInput, UserBadge } from "@levelusp/contracts"
import type { ProfileInsert } from "@levelusp/db"
import { Conflict, NotFound } from "@/common/errors/app-error"
import { buildPatch, type PatchMapping } from "@/common/mapping/patch"
import { MS_PER_DAY, saoPauloDate } from "@/common/time/time"
import { StorageService } from "@/infra/storage/storage.service"
import { toBadge, toUserBadge } from "../gamification/badge.mapper"
import { toProfile, toPublicProfile } from "./profile.mapper"
import { UsersRepository } from "./users.repository"

/** O mapa de atividade do perfil cobre um ano. */
const ACTIVITY_DAYS = 365

const MY_PROFILE_PATCH: PatchMapping<UpdateMyProfileInput, ProfileInsert> = {
  full_name: (fullName) => ({ fullName }),
  username: (username) => ({ username }),
  bio: (bio) => ({ bio }),
  avatar_url: (avatarUrl) => ({ avatarUrl }),
}

/** Perfis públicos, edição do próprio perfil, ranking, atividade e badges. */
@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly storage: StorageService,
  ) {}

  /**
   * Atualiza o próprio perfil; trocar o avatar apaga a imagem antiga enviada pelo usuário.
   *
   * @throws AppError 409 `USERNAME_TAKEN`, 400 avatar externo/inválido, 403 avatar de outra pessoa, 404 perfil inexistente.
   */
  async updateMyProfile(userId: string, input: UpdateMyProfileInput): Promise<Profile> {
    if (input.username && (await this.repo.isUsernameTaken(input.username, userId))) {
      throw Conflict("Este nome de usuário já está em uso.", "USERNAME_TAKEN")
    }
    const isChangingAvatar = input.avatar_url !== undefined
    const previousProfile = isChangingAvatar ? await this.repo.findById(userId) : undefined
    if (isChangingAvatar) await this.storage.assertOwnUpload(input.avatar_url, userId)
    const profile = await this.repo.update(userId, buildPatch(input, MY_PROFILE_PATCH))
    if (!profile) throw NotFound("Perfil")
    // Avatar trocado: remove o arquivo antigo (só se foi enviado por este usuário).
    if (previousProfile?.avatarUrl && previousProfile.avatarUrl !== profile.avatarUrl) {
      await this.storage.delete(previousProfile.avatarUrl, userId)
    }
    return toProfile(profile)
  }

  /**
   * Perfil público pelo username.
   *
   * @throws AppError 404 perfil inexistente.
   */
  async getByUsername(username: string): Promise<PublicProfile> {
    const profile = await this.repo.findByUsername(username)
    if (!profile || profile.suspended) throw NotFound("Perfil")
    return toPublicProfile(profile)
  }

  /** Ranking de alunos por XP. */
  async listLeaderboard(limit: number): Promise<PublicProfile[]> {
    return (await this.repo.listLeaderboard(limit)).map(toPublicProfile)
  }

  /** Um ano, do mais antigo ao mais recente, sem buracos. */
  async listActivity(userId: string, now = new Date()): Promise<ActivityDay[]> {
    const since = new Date(now.getTime() - ACTIVITY_DAYS * MS_PER_DAY)
    const activityByDay = new Map((await this.repo.listActivity(userId, since)).map((day) => [day.day, day]))
    const days: ActivityDay[] = []
    for (let daysAgo = ACTIVITY_DAYS - 1; daysAgo >= 0; daysAgo--) {
      const date = saoPauloDate(new Date(now.getTime() - daysAgo * MS_PER_DAY))
      const activity = activityByDay.get(date)
      days.push({ date, xp: activity?.xp ?? 0, activities: activity?.completions ?? 0 })
    }
    return days
  }

  /** Catálogo de badges (inativos só para o admin). */
  async listBadges(includeInactive = false): Promise<Badge[]> {
    return (await this.repo.listBadges(includeInactive)).map(toBadge)
  }

  /** Badges conquistados pelo usuário. */
  async listUserBadges(userId: string): Promise<UserBadge[]> {
    return (await this.repo.listUserBadges(userId)).map(toUserBadge)
  }
}
