import { createClient } from "@/lib/supabase/client"
import { PUBLIC_LESSON_FIELDS } from "@/lib/supabase/lessons"
import type { Profile, Lesson, TeacherApproval, AuditLog } from "@/lib/supabase/types"

// ── Métricas da plataforma ────────────────────────────────────────────────────

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

export async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
  const supabase = createClient()

  const [usersRes, lessonsRes, completionsRes, approvalsRes, coursesRes, enrollmentsRes, xpRes] = await Promise.all([
    supabase.from("profiles").select("role"),
    supabase.from("lessons").select("published"),
    supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("teacher_approvals").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("courses" as never).select("published"),
    supabase.from("enrollments" as never).select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("total_xp"),
  ])

  const users   = (usersRes.data   ?? []) as Array<Pick<Profile, "role">>
  const lessons = (lessonsRes.data ?? []) as Array<Pick<Lesson, "published">>
  const courses = (coursesRes.data ?? []) as Array<{ published: boolean }>
  const profiles = (xpRes.data    ?? []) as Array<{ total_xp: number }>

  return {
    totalUsers:       users.length,
    totalStudents:    users.filter((u) => u.role === "student").length,
    totalTeachers:    users.filter((u) => u.role === "teacher").length,
    totalAdmins:      users.filter((u) => u.role === "admin").length,
    totalLessons:     lessons.length,
    publishedLessons: lessons.filter((l) => l.published).length,
    totalCompletions: completionsRes.count ?? 0,
    pendingApprovals: approvalsRes.count  ?? 0,
    totalCourses:     courses.length,
    publishedCourses: courses.filter((c) => c.published).length,
    totalEnrollments: enrollmentsRes.count ?? 0,
    totalXpAwarded:   profiles.reduce((s, p) => s + (p.total_xp ?? 0), 0),
  }
}

// ── Atividade recente real ────────────────────────────────────────────────────

export interface RecentActivity {
  id: string
  user: string
  text: string
  ago: string
  tone: "success" | "purple" | "info" | "warning"
}

export async function fetchRecentActivity(): Promise<RecentActivity[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("audit_log")
    .select("id, actor_name, action, target, severity, created_at")
    .order("created_at", { ascending: false })
    .limit(10)

  return (data ?? []).map((row: any) => {
    const action: string = row.action ?? ""
    let text = row.target ?? action
    let tone: RecentActivity["tone"] = "info"

    if (action === "lesson.publish")   { text = `publicou a lição "${row.target}"`; tone = "purple" }
    else if (action === "course.publish") { text = `publicou o curso "${row.target}"`; tone = "purple" }
    else if (action === "xp.award")    { text = `recebeu XP em "${row.target}"`; tone = "success" }
    else if (action === "level.up")    { text = `subiu de nível 🎉`; tone = "success" }
    else if (action === "streak.milestone") { text = `alcançou marco de streak 🔥`; tone = "warning" }
    else if (action === "user.role_change") { text = `teve papel alterado (${row.target})`; tone = "warning" }
    else if (action === "teacher.approve")  { text = `aprovado como professor ✓`; tone = "success" }

    // Formata "há X tempo"
    const diffMs = Date.now() - new Date(row.created_at).getTime()
    const diffMin = Math.round(diffMs / 60000)
    let ago = "agora"
    if (diffMin < 60) ago = `há ${diffMin}min`
    else if (diffMin < 1440) ago = `há ${Math.round(diffMin / 60)}h`
    else ago = `há ${Math.round(diffMin / 1440)}d`

    return { id: row.id, user: row.actor_name, text, ago, tone }
  })
}

// ── Atividade diária para gráfico (14 dias) ───────────────────────────────────

export async function fetchDailyActivity(): Promise<number[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from("lesson_progress")
    .select("completed_at")
    .eq("status", "completed")
    .gte("completed_at", since)
    .order("completed_at")

  // Agrupa por dia (0 = 14 dias atrás, 13 = hoje)
  const counts = new Array(14).fill(0)
  const now = Date.now();
  (data ?? []).forEach((row: any) => {
    if (!row.completed_at) return
    const daysAgo = Math.floor((now - new Date(row.completed_at).getTime()) / 86400000)
    const idx = 13 - Math.min(daysAgo, 13)
    counts[idx]++
  })
  return counts
}

// ── Usuários ──────────────────────────────────────────────────────────────────

export async function fetchAllUsers(): Promise<Profile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function updateUserRole(
  userId: string,
  role: "student" | "teacher" | "admin",
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role } as never)
    .eq("id", userId)
  if (error) throw error
}

// ── Ações privilegiadas via rotas /api/admin/* (service role) ───────────────────

/** Faz POST autenticado para uma rota admin. Lança Error com a mensagem do servidor. */
async function adminFetch(path: string, body: Record<string, unknown>): Promise<unknown> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Sessão expirada. Faça login novamente.")

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Erro na operação")
  return json
}

/** Atualiza campos do perfil de um usuário (nome, email, role, xp, etc.). */
export async function updateUserProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  await adminFetch("/api/admin/users/update", { userId, patch })
}

/** Exclui permanentemente a conta de um usuário (Auth + profile em cascata). */
export async function deleteUser(userId: string): Promise<void> {
  await adminFetch("/api/admin/users/delete", { userId })
}

/** Zera XP/nível/streak/lições e apaga o progresso por lição. */
export async function resetUserProgress(userId: string): Promise<void> {
  await adminFetch("/api/admin/users/reset-progress", { userId })
}

/** Suspende ou reativa a conta (bloqueia/desbloqueia login). */
export async function setUserSuspended(userId: string, suspended: boolean): Promise<void> {
  await adminFetch("/api/admin/users/suspend", { userId, suspended })
}

/** Dispara email de redefinição de senha para o usuário. */
export async function sendPasswordReset(email: string): Promise<void> {
  await adminFetch("/api/admin/users/reset-password", { email })
}

/** Convida um novo usuário por email. */
export async function inviteUser(email: string): Promise<void> {
  await adminFetch("/api/admin/users/invite", { email })
}

/** Invalida sessões: de um usuário (userId) ou de todos (sem userId). */
export async function invalidateSessions(userId?: string): Promise<void> {
  await adminFetch("/api/admin/sessions/invalidate", userId ? { userId } : {})
}

// ── Exports (client-side, sem service role) ─────────────────────────────────────

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Gera e baixa um CSV a partir de uma lista de objetos. */
export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  columns?: (keyof T)[],
): void {
  if (rows.length === 0) return
  const cols = (columns ?? (Object.keys(rows[0]) as (keyof T)[]))
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = cols.join(",")
  const lines = rows.map((r) => cols.map((c) => escape(r[c])).join(","))
  downloadBlob([header, ...lines].join("\n"), filename, "text/csv;charset=utf-8")
}

/** Exporta todos os dados de um usuário (LGPD) como JSON e baixa. */
export async function exportUserDataLGPD(userId: string): Promise<void> {
  const supabase = createClient()
  const [profile, progress, enrollments, badges] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("lesson_progress").select("*").eq("user_id", userId),
    supabase.from("enrollments").select("*").eq("user_id", userId),
    supabase.from("user_badges").select("*").eq("user_id", userId),
  ])
  const payload = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    lesson_progress: progress.data ?? [],
    enrollments: enrollments.data ?? [],
    badges: badges.data ?? [],
  }
  downloadBlob(JSON.stringify(payload, null, 2), `usuario-${userId}-lgpd.json`, "application/json")
}

// ── Lições (admin vê todas) ───────────────────────────────────────────────────

export async function fetchAllLessons(): Promise<Lesson[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select(PUBLIC_LESSON_FIELDS)
    .order("module")
    .order("order", { ascending: true })
  if (error) throw error
  return (data ?? []) as Lesson[]
}

// ── Aprovações de professor ───────────────────────────────────────────────────

export async function fetchPendingApprovals(): Promise<TeacherApproval[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("teacher_approvals")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as TeacherApproval[]
}

export async function approveTeacher(
  approvalId: string,
  reviewerId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient()
  await Promise.all([
    supabase
      .from("teacher_approvals")
      .update({ status: "approved", reviewed_by: reviewerId, reviewed_at: new Date().toISOString() } as never)
      .eq("id", approvalId),
    supabase
      .from("profiles")
      .update({ role: "teacher" } as never)
      .eq("id", userId),
  ])
}

export async function rejectTeacher(
  approvalId: string,
  reviewerId: string,
  reviewNote: string,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("teacher_approvals")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      review_note: reviewNote,
      reviewed_at: new Date().toISOString(),
    } as never)
    .eq("id", approvalId)
  if (error) throw error
}

// ── Analytics reais ───────────────────────────────────────────────────────────

export interface AnalyticsMetrics {
  dau: number
  wau: number
  mau: number
  totalUsers: number
  funnelStarted: number    // completaram pelo menos 1 lição
  funnelCompleted5: number // completaram 5+ lições
  funnelStreak7: number    // têm streak >= 7 dias
}

export async function fetchAnalyticsMetrics(): Promise<AnalyticsMetrics> {
  const supabase = createClient()
  const now = new Date()
  const dayAgo   = new Date(now.getTime() - 1   * 86400000).toISOString()
  const weekAgo  = new Date(now.getTime() - 7   * 86400000).toISOString()
  const monthAgo = new Date(now.getTime() - 30  * 86400000).toISOString()

  const [dauRes, wauRes, mauRes, totalRes, funnelRes, streak7Res] = await Promise.all([
    // DAU: usuários únicos com lição completada hoje
    supabase
      .from("lesson_progress")
      .select("user_id", { count: "exact" })
      .eq("status", "completed")
      .gte("completed_at", dayAgo),
    // WAU: últimos 7 dias
    supabase
      .from("lesson_progress")
      .select("user_id", { count: "exact" })
      .eq("status", "completed")
      .gte("completed_at", weekAgo),
    // MAU: últimos 30 dias
    supabase
      .from("lesson_progress")
      .select("user_id", { count: "exact" })
      .eq("status", "completed")
      .gte("completed_at", monthAgo),
    // Total de usuários
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    // Funil: progresso por usuário
    supabase
      .from("lesson_progress")
      .select("user_id, status")
      .eq("status", "completed"),
    // Streak >= 7
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("current_streak", 7),
  ])

  // DAU/WAU/MAU: conta usuários únicos a partir das linhas retornadas
  const uniqueUsers = (rows: any[]) => new Set(rows.map((r) => r.user_id)).size
  const dauRows = dauRes.data ?? []
  const wauRows = wauRes.data ?? []
  const mauRows = mauRes.data ?? []

  // Funil: agrupa completions por user_id
  const completionsByUser = new Map<string, number>()
  for (const row of (funnelRes.data ?? []) as any[]) {
    completionsByUser.set(row.user_id, (completionsByUser.get(row.user_id) ?? 0) + 1)
  }
  const funnelStarted   = completionsByUser.size                                          // >= 1 lição
  const funnelCompleted5 = [...completionsByUser.values()].filter((c) => c >= 5).length  // >= 5 lições

  return {
    dau:             uniqueUsers(dauRows),
    wau:             uniqueUsers(wauRows),
    mau:             uniqueUsers(mauRows),
    totalUsers:      totalRes.count ?? 0,
    funnelStarted,
    funnelCompleted5,
    funnelStreak7:   streak7Res.count ?? 0,
  }
}

// ── platform_settings ────────────────────────────────────────────────────────

export type PlatformSettings = Record<string, unknown>

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const supabase = createClient()
  const { data } = await supabase
    .from("platform_settings" as never)
    .select("key, value")
  const result: PlatformSettings = {}
  for (const row of (data ?? []) as Array<{ key: string; value: unknown }>) {
    result[row.key] = row.value
  }
  return result
}

export async function savePlatformSettings(settings: PlatformSettings): Promise<void> {
  const supabase = createClient()
  const rows = Object.entries(settings).map(([key, value]) => ({ key, value }))
  const { error } = await supabase
    .from("platform_settings" as never)
    .upsert(rows as never, { onConflict: "key" })
  if (error) throw error
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function fetchAuditLog(limit = 50): Promise<AuditLog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AuditLog[]
}

export async function logAudit(
  actorId: string,
  actorName: string,
  action: string,
  target: string,
  meta: Record<string, unknown> = {},
  severity: "info" | "warning" | "danger" = "info",
): Promise<void> {
  const supabase = createClient()
  await supabase.rpc("log_audit" as never, {
    p_actor_id:   actorId,
    p_actor_name: actorName,
    p_action:     action,
    p_target:     target,
    p_meta:       meta,
    p_severity:   severity,
  } as never)
}
