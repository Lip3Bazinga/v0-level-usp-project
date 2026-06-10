export type UserRole = "student" | "teacher" | "admin"

/** Passo pedagógico de uma lição (instrução + dica opcional). */
export interface Checkpoint {
  id: number
  instruction: string
  hint?: string
}

/** Arquivo de um projeto multi-arquivo. Pastas são implícitas pelo path. */
export interface ProjectFile {
  path: string      // ex: "main.py", "utils/helpers.py"
  content: string
}

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

export interface Module {
  id: string
  title: string
  description: string
  icon: string
  color: string
  sort_order: number
  created_at: string
}

export interface Lesson {
  id: string
  title: string
  description: string
  slug: string | null
  module: string
  order: number
  difficulty: "iniciante" | "intermediario" | "avancado"
  content_markdown: string
  starter_code: string
  starter_files: ProjectFile[]
  hidden_tests?: string
  checkpoints: Checkpoint[]
  libraries: string[] | null
  xp_reward: number
  time_limit: number
  course_id: string | null
  module_id: string | null
  created_by: string | null
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

export interface Course {
  id: string
  title: string
  description: string
  long_description: string
  cover_image_url: string | null
  level: "iniciante" | "intermediario" | "avancado"
  tags: string[]
  total_xp: number
  estimated_hours: number
  published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // projeto final
  final_project_title: string | null
  final_project_description: string | null
  final_project_starter_code: string | null
  final_project_tests: string | null
  // join fields (populated manually when needed)
  lesson_count?: number
  enrolled?: boolean
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
}

export interface TeacherApproval {
  id: string
  user_id: string
  name: string
  email: string
  institution: string
  motivation: string
  status: "pending" | "approved" | "rejected"
  reviewed_by: string | null
  review_note: string | null
  submitted_at: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_name: string
  action: string
  target: string
  meta: Record<string, unknown> | null
  severity: "info" | "warning" | "danger"
  created_at: string
}

export type BadgeRarity = "common" | "rare" | "epic" | "legendary"
export type BadgeCriteriaType =
  | "total_xp"
  | "current_streak"
  | "max_streak"
  | "lessons_completed"
  | "courses_completed"
  | "manual"

export interface Badge {
  id: string
  name: string
  description: string
  icon: string            // nome do ícone lucide (ex: "Flame")
  rarity: BadgeRarity
  criteria_type: BadgeCriteriaType
  criteria_value: number
  sort_order: number
  active: boolean
  created_at: string
}

export interface UserBadge {
  user_id: string
  badge_id: string
  earned_at: string
}

export type NotificationKind = "info" | "success" | "warning" | "danger"

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  kind: NotificationKind
  read: boolean
  href: string | null
  created_at: string
}

// Legacy types kept for backward compatibility
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
      teacher_approvals: {
        Row: TeacherApproval
        Insert: Omit<TeacherApproval, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<TeacherApproval, "id" | "created_at">>
      }
      audit_log: {
        Row: AuditLog
        Insert: Omit<AuditLog, "id" | "created_at">
        Update: never
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, "id" | "created_at">
        Update: Partial<Omit<Notification, "id" | "user_id" | "created_at">>
      }
      badges: {
        Row: Badge
        Insert: Omit<Badge, "created_at">
        Update: Partial<Omit<Badge, "id" | "created_at">>
      }
      user_badges: {
        Row: UserBadge
        Insert: Omit<UserBadge, "earned_at">
        Update: never
      }
      modules: {
        Row: Module
        Insert: Omit<Module, "id" | "created_at">
        Update: Partial<Omit<Module, "id" | "created_at">>
      }
    }
    Views: Record<string, never>
    Functions: {
      award_xp: {
        Args: { p_user_id: string; p_lesson_id: string; p_xp: number }
        Returns: void
      }
      log_audit: {
        Args: {
          p_actor_id: string
          p_actor_name: string
          p_action: string
          p_target: string
          p_meta?: Record<string, unknown>
          p_severity?: string
        }
        Returns: void
      }
      grant_badges: {
        Args: { p_user_id: string }
        Returns: Array<Pick<Badge, "id" | "name" | "description" | "icon" | "rarity">>
      }
    }
    Enums: {
      user_role: UserRole
    }
  }
}
