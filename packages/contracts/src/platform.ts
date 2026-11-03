import { z } from "zod"
import { MAX_FULL_NAME_LENGTH } from "./users"

export const TEACHER_APPROVAL_STATUSES = ["pending", "approved", "rejected", "superseded"] as const
/** Situação de uma solicitação de professor (`superseded`: substituída por outra mais nova). */
export type TeacherApprovalStatus = (typeof TEACHER_APPROVAL_STATUSES)[number]

/** Solicitação de um usuário para virar professor; o admin aprova ou rejeita com uma nota. */
export interface TeacherApproval {
  id: string
  user_id: string
  name: string
  email: string
  institution: string
  motivation: string
  status: TeacherApprovalStatus
  reviewed_by: string | null
  review_note: string | null
  submitted_at: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export const teacherRequestSchema = z.object({
  institution: z.string().trim().max(200).default(""),
  motivation: z.string().trim().min(10, "Conte um pouco mais sobre sua motivação").max(2000),
})
/** Corpo de `POST /me/teacher-request`; só uma pendente por usuário. */
export type TeacherRequestInput = z.infer<typeof teacherRequestSchema>

export const reviewTeacherSchema = z.object({ note: z.string().trim().max(1000).optional() })
/** Corpo da aprovação ou rejeição de uma solicitação de professor (nota opcional ao usuário). */
export type ReviewTeacherInput = z.infer<typeof reviewTeacherSchema>

export const AUDIT_SEVERITIES = ["info", "warning", "danger"] as const
/** Gravidade de uma ação administrativa na trilha de auditoria. */
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number]

/** Entrada da trilha de auditoria (`GET /admin/audit`). */
export interface AuditLog {
  id: string
  actor_id: string | null
  actor_name: string
  action: string
  target: string
  meta: Record<string, unknown> | null
  severity: AuditSeverity
  created_at: string
}

export const NOTIFICATION_KINDS = ["info", "success", "warning", "danger"] as const
/** Tom visual da notificação. */
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]
/** Notificação do usuário; `href` leva à tela relacionada. */
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

/** Totais do painel administrativo (`GET /admin/metrics`). */
export interface PlatformMetrics {
  totalUsers: number
  totalStudents: number
  totalTeachers: number
  totalAdmins: number
  totalLessons: number
  publishedLessons: number
  totalCompletions: number
  pendingApprovals: number
  totalCourses: number
  publishedCourses: number
  totalEnrollments: number
  totalXpAwarded: number
}

/** Conclusão de lição recente, no feed do painel administrativo. */
export interface RecentActivity {
  id: string
  user_name: string
  lesson_title: string
  xp_earned: number
  completed_at: string
}

/** Indicadores de engajamento do painel administrativo (`GET /admin/analytics`). */
export interface AnalyticsMetrics {
  /** Usuários distintos com lição concluída por dia (30 dias, do mais antigo a hoje — fuso de São Paulo). */
  dailyActiveUsers: number[]
  /** Conclusões de lição por dia (30 dias, do mais antigo a hoje). */
  completionsByDay: number[]
  topLessons: { lesson_id: string; title: string; completions: number }[]
  roleDistribution: { role: string; count: number }[]
  /** XP médio dos alunos (inteiro). */
  averageXp: number
  /** % de contas com 7+ dias que tiveram atividade nos últimos 7 dias (0–100). */
  retention7d: number
  /** Usuários distintos com conclusão nas últimas 24 h / 7 dias / 30 dias (semântica do painel antigo). */
  dau: number
  wau: number
  mau: number
  totalUsers: number
  /** Funil: concluíram ≥1 lição, ≥5 lições, têm sequência ≥7 dias. */
  funnelStarted: number
  funnelCompleted5: number
  funnelStreak7: number
}

/** Configurações livres da plataforma (chave → valor JSON), editadas pelo admin. */
export type PlatformSettings = Record<string, unknown>
export const platformSettingsSchema = z.record(z.string().regex(/^[a-z0-9_.]{1,64}$/), z.unknown())

export const inviteUserSchema = z.object({ email: z.email().trim().toLowerCase(), full_name: z.string().trim().max(MAX_FULL_NAME_LENGTH).optional() })
/** Corpo de `POST /admin/users/invite`: cria a conta sem senha e envia o link para definir uma. */
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export const invalidateSessionsSchema = z.object({ user_id: z.uuid().optional() })
/** Corpo de `POST /admin/sessions/invalidate`; sem `user_id`, derruba as sessões de todos. */
export type InvalidateSessionsInput = z.infer<typeof invalidateSessionsSchema>

export const teacherApprovalStatusQuerySchema = z.object({
  status: z.enum([...TEACHER_APPROVAL_STATUSES, "all"]).default("pending"),
})
/** Query de `GET /admin/teacher-approvals` (padrão: pendentes). */
export type TeacherApprovalStatusQuery = z.infer<typeof teacherApprovalStatusQuerySchema>
