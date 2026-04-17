import { createClient } from "@/lib/supabase/client"
import type { Profile, Lesson } from "@/lib/supabase/types"

// ── Usuarios ─────────────────────────────────────────────────────────────────

/** Busca todos os usuarios da plataforma (admin only via RLS). */
export async function fetchAllUsers(): Promise<Profile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Altera o role de um usuario. */
export async function updateUserRole(
  userId: string,
  role: "student" | "teacher" | "admin"
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role } as never)
    .eq("id", userId)
  if (error) throw error
}

// ── Metricas da plataforma ───────────────────────────────────────────────────

export interface PlatformMetrics {
  totalUsers: number
  totalStudents: number
  totalTeachers: number
  totalAdmins: number
  totalLessons: number
  publishedLessons: number
  totalCompletions: number
}

export async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
  const supabase = createClient()

  const [usersRes, lessonsRes, completionsRes] = await Promise.all([
    supabase.from("profiles").select("role"),
    supabase.from("lessons").select("published"),
    supabase
      .from("lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
  ])

  const users = usersRes.data ?? []
  const lessons = lessonsRes.data ?? []

  return {
    totalUsers: users.length,
    totalStudents: users.filter((u) => u.role === "student").length,
    totalTeachers: users.filter((u) => u.role === "teacher").length,
    totalAdmins: users.filter((u) => u.role === "admin").length,
    totalLessons: lessons.length,
    publishedLessons: lessons.filter((l) => l.published).length,
    totalCompletions: completionsRes.count ?? 0,
  }
}

// ── Licoes (admin ve todas) ──────────────────────────────────────────────────

/** Busca TODAS as licoes da plataforma (admin). */
export async function fetchAllLessons(): Promise<Lesson[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .order("module")
    .order("order", { ascending: true })
  if (error) throw error
  return data ?? []
}
