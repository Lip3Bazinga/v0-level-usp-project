import type { Profile } from "./user"
import type { Lesson, LessonProgress } from "./lesson"
import type { Module, Course, Enrollment } from "./course"
import type { Badge, UserBadge } from "./gamification"
import type { LibraryCatalog, LibraryRequest } from "./library"
import type { TeacherApproval, AuditLog, Notification } from "./platform"
import type { Note } from "./note"
import type { ExamRow, ExamQuestionRow, ExamAttemptRow, CertificateRow } from "./exam"

/** Linha da tabela chave/valor `platform_settings`. */
interface PlatformSettingRow {
  key: string
  value: unknown
  updated_at: string
}

/**
 * Tipo do schema mantido à mão (sem codegen do Supabase — ver plano de
 * refatoração).
 *
 * Detalhe importante: o `GenericTable` do @supabase/postgrest-js exige que
 * Row/Insert/Update sejam `Record<string, unknown>`. Como nossos tipos de
 * domínio são `interface` (sem index signature implícita), eles NÃO satisfazem
 * esse contrato — o schema colapsa para `never` e os payloads de insert/update
 * viram `never` (era por isso que o código usava `as never`).
 *
 * O helper `Table<>` aplica um mapped type `{ [K in keyof T]: T[K] }` a cada
 * lado, o que produz um object type com index signature compatível — assim o
 * client fica corretamente tipado e dispensamos os casts.
 */
type Row<T> = { [K in keyof T]: T[K] }

/**
 * Payload de INSERT: todas as colunas são opcionais no nível de tipo porque a
 * maioria tem DEFAULT no banco (`status`, `xp_earned`, `sort_order`, `active`,
 * timestamps, …) e o código legitimamente omite essas. O NOT NULL continua
 * sendo garantido pelo banco em tempo de execução — aqui o objetivo é apenas
 * não bloquear inserts válidos nem exigir os casts que existiam antes.
 */
type Insertable<T> = Partial<Row<T>>

type Table<R, I = R, U = I> = {
  Row: Row<R>
  Insert: Insertable<I>
  /** UPDATE é sempre parcial (só as colunas enviadas mudam). */
  Update: Partial<Row<U>>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Omit<Profile, "created_at" | "updated_at">, Partial<Omit<Profile, "id" | "created_at">>>
      lessons: Table<Lesson, Omit<Lesson, "id" | "created_at" | "updated_at">, Partial<Omit<Lesson, "id" | "created_at">>>
      // status e xp_earned são NOT NULL DEFAULT no banco → opcionais no insert.
      lesson_progress: Table<
        LessonProgress,
        Omit<LessonProgress, "id" | "created_at" | "status" | "xp_earned"> &
          Partial<Pick<LessonProgress, "status" | "xp_earned">>,
        Partial<Omit<LessonProgress, "id" | "user_id" | "lesson_id" | "created_at">>
      >
      teacher_approvals: Table<
        TeacherApproval,
        Omit<TeacherApproval, "id" | "created_at" | "updated_at">,
        Partial<Omit<TeacherApproval, "id" | "created_at">>
      >
      audit_log: Table<AuditLog, Omit<AuditLog, "id" | "created_at">, Partial<Omit<AuditLog, "id" | "created_at">>>
      notifications: Table<
        Notification,
        Omit<Notification, "id" | "created_at">,
        Partial<Omit<Notification, "id" | "user_id" | "created_at">>
      >
      // O id vem junto no BadgeFormData (o painel edita o slug do badge).
      badges: Table<Badge, Omit<Badge, "created_at">, Omit<Badge, "created_at">>
      user_badges: Table<UserBadge, Omit<UserBadge, "earned_at">, Partial<Omit<UserBadge, "user_id" | "badge_id">>>
      modules: Table<Module, Omit<Module, "id" | "created_at">, Partial<Omit<Module, "id" | "created_at">>>
      library_catalog: Table<
        LibraryCatalog,
        Omit<LibraryCatalog, "id" | "created_at">,
        Partial<Omit<LibraryCatalog, "id" | "created_at">>
      >
      library_requests: Table<
        LibraryRequest,
        Omit<LibraryRequest, "id" | "created_at">,
        Partial<Omit<LibraryRequest, "id" | "created_at">>
      >
      courses: Table<
        Course,
        Omit<Course, "id" | "created_at" | "updated_at" | "lesson_count" | "enrolled">,
        Partial<Omit<Course, "id" | "created_at" | "lesson_count" | "enrolled">>
      >
      enrollments: Table<Enrollment, Omit<Enrollment, "id" | "enrolled_at">, Partial<Omit<Enrollment, "id" | "enrolled_at">>>
      notes: Table<
        Note,
        Omit<Note, "id" | "created_at" | "updated_at" | "lesson_title" | "course_title">,
        Partial<Omit<Note, "id" | "user_id" | "created_at" | "lesson_title" | "course_title">>
      >
      platform_settings: Table<PlatformSettingRow, PlatformSettingRow, Partial<Omit<PlatformSettingRow, "key">>>
      exams: Table<ExamRow, Omit<ExamRow, "id" | "created_at">, Partial<Omit<ExamRow, "id" | "created_at">>>
      exam_questions: Table<
        ExamQuestionRow,
        Omit<ExamQuestionRow, "id" | "created_at">,
        Partial<Omit<ExamQuestionRow, "id" | "created_at">>
      >
      exam_attempts: Table<
        ExamAttemptRow,
        Omit<ExamAttemptRow, "id" | "created_at">,
        Partial<Omit<ExamAttemptRow, "id" | "created_at">>
      >
      certificates: Table<
        CertificateRow,
        Omit<CertificateRow, "id" | "issued_at">,
        Partial<Omit<CertificateRow, "id" | "issued_at">>
      >
    }
    Views: Record<PropertyKey, never>
    Functions: {
      award_xp: {
        Args: { p_user_id: string; p_lesson_id: string; p_xp: number }
        Returns: undefined
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
        Returns: undefined
      }
      grant_badges: {
        Args: { p_user_id: string }
        Returns: Array<Pick<Badge, "id" | "name" | "description" | "icon" | "rarity">>
      }
      get_lesson_hidden_tests: {
        Args: { p_lesson_id: string }
        Returns: string
      }
      reorder_lessons: {
        Args: { p_course_id: string; p_lesson_ids: string[] }
        Returns: undefined
      }
    }
    Enums: Record<PropertyKey, never>
    CompositeTypes: Record<PropertyKey, never>
  }
}
