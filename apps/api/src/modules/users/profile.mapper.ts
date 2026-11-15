import type { Profile, PublicProfile } from "@levelusp/contracts"
import type { ProfileRow } from "@levelusp/db"
import { saoPauloDate } from "@/common/time/time"
import { effectiveStreak } from "../gamification/gamification.domain"

/**
 * Perfil completo (com e-mail), para o próprio usuário e admins. `current_streak` é a
 * sequência em vigor: zera na leitura quando o último dia com conclusão ficou para trás.
 */
export function toProfile(profile: ProfileRow, today: string = saoPauloDate()): Profile {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    username: profile.username,
    avatar_url: profile.avatarUrl,
    bio: profile.bio,
    role: profile.role,
    level: profile.level,
    total_xp: profile.totalXp,
    current_streak: effectiveStreak(profile.lastLoginDate, today, profile.currentStreak),
    max_streak: profile.maxStreak,
    courses_completed: profile.coursesCompleted,
    lessons_completed: profile.lessonsCompleted,
    last_login_date: profile.lastLoginDate,
    suspended: profile.suspended,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
    experiment_condition: profile.experimentCondition,
  }
}

/** Perfil para terceiros: sem e-mail, marca de suspensão nem grupo do experimento. */
export function toPublicProfile(profile: ProfileRow, today: string = saoPauloDate()): PublicProfile {
  const { email: _email, suspended: _suspended, experiment_condition: _experimentCondition, ...publicFields } = toProfile(profile, today)
  return publicFields
}
