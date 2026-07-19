import type { Profile } from "./user"
import type { Lesson, LessonProgress } from "./lesson"
import type { Module } from "./course"
import type { Badge, UserBadge } from "./gamification"
import type { LibraryCatalog, LibraryRequest } from "./library"
import type { TeacherApproval, AuditLog, Notification } from "./platform"

/**
 * Tipo do schema mantido à mão (sem codegen do Supabase — ver plano de
 * refatoração). Cada tabela expõe Row/Insert/Update derivados dos tipos de
 * domínio via Omit/Partial.
 */
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
      library_catalog: {
        Row: LibraryCatalog
        Insert: Omit<LibraryCatalog, "id" | "created_at">
        Update: Partial<Omit<LibraryCatalog, "id" | "created_at">>
      }
      library_requests: {
        Row: LibraryRequest
        Insert: Omit<LibraryRequest, "id" | "created_at">
        Update: Partial<Omit<LibraryRequest, "id" | "created_at">>
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
    Enums: Record<string, never>
  }
}
