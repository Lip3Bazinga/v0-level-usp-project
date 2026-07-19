// Barril central dos tipos de domínio do LevelUSP.
// Importe daqui: `import type { Lesson, Course } from "@/lib/types"`.
export type { UserRole, Profile, UserProgress, UserDailyActivity } from "./user"
export type { Checkpoint, ProjectFile, Lesson, LessonProgress, ActivityDay } from "./lesson"
export type { Module, Course, Enrollment } from "./course"
export type {
  BadgeRarity,
  BadgeCriteriaType,
  Badge,
  UserBadge,
} from "./gamification"
export type { LibraryCategory, LibraryCatalog, LibraryRequest } from "./library"
export type {
  TeacherApproval,
  AuditLog,
  NotificationKind,
  Notification,
} from "./platform"
export type { ConsoleOutput, TestResult } from "./ide"
export type { Database } from "./database"
