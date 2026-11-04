import type {
  AdminExamQuestion, AdminUpdateUserInput, AnalyticsMetrics, AuditLog, ExamQuestionInput, ExamQuestionUpdateInput,
  invalidateSessionsSchema, inviteUserSchema, Lesson, PlatformMetrics, PlatformSettings, Profile, RecentActivity,
  reviewTeacherSchema, TeacherApproval, UserDataExport,
} from "@levelusp/contracts"
import type { SchemaInput } from "@/lib/types/schema"
import { api } from "./client"

const RECENT_ACTIVITY_SIZE = 20
const AUDIT_LOG_SIZE = 50

type InviteUserInput = SchemaInput<typeof inviteUserSchema>
type InvalidateSessionsInput = SchemaInput<typeof invalidateSessionsSchema>
type ReviewTeacherInput = SchemaInput<typeof reviewTeacherSchema>

export const fetchPlatformMetrics = () => api.get<PlatformMetrics>("/admin/metrics")
export const fetchRecentActivity = (limit = RECENT_ACTIVITY_SIZE) =>
  api.get<RecentActivity[]>("/admin/activity/recent", { query: { limit } })
export const fetchDailyActivity = () => api.get<number[]>("/admin/activity/daily")
export const fetchAnalyticsMetrics = () => api.get<AnalyticsMetrics>("/admin/analytics")
export const fetchAdminLessons = () => api.get<Lesson[]>("/admin/lessons")

export const fetchAdminUsers = () => api.get<Profile[]>("/admin/users")
export const updateUserProfile = (userId: string, patch: AdminUpdateUserInput) =>
  api.patch<Profile>(`/admin/users/${userId}`, patch)
export const updateUserRole = (userId: string, role: Profile["role"]) => updateUserProfile(userId, { role })
export const setUserSuspended = (userId: string, suspended: boolean) => updateUserProfile(userId, { suspended })
export const deleteUser = (userId: string) => api.delete(`/admin/users/${userId}`)
export const resetUserProgress = (userId: string) => api.post<void>(`/admin/users/${userId}/reset-progress`)
export const sendPasswordReset = (userId: string) => api.post<{ ok: true }>(`/admin/users/${userId}/password-reset`)
export const inviteUser = (email: string, fullName?: string) =>
  api.post<Profile, InviteUserInput>("/admin/users/invite", { email, full_name: fullName })
/** Exportação LGPD dos dados de um usuário. */
export const fetchUserDataExport = (userId: string) => api.get<UserDataExport>(`/admin/users/${userId}/export`)
/** Encerra as sessões de um usuário ou, sem `userId`, de todos. */
export const invalidateSessions = (userId?: string) =>
  api.post<void, InvalidateSessionsInput>("/admin/sessions/invalidate", userId ? { user_id: userId } : {})

export const fetchTeacherApprovals = (status: "pending" | "all" = "pending") =>
  api.get<TeacherApproval[]>("/admin/teacher-approvals", { query: { status } })
export const approveTeacher = (approvalId: string, note?: string) =>
  api.post<void, ReviewTeacherInput>(`/admin/teacher-approvals/${approvalId}/approve`, { note })
export const rejectTeacher = (approvalId: string, note?: string) =>
  api.post<void, ReviewTeacherInput>(`/admin/teacher-approvals/${approvalId}/reject`, { note })

export const fetchPlatformSettings = () => api.get<PlatformSettings>("/admin/settings")
export const updatePlatformSettings = (settings: PlatformSettings) => api.put<PlatformSettings>("/admin/settings", settings)
export const fetchAuditLog = (limit = AUDIT_LOG_SIZE) => api.get<AuditLog[]>("/admin/audit", { query: { limit } })

/** Espelha o `AdminExamSummary` da API, que ainda não está em @levelusp/contracts. */
export interface AdminExamSummary {
  id: string
  course_id: string
  course_title: string
  title: string
}
export const fetchAdminExams = () => api.get<AdminExamSummary[]>("/admin/exams")
export const fetchAdminExamQuestions = (examId: string) =>
  api.get<AdminExamQuestion[]>(`/admin/exams/${examId}/questions`)
export const createExamQuestion = (examId: string, input: ExamQuestionInput) =>
  api.post<AdminExamQuestion>(`/admin/exams/${examId}/questions`, input)
export const updateExamQuestion = (questionId: string, input: ExamQuestionUpdateInput) =>
  api.patch<AdminExamQuestion>(`/admin/exam-questions/${questionId}`, input)
