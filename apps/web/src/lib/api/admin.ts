import type {
  AdminExamQuestion, AdminUpdateUserInput, AnalyticsMetrics, AuditLog, ExamQuestionInput, ExamQuestionUpdateInput,
  invalidateSessionsSchema, inviteUserSchema, Lesson, OkResponse, PlatformMetrics, PlatformSettings, Profile, RecentActivity,
  reviewTeacherSchema, TeacherApproval, UserDataExport,
} from "@levelusp/contracts"
import type { SchemaInput } from "@/lib/types/schema"
import { api } from "./client"

const RECENT_ACTIVITY_SIZE = 20
const AUDIT_LOG_SIZE = 50

type InviteUserInput = SchemaInput<typeof inviteUserSchema>
type InvalidateSessionsInput = SchemaInput<typeof invalidateSessionsSchema>
type ReviewTeacherInput = SchemaInput<typeof reviewTeacherSchema>

export const fetchPlatformMetrics = (): Promise<PlatformMetrics> => api.get<PlatformMetrics>("/admin/metrics")
export const fetchRecentActivity = (limit = RECENT_ACTIVITY_SIZE): Promise<RecentActivity[]> =>
  api.get<RecentActivity[]>("/admin/activity/recent", { query: { limit } })
export const fetchDailyActivity = (): Promise<number[]> => api.get<number[]>("/admin/activity/daily")
export const fetchAnalyticsMetrics = (): Promise<AnalyticsMetrics> => api.get<AnalyticsMetrics>("/admin/analytics")
export const fetchAdminLessons = (): Promise<Lesson[]> => api.get<Lesson[]>("/admin/lessons")

export const fetchAdminUsers = (): Promise<Profile[]> => api.get<Profile[]>("/admin/users")
export const updateUserProfile = (userId: string, patch: AdminUpdateUserInput): Promise<Profile> =>
  api.patch<Profile>(`/admin/users/${userId}`, patch)
export const updateUserRole = (userId: string, role: Profile["role"]): Promise<Profile> => updateUserProfile(userId, { role })
export const setUserSuspended = (userId: string, suspended: boolean): Promise<Profile> => updateUserProfile(userId, { suspended })
export const deleteUser = (userId: string): Promise<void> => api.delete(`/admin/users/${userId}`)
export const resetUserProgress = (userId: string): Promise<void> => api.post<void>(`/admin/users/${userId}/reset-progress`)
export const sendPasswordReset = (userId: string): Promise<OkResponse> => api.post<OkResponse>(`/admin/users/${userId}/password-reset`)
export const inviteUser = (email: string, fullName?: string): Promise<Profile> =>
  api.post<Profile, InviteUserInput>("/admin/users/invite", { email, full_name: fullName })
/** Exportação LGPD dos dados de um usuário. */
export const fetchUserDataExport = (userId: string): Promise<UserDataExport> => api.get<UserDataExport>(`/admin/users/${userId}/export`)
/** Encerra as sessões de um usuário ou, sem `userId`, de todos. */
export const invalidateSessions = (userId?: string): Promise<void> =>
  api.post<void, InvalidateSessionsInput>("/admin/sessions/invalidate", userId ? { user_id: userId } : {})

export const fetchTeacherApprovals = (status: "pending" | "all" = "pending"): Promise<TeacherApproval[]> =>
  api.get<TeacherApproval[]>("/admin/teacher-approvals", { query: { status } })
export const approveTeacher = (approvalId: string, note?: string): Promise<void> =>
  api.post<void, ReviewTeacherInput>(`/admin/teacher-approvals/${approvalId}/approve`, { note })
export const rejectTeacher = (approvalId: string, note?: string): Promise<void> =>
  api.post<void, ReviewTeacherInput>(`/admin/teacher-approvals/${approvalId}/reject`, { note })

export const fetchPlatformSettings = (): Promise<PlatformSettings> => api.get<PlatformSettings>("/admin/settings")
export const updatePlatformSettings = (settings: PlatformSettings): Promise<PlatformSettings> => api.put<PlatformSettings>("/admin/settings", settings)
export const fetchAuditLog = (limit = AUDIT_LOG_SIZE): Promise<AuditLog[]> => api.get<AuditLog[]>("/admin/audit", { query: { limit } })

/** Espelha o `AdminExamSummary` da API, que ainda não está em @levelusp/contracts. */
export interface AdminExamSummary {
  id: string
  course_id: string
  course_title: string
  title: string
}
export const fetchAdminExams = (): Promise<AdminExamSummary[]> => api.get<AdminExamSummary[]>("/admin/exams")
export const fetchAdminExamQuestions = (examId: string): Promise<AdminExamQuestion[]> =>
  api.get<AdminExamQuestion[]>(`/admin/exams/${examId}/questions`)
export const createExamQuestion = (examId: string, input: ExamQuestionInput): Promise<AdminExamQuestion> =>
  api.post<AdminExamQuestion>(`/admin/exams/${examId}/questions`, input)
export const updateExamQuestion = (questionId: string, input: ExamQuestionUpdateInput): Promise<AdminExamQuestion> =>
  api.patch<AdminExamQuestion>(`/admin/exam-questions/${questionId}`, input)
