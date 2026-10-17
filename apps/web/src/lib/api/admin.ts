import type {
  AdminExamQuestion, AdminUpdateUserInput, AnalyticsMetrics, AuditLog, ExamQuestionInput, ExamQuestionUpdateInput, Lesson,
  PlatformMetrics, PlatformSettings, Profile, RecentActivity, TeacherApproval, UserDataExport,
} from "@levelusp/contracts"
import { api } from "./client"

export type { AnalyticsMetrics, PlatformMetrics, PlatformSettings, RecentActivity }

export const fetchPlatformMetrics = () => api.get<PlatformMetrics>("/admin/metrics")
export const fetchRecentActivity = (limit = 20) => api.get<RecentActivity[]>("/admin/activity/recent", { query: { limit } })
export const fetchDailyActivity = () => api.get<number[]>("/admin/activity/daily")
export const fetchAnalyticsMetrics = () => api.get<AnalyticsMetrics>("/admin/analytics")
export const fetchAllLessons = () => api.get<Lesson[]>("/admin/lessons")

export const fetchAllUsers = () => api.get<Profile[]>("/admin/users")
export const updateUserProfile = (userId: string, patch: AdminUpdateUserInput) => api.patch<Profile>(`/admin/users/${userId}`, patch)
export const updateUserRole = (userId: string, role: Profile["role"]) => updateUserProfile(userId, { role })
export const setUserSuspended = (userId: string, suspended: boolean) => updateUserProfile(userId, { suspended })
export const deleteUser = (userId: string) => api.delete<void>(`/admin/users/${userId}`)
export const resetUserProgress = (userId: string) => api.post<void>(`/admin/users/${userId}/reset-progress`)
export const sendPasswordReset = (userId: string) => api.post<{ ok: true }>(`/admin/users/${userId}/password-reset`)
export const inviteUser = (email: string, full_name?: string) => api.post<Profile>("/admin/users/invite", { email, full_name })
export const exportUserDataLGPD = (userId: string) => api.get<UserDataExport>(`/admin/users/${userId}/export`)
export const invalidateSessions = (userId?: string) => api.post<void>("/admin/sessions/invalidate", userId ? { user_id: userId } : {})

export const fetchPendingApprovals = (status: "pending" | "all" = "pending") =>
  api.get<TeacherApproval[]>("/admin/teacher-approvals", { query: { status } })
export const approveTeacher = (approvalId: string, note?: string) => api.post<void>(`/admin/teacher-approvals/${approvalId}/approve`, { note })
export const rejectTeacher = (approvalId: string, note?: string) => api.post<void>(`/admin/teacher-approvals/${approvalId}/reject`, { note })

export const fetchPlatformSettings = () => api.get<PlatformSettings>("/admin/settings")
export const savePlatformSettings = (settings: PlatformSettings) => api.put<PlatformSettings>("/admin/settings", settings)
export const fetchAuditLog = (limit = 50) => api.get<AuditLog[]>("/admin/audit", { query: { limit } })

export interface AdminExamSummary {
  id: string
  course_id: string
  course_title: string
  title: string
}
export const fetchAdminExams = () => api.get<AdminExamSummary[]>("/admin/exams")
export const fetchExamQuestionsAdmin = (examId: string) => api.get<AdminExamQuestion[]>(`/admin/exams/${examId}/questions`)
export const createExamQuestion = (examId: string, q: ExamQuestionInput) => api.post<AdminExamQuestion>(`/admin/exams/${examId}/questions`, q)
export const updateExamQuestion = (id: string, q: ExamQuestionUpdateInput) => api.patch<AdminExamQuestion>(`/admin/exam-questions/${id}`, q)

/** Exporta linhas para CSV e dispara o download (utilitário de UI). */
export function exportToCsv<T extends Record<string, unknown>>(rows: T[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0]!)
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = Object.assign(document.createElement("a"), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
