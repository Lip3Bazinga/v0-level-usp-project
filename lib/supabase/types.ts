export type UserRole = "student" | "teacher" | "admin"

export interface Profile {
  id: string
  email: string
  full_name: string
  username: string
  avatar_url: string | null
  bio: string | null
  role: UserRole
  level: number
  total_xp: number
  current_streak: number
  max_streak: number
  courses_completed: number
  lessons_completed: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  title: string
  slug: string
  module: string
  order: number
  difficulty: "iniciante" | "intermediario" | "avancado"
  content_markdown: string
  starter_code: string
  hidden_tests: string
  libraries: string[]
  xp_reward: number
  time_limit: number
  created_by: string
  published: boolean
  created_at: string
  updated_at: string
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  status: "not_started" | "in_progress" | "completed"
  code_snapshot: string | null
  score: number | null
  xp_earned: number
  completed_at: string | null
  created_at: string
}

// Supabase Database type for type-safe queries
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, "created_at" | "updated_at">
        Update: Partial<Omit<Profile, "id" | "created_at">>
      }
      lessons: {
        Row: Lesson
        Insert: Omit<Lesson, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Lesson, "id" | "created_at">>
      }
      lesson_progress: {
        Row: LessonProgress
        Insert: Omit<LessonProgress, "id" | "created_at">
        Update: Partial<Omit<LessonProgress, "id" | "user_id" | "lesson_id" | "created_at">>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
    }
  }
}
