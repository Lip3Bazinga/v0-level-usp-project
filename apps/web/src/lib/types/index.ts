// Barril central dos tipos do LevelUSP.
// Tipos de domínio vêm de @levelusp/contracts (fonte única web⇄api);
// aqui ficam só os reexports e os tipos puramente de UI.
// Importe daqui: `import type { Lesson, Course } from "@/lib/types"`.
export type { UserRole, Profile, PublicProfile, StreakResult, SessionResponse, UserDataExport } from "./user"
export type {
  Checkpoint,
  ProjectFile,
  Lesson,
  LessonType,
  LessonSummary,
  LessonStatus,
  LessonProgress,
  ActivityDay,
  QuizQuestionPublic,
  QuizResult,
} from "./lesson"
export type { Module, Course, Enrollment, Difficulty } from "./course"
export type { BadgeRarity, BadgeCriteriaType, Badge, UserBadge, GrantedBadge } from "./gamification"
export type { LibraryCategory, LibraryCatalog, LibraryRequest } from "./library"
export type { TeacherApproval, AuditLog, NotificationKind, Notification } from "./platform"
export type { ConsoleOutput, TestResult, CaseResult, SubmissionResult } from "./ide"
export type { ToastKind, OnToast } from "./ui"
export type { Note } from "./note"
export type {
  ExamRow,
  ExamQuestionRow,
  ExamAttemptRow,
  CertificateRow,
  ExamStatus,
  ExamQuestion,
  ExamStart,
  ExamResult,
  CertificateIssue,
  MyCertificate,
  CertificateVerification,
} from "./exam"
/** @deprecated Schema do Supabase — usado só pela camada legada do Supabase. */
