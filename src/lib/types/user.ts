export type UserRole = "student" | "teacher" | "admin"

export interface Profile {
  id: string
  email: string
  full_name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  role: UserRole
  level: number
  total_xp: number
  current_streak: number
  max_streak: number
  courses_completed: number
  lessons_completed: number
  last_login_date: string | null
  suspended: boolean
  created_at: string
  updated_at: string
}

// Tipos legados mantidos por compatibilidade retroativa.
export interface UserProgress {
  id: string
  user_id: string
  lesson_id: string
  completed: boolean
  xp_earned: number
  attempts: number
  completed_at: string | null
}

export interface UserDailyActivity {
  id: string
  user_id: string
  date: string
  xp_earned: number
  lessons_completed: number
  streak_count: number
}
