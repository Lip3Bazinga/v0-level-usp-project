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

/** Totais do painel (`GET /admin/metrics`). */
export const fetchPlatformMetrics = (): Promise<PlatformMetrics> => api.get<PlatformMetrics>("/admin/metrics")
/** Conclusões recentes para o feed do painel. */
export const fetchRecentActivity = (limit = RECENT_ACTIVITY_SIZE): Promise<RecentActivity[]> =>
  api.get<RecentActivity[]>("/admin/activity/recent", { query: { limit } })
/** Conclusões por dia nos últimos 30 dias, do mais antigo a hoje. */
export const fetchDailyActivity = (): Promise<number[]> => api.get<number[]>("/admin/activity/daily")
/** Indicadores de engajamento do painel (`GET /admin/analytics`). */
export const fetchAnalyticsMetrics = (): Promise<AnalyticsMetrics> => api.get<AnalyticsMetrics>("/admin/analytics")
/** Todas as lições, publicadas ou não, sem gabarito. */
export const fetchAdminLessons = (): Promise<Lesson[]> => api.get<Lesson[]>("/admin/lessons")

/** Todos os perfis, inclusive suspensos. */
export const fetchAdminUsers = (): Promise<Profile[]> => api.get<Profile[]>("/admin/users")
/** Edita papel, suspensão e dados básicos (`PATCH /admin/users/:id`); a API recusa o admin se rebaixar. */
export const updateUserProfile = (userId: string, patch: AdminUpdateUserInput): Promise<Profile> =>
  api.patch<Profile>(`/admin/users/${userId}`, patch)
/** Troca só o papel do usuário. */
export const updateUserRole = (userId: string, role: Profile["role"]): Promise<Profile> => updateUserProfile(userId, { role })
/** Suspende (derruba as sessões na hora) ou reativa o usuário. */
export const setUserSuspended = (userId: string, suspended: boolean): Promise<Profile> => updateUserProfile(userId, { suspended })
/** Exclui a conta e todos os dados do usuário. */
export const deleteUser = (userId: string): Promise<void> => api.delete(`/admin/users/${userId}`)
/** Zera XP, progresso, submissões e badges do usuário. */
export const resetUserProgress = (userId: string): Promise<void> => api.post<void>(`/admin/users/${userId}/reset-progress`)
/** Envia ao usuário o link de redefinição de senha. */
export const sendPasswordReset = (userId: string): Promise<OkResponse> => api.post<OkResponse>(`/admin/users/${userId}/password-reset`)
/** Cria a conta sem senha e envia o convite (409 se o e-mail já existe). */
export const inviteUser = (email: string, fullName?: string): Promise<Profile> =>
  api.post<Profile, InviteUserInput>("/admin/users/invite", { email, full_name: fullName })
/** Exportação LGPD dos dados de um usuário. */
export const fetchUserDataExport = (userId: string): Promise<UserDataExport> => api.get<UserDataExport>(`/admin/users/${userId}/export`)
/** Encerra as sessões de um usuário ou, sem `userId`, de todos. */
export const invalidateSessions = (userId?: string): Promise<void> =>
  api.post<void, InvalidateSessionsInput>("/admin/sessions/invalidate", userId ? { user_id: userId } : {})

/** Solicitações de professor; pendentes por padrão, em ordem de chegada. */
export const fetchTeacherApprovals = (status: "pending" | "all" = "pending"): Promise<TeacherApproval[]> =>
  api.get<TeacherApproval[]>("/admin/teacher-approvals", { query: { status } })
/** Aprova e promove o usuário a professor (a nota vai na notificação). */
export const approveTeacher = (approvalId: string, note?: string): Promise<void> =>
  api.post<void, ReviewTeacherInput>(`/admin/teacher-approvals/${approvalId}/approve`, { note })
/** Rejeita a solicitação (a nota vai na notificação). */
export const rejectTeacher = (approvalId: string, note?: string): Promise<void> =>
  api.post<void, ReviewTeacherInput>(`/admin/teacher-approvals/${approvalId}/reject`, { note })

/** Configurações da plataforma (chave → valor). */
export const fetchPlatformSettings = (): Promise<PlatformSettings> => api.get<PlatformSettings>("/admin/settings")
/** Grava só as chaves enviadas e devolve todas. */
export const updatePlatformSettings = (settings: PlatformSettings): Promise<PlatformSettings> => api.put<PlatformSettings>("/admin/settings", settings)
/** Trilha de auditoria, mais recentes primeiro. */
export const fetchAuditLog = (limit = AUDIT_LOG_SIZE): Promise<AuditLog[]> => api.get<AuditLog[]>("/admin/audit", { query: { limit } })

/** Espelha o `AdminExamSummary` da API, que ainda não está em @levelusp/contracts. */
export interface AdminExamSummary {
  id: string
  course_id: string
  course_title: string
  title: string
}
/** Provas finais com o título do curso. */
export const fetchAdminExams = (): Promise<AdminExamSummary[]> => api.get<AdminExamSummary[]>("/admin/exams")
/** Banco de questões da prova, com gabarito. */
export const fetchAdminExamQuestions = (examId: string): Promise<AdminExamQuestion[]> =>
  api.get<AdminExamQuestion[]>(`/admin/exams/${examId}/questions`)
/** Adiciona uma questão ao banco da prova. */
export const createExamQuestion = (examId: string, input: ExamQuestionInput): Promise<AdminExamQuestion> =>
  api.post<AdminExamQuestion>(`/admin/exams/${examId}/questions`, input)
/** Atualiza os campos enviados da questão. */
export const updateExamQuestion = (questionId: string, input: ExamQuestionUpdateInput): Promise<AdminExamQuestion> =>
  api.patch<AdminExamQuestion>(`/admin/exam-questions/${questionId}`, input)
