import { createClient } from "@/lib/supabase/client"
import type { Lesson, LessonProgress } from "@/lib/supabase/types"

// ── Slug ─────────────────────────────────────────────────────────────────────

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/** Retorna todas as lições publicadas, ordenadas por módulo e ordem. */
export async function fetchPublishedLessons(): Promise<Lesson[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("published", true)
    .order("order", { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Retorna uma lição pelo id (UUID). */
export async function fetchLessonById(id: string): Promise<Lesson | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return data
}

/** Retorna todas as lições criadas por um professor (publicadas ou não). */
export async function fetchTeacherLessons(userId: string): Promise<Lesson[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("created_by", userId)
    .order("order", { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Retorna o progresso do usuário em todas as lições. */
export async function fetchUserProgress(userId: string): Promise<LessonProgress[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId)
  if (error) throw error
  return data ?? []
}

/** Conta quantos alunos completaram lições de um professor. */
export async function fetchTeacherMetrics(lessonIds: string[]) {
  if (lessonIds.length === 0) return { completions: 0 }
  const supabase = createClient()
  const { count } = await supabase
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .in("lesson_id", lessonIds)
    .eq("status", "completed")
  return { completions: count ?? 0 }
}

// ── Escrita ───────────────────────────────────────────────────────────────────

export type LessonFormData = {
  title: string
  module: string
  order: number
  difficulty: "iniciante" | "intermediario" | "avancado"
  content_markdown: string
  starter_code: string
  hidden_tests: string
  libraries: string[]
  xp_reward: number
  time_limit: number
  published: boolean
}

/** Cria uma nova lição e retorna o registro inserido. */
export async function createLesson(
  data: LessonFormData,
  userId: string
): Promise<Lesson> {
  const supabase = createClient()
  const slug = generateSlug(data.title) + "-" + Date.now().toString(36)
  const { data: created, error } = await supabase
    .from("lessons")
    .insert({ ...data, slug, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return created
}

/** Atualiza uma lição existente. */
export async function updateLesson(
  id: string,
  data: Partial<LessonFormData>
): Promise<Lesson> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from("lessons")
    .update(data)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return updated
}

/** Exclui permanentemente uma lição. */
export async function deleteLesson(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("lessons").delete().eq("id", id)
  if (error) throw error
}

/** Alterna o estado publicado/rascunho. */
export async function toggleLessonPublished(
  id: string,
  published: boolean
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("lessons")
    .update({ published })
    .eq("id", id)
  if (error) throw error
}

// ── Progresso ─────────────────────────────────────────────────────────────────

/** Credita XP e marca a lição como concluída via RPC do Supabase. */
export async function awardXp(
  userId: string,
  lessonId: string,
  xp: number
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc("award_xp", {
    p_user_id: userId,
    p_lesson_id: lessonId,
    p_xp: xp,
  })
  if (error) throw error
}

// ── Status helper ─────────────────────────────────────────────────────────────

export type LessonStatus = "completed" | "in-progress" | "locked"

/**
 * Dado o mapa de progresso do usuário e as lições de um módulo (já ordenadas),
 * retorna o status de cada lição.
 *
 * Regra: cada lição desbloqueia somente após a anterior estar concluída.
 */
export function computeModuleStatuses(
  sortedLessons: Lesson[],
  progressMap: Map<string, LessonProgress>
): LessonStatus[] {
  const statuses: LessonStatus[] = []
  let canUnlock = true // a primeira lição está sempre desbloqueada

  for (const lesson of sortedLessons) {
    const prog = progressMap.get(lesson.id)
    if (prog?.status === "completed") {
      statuses.push("completed")
    } else if (canUnlock) {
      statuses.push("in-progress")
      canUnlock = false // as seguintes ficam bloqueadas
    } else {
      statuses.push("locked")
    }
  }

  return statuses
}
