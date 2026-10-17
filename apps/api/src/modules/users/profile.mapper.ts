import type { Profile, PublicProfile } from "@levelusp/contracts"
import type { profiles } from "@levelusp/db"

type ProfileRow = typeof profiles.$inferSelect

export function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    email: r.email,
    full_name: r.fullName,
    username: r.username,
    avatar_url: r.avatarUrl,
    bio: r.bio,
    role: r.role,
    level: r.level,
    total_xp: r.totalXp,
    current_streak: r.currentStreak,
    max_streak: r.maxStreak,
    courses_completed: r.coursesCompleted,
    lessons_completed: r.lessonsCompleted,
    last_login_date: r.lastLoginDate,
    suspended: r.suspended,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }
}

export function toPublicProfile(r: ProfileRow): PublicProfile {
  const { email: _email, suspended: _suspended, ...rest } = toProfile(r)
  return rest
}
