import type { Profile, PublicProfile } from "@levelusp/contracts"
import type { ProfileRow } from "@levelusp/db"

export function toProfile(profile: ProfileRow): Profile {
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
    current_streak: profile.currentStreak,
    max_streak: profile.maxStreak,
    courses_completed: profile.coursesCompleted,
    lessons_completed: profile.lessonsCompleted,
    last_login_date: profile.lastLoginDate,
    suspended: profile.suspended,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  }
}

export function toPublicProfile(profile: ProfileRow): PublicProfile {
  const { email: _email, suspended: _suspended, ...publicFields } = toProfile(profile)
  return publicFields
}
