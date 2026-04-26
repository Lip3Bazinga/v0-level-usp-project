import { createClient } from "@/lib/supabase/client"
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

// ── Lições (admin vê todas) ───────────────────────────────────────────────────

export async function fetchAllLessons(): Promise<Lesson[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
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
