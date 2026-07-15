// Single source of truth for all database types.
// This file re-exports from lib/supabase/types.ts so that both import paths
// point to the same definitions and stay in sync automatically.
export type {
  Database,
  Profile,
  Lesson,
  LessonProgress,
  Course,
  Enrollment,
  UserProgress,
  UserDailyActivity,
  UserRole,
} from "@/lib/supabase/types"
