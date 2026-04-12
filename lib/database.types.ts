export interface Database {
  public: {
    Tables: {
      lessons: {
        Row: Lesson
        Insert: Omit<Lesson, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Lesson, "id">>
      }
      user_progress: {
        Row: UserProgress
        Insert: Omit<UserProgress, "id" | "completed_at">
        Update: Partial<Omit<UserProgress, "id">>
      }
      user_daily_activity: {
        Row: UserDailyActivity
        Insert: Omit<UserDailyActivity, "id">
        Update: Partial<Omit<UserDailyActivity, "id">>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, "created_at">
        Update: Partial<Profile>
      }
    }
  }
}

export interface Lesson {
  id: string
  title: string
  description: string
  module: string
  order: number
  difficulty: "iniciante" | "intermediario" | "avancado"
  content_markdown: string
  starter_code: string
  hidden_tests: string
  xp_reward: number
  time_limit: number
  libraries: string[]
  published: boolean
  created_at: string
  updated_at: string
}

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

export interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  total_xp: number
  level: number
  current_streak: number
  longest_streak: number
  created_at: string
}
