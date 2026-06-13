import { createClient } from "@/lib/supabase/client"
import type { Lesson, LessonProgress, Checkpoint, ProjectFile } from "@/lib/supabase/types"

// ── Slug ──────────────────────────────────────────────────────────────────────

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

// ── Leitura ───────────────────────────────────────────────────────────────────

// Campos públicos — hidden_tests é bloqueado também no banco (column-level grant).
// select("*") em lessons FALHA com permission denied para anon/authenticated; use sempre esta lista.
export const PUBLIC_LESSON_FIELDS = [
  "id", "title", "slug", "module", "module_id", "order", "difficulty", "description",
  "content_markdown", "starter_code", "starter_files", "checkpoints", "libraries",
  "xp_reward", "time_limit", "lesson_type", "course_id", "created_by", "published",
  "created_at", "updated_at",
].join(", ")

/** Retorna todas as lições publicadas, ordenadas por course_id e ordem. */
export async function fetchPublishedLessons(): Promise<Lesson[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select(PUBLIC_LESSON_FIELDS)
    .eq("published", true)
    .order("course_id", { ascending: true, nullsFirst: false })
    .order("order", { ascending: true })
  if (error) throw error
  return (data ?? []) as Lesson[]
}

/** Retorna uma lição pelo id (UUID) sem hidden_tests — para uso em páginas do aluno. */
export async function fetchLessonById(id: string): Promise<Lesson | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select(PUBLIC_LESSON_FIELDS)
    .eq("id", id)
    .single()
  if (error) return null
  return data as Lesson
}

/** Retorna a lição completa incluindo hidden_tests — exclusivo do painel do professor.
 *  hidden_tests vem via RPC (SECURITY DEFINER) pois a coluna não é mais legível por clientes. */
export async function fetchLessonByIdFull(id: string): Promise<Lesson | null> {
  const supabase = createClient()
  const [{ data, error }, { data: tests }] = await Promise.all([
    supabase.from("lessons").select(PUBLIC_LESSON_FIELDS).eq("id", id).single(),
    supabase.rpc("get_lesson_hidden_tests" as never, { p_lesson_id: id } as never),
  ])
  if (error) return null
  return { ...(data as object), hidden_tests: (tests as string | null) ?? "" } as Lesson
}

/** Retorna todas as lições criadas por um professor (publicadas ou não). */
export async function fetchTeacherLessons(userId: string): Promise<Lesson[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select(PUBLIC_LESSON_FIELDS)
    .eq("created_by", userId)
    .order("order", { ascending: true })
  if (error) throw error
  return (data ?? []) as Lesson[]
}

/** Retorna o progresso do usuário em todas as lições. */
export async function fetchUserProgress(userId: string): Promise<LessonProgress[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []) as LessonProgress[]
}

// ── Arquivos de projeto (multi-arquivo) ────────────────────────────────────────

/**
 * Interpreta um snapshot/seed de arquivos de forma tolerante:
 * - ProjectFile[] válido → retornado como está
 * - string JSON de ProjectFile[] → parseado
 * - string simples (código legado) → [{ path: "main.py", content }]
 * - vazio/nulo → fallback fornecido
 */
export function parseProjectFiles(
  raw: unknown,
  fallback: ProjectFile[] = [],
): ProjectFile[] {
  if (Array.isArray(raw)) {
    const valid = raw.filter(
      (f): f is ProjectFile =>
        !!f && typeof f.path === "string" && typeof f.content === "string",
    )
    return valid.length ? valid : fallback
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return parseProjectFiles(parsed, fallback)
    } catch {
      // Código legado salvo como string simples
      return [{ path: "main.py", content: raw }]
    }
  }
  return fallback
}

/**
 * Resolve os arquivos iniciais de uma lição para o aluno:
 * usa starter_files (seed do professor); se vazio, cai para starter_code.
 */
export function resolveStarterFiles(lesson: Lesson): ProjectFile[] {
  const seeded = parseProjectFiles(lesson.starter_files)
  if (seeded.length) return seeded
  return [{ path: "main.py", content: lesson.starter_code ?? "" }]
}

/** Carrega o snapshot de arquivos salvos pelo aluno para uma lição (ou null). */
export async function fetchProgressSnapshot(
  userId: string,
  lessonId: string,
): Promise<ProjectFile[] | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("lesson_progress")
    .select("code_snapshot")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle()
  const snap = (data as { code_snapshot: string | null } | null)?.code_snapshot
  if (!snap) return null
  const files = parseProjectFiles(snap)
  return files.length ? files : null
}

/** Salva (upsert) o snapshot de arquivos do aluno para uma lição. */
export async function saveProgressSnapshot(
  userId: string,
  lessonId: string,
  files: ProjectFile[],
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        code_snapshot: JSON.stringify(files),
        status: "in_progress",
      } as never,
      { onConflict: "user_id,lesson_id" },
    )
  if (error) throw error
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
  description: string
  module: string
  order: number
  difficulty: "iniciante" | "intermediario" | "avancado"
  content_markdown: string
  starter_code: string
  starter_files: ProjectFile[]
  hidden_tests: string
  checkpoints: Checkpoint[]
  libraries: string[]
  xp_reward: number
  time_limit: number
  lesson_type: "coding" | "theory"
  published: boolean
  course_id?: string | null
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
    .insert({ ...data, slug, created_by: userId } as never)
    .select(PUBLIC_LESSON_FIELDS)
    .single()
  if (error) throw error
  return created as Lesson
}

/** Atualiza uma lição existente. */
export async function updateLesson(
  id: string,
  data: Partial<LessonFormData>
): Promise<Lesson> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from("lessons")
    .update(data as never)
    .eq("id", id)
    .select(PUBLIC_LESSON_FIELDS)
    .single()
  if (error) throw error
  return updated as Lesson
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
    .update({ published } as never)
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
  const { error } = await supabase.rpc("award_xp" as never, {
    p_user_id: userId,
    p_lesson_id: lessonId,
    p_xp: xp,
  } as never)
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
  let canUnlock = true

  for (const lesson of sortedLessons) {
    const prog = progressMap.get(lesson.id)
    if (prog?.status === "completed") {
      statuses.push("completed")
    } else if (canUnlock) {
      statuses.push("in-progress")
      canUnlock = false
    } else {
      statuses.push("locked")
    }
  }

  return statuses
}

// ── Activity map ─────────────────────────────────────────────────────────────

export interface ActivityDay {
  date: Date
  xp: number
  activities: number
}

/**
 * Agrega lesson_progress.completed_at do usuário por dia nos últimos 365 dias.
 * Retorna um array de 365 entradas (um por dia), sem gaps.
 */
export async function fetchUserActivity(userId: string): Promise<ActivityDay[]> {
  const supabase = createClient()

  const since = new Date()
  since.setDate(since.getDate() - 364)
  since.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from("lesson_progress")
    .select("xp_earned, completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("completed_at", since.toISOString())

  // Agrupa por data local (YYYY-MM-DD)
  const byDate = new Map<string, { xp: number; activities: number }>()
  for (const row of (data ?? []) as any[]) {
    if (!row.completed_at) continue
    const key = new Date(row.completed_at).toLocaleDateString("sv-SE") // YYYY-MM-DD
    const cur = byDate.get(key) ?? { xp: 0, activities: 0 }
    byDate.set(key, { xp: cur.xp + (row.xp_earned ?? 0), activities: cur.activities + 1 })
  }

  // Gera array de 365 dias (do mais antigo ao mais recente)
  const result: ActivityDay[] = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const key = d.toLocaleDateString("sv-SE")
    const entry = byDate.get(key) ?? { xp: 0, activities: 0 }
    result.push({ date: d, xp: entry.xp, activities: entry.activities })
  }
  return result
}

// ── Streak diário ─────────────────────────────────────────────────────────────

/**
 * Verifica se o usuário já fez login hoje e, se não, incrementa o streak.
 * Retorna { streakUpdated, newStreak } para acionar a animação.
 */
export async function checkAndUpdateDailyStreak(
  userId: string
): Promise<{ streakUpdated: boolean; newStreak: number }> {
  const supabase = createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_streak, last_login_date")
    .eq("id", userId)
    .single()

  if (!profile) return { streakUpdated: false, newStreak: 0 }

  const today = new Date().toISOString().split("T")[0]
  const lastLogin = (profile as any).last_login_date as string | null

  if (lastLogin === today) {
    return { streakUpdated: false, newStreak: (profile as any).current_streak ?? 0 }
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  const isConsecutive = lastLogin === yesterday
  const newStreak = isConsecutive ? ((profile as any).current_streak ?? 0) + 1 : 1

  await supabase
    .from("profiles")
    .update({
      current_streak: newStreak,
      last_login_date: today,
      max_streak: Math.max((profile as any).current_streak ?? 0, newStreak),
    } as never)
    .eq("id", userI