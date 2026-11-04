import { z } from "zod"
import type { GradeResult } from "./grading"
import type { LessonProgress, ProjectFile } from "./lessons"
import type { LibraryRequest } from "./library"
import type { Note } from "./notes"
import type { Notification, TeacherApproval } from "./platform"

export const USER_ROLES = ["student", "teacher", "admin"] as const
export const userRoleSchema = z.enum(USER_ROLES)
/** Papel do usuário; define as rotas que ele acessa. */
export type UserRole = z.infer<typeof userRoleSchema>

/** Perfil público + gamificação. Mantém snake_case por compatibilidade com o front. */
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

/** Perfil exposto a terceiros (sem e-mail). */
export type PublicProfile = Omit<Profile, "email" | "suspended">

export const MAX_FULL_NAME_LENGTH = 120

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Use ao menos 3 caracteres")
  .max(32, "Use no máximo 32 caracteres")
  .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e _")

const fullNameSchema = z.string().trim().min(1).max(MAX_FULL_NAME_LENGTH)
const bioSchema = z.string().trim().max(500).nullable()

export const updateMyProfileSchema = z
  .object({
    full_name: fullNameSchema,
    username: usernameSchema,
    bio: bioSchema,
    /** /api/files/... (enviada pelo próprio usuário) ou https externo — validado na API. */
    avatar_url: z.string().max(2048).nullable(),
  })
  .partial()
/** Corpo de `PATCH /me/profile`: só os campos enviados mudam. */
export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>

/** Edição administrativa (papel, suspensão, dados básicos). */
export const adminUpdateUserSchema = z
  .object({
    full_name: fullNameSchema,
    username: usernameSchema,
    role: userRoleSchema,
    suspended: z.boolean(),
    bio: bioSchema,
  })
  .partial()
/** Corpo de `PATCH /admin/users/:id`; o admin não pode rebaixar nem suspender a si mesmo. */
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>

/** Exclusão da própria conta (LGPD): exige a senha atual. */
export const deleteAccountSchema = z.object({ password: z.string().min(1, "Informe sua senha").max(128) })
/** Corpo de `DELETE /me`. */
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>

/** Credencial na exportação LGPD: só metadados, nunca o hash da senha. */
export interface AccountExport {
  email: string
  email_verified_at: string | null
  last_sign_in_at: string | null
  created_at: string
}

/** Submissão de código na exportação LGPD (arquivos enviados e o veredito guardado). */
export interface SubmissionExport {
  id: string
  lesson_id: string
  files: ProjectFile[]
  status: "graded" | "error"
  passed: boolean
  result: GradeResult | null
  engine: string | null
  duration_ms: number | null
  created_at: string
}

/** Matrícula na exportação LGPD; o título é null se o curso já foi apagado. */
export interface EnrollmentExport {
  course_id: string
  course_title: string | null
  enrolled_at: string
}

/** Badge conquistado na exportação LGPD. */
export interface BadgeEarnedExport {
  badge_id: string
  earned_at: string
}

/** Certificado emitido na exportação LGPD. */
export interface CertificateExport {
  id: string
  course_id: string
  course_title: string | null
  verification_code: string
  exam_score: number | null
  project_status: "passed" | "waived"
  issued_at: string
}

/** Tentativa de prova na exportação LGPD (respostas do aluno, sem gabarito). */
export interface ExamAttemptExport {
  id: string
  exam_id: string
  answers: Record<string, number>
  score: number | null
  passed: boolean | null
  started_at: string
  submitted_at: string | null
}

/** Sessão de login na exportação LGPD: metadados, nunca o token nem o seu hash. */
export interface SessionExport {
  created_at: string
  last_seen_at: string
  expires_at: string
  revoked_at: string | null
  ip: string | null
  user_agent: string | null
  active: boolean
}

/** Exportação dos dados pessoais (LGPD). Nunca inclui hashes de senha ou tokens. */
export interface UserDataExport {
  exported_at: string
  profile: Profile
  account: AccountExport
  lesson_progress: LessonProgress[]
  submissions: SubmissionExport[]
  notes: Note[]
  enrollments: EnrollmentExport[]
  badges: BadgeEarnedExport[]
  certificates: CertificateExport[]
  exam_attempts: ExamAttemptExport[]
  notifications: Notification[]
  teacher_requests: TeacherApproval[]
  library_requests: LibraryRequest[]
  sessions: SessionExport[]
}
