import { z } from "zod"

export interface TeacherApproval {
  id: string
  user_id: string
  name: string
  email: string
  institution: string
  motivation: string
  status: "pending" | "approved" | "rejected" | "superseded"
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
export type TeacherRequestInput = z.infer<typeof teacherRequestSchema>

export const reviewTeacherSchema = z.object({ note: z.string().trim().max(1000).optional() })

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

export interface RecentActivity {
  id: string
  user_name: string
  lesson_title: string
  xp_earned: number
  completed_at: string
}

export interface AnalyticsMetrics {
  dailyActiveUsers: number[]
  completionsByDay: number[]
  topLessons: { lesson_id: string; title: string; completions: number }[]
  roleDistribution: { role: string; count: number }[]
  averageXp: number
  retention7d: number
}

export type PlatformSettings = Record<string, unknown>
export const platformSettingsSchema = z.record(z.string().regex(/^[a-z0-9_.]{1,64}$/), z.unknown())

export const inviteUserSchema = z.object({ email: z.email().trim().toLowerCase(), full_name: z.string().trim().max(120).optional() })
export const invalidateSessionsSchema = z.object({ user_id: z.uuid().optional() })
