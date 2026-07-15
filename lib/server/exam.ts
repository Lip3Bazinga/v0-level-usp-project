import { SupabaseClient } from "@supabase/supabase-js"

// Helpers server-side da prova final. Todas as leituras de exam_questions
// acontecem aqui, via service role — o gabarito nunca sai do servidor.

export interface ExamRow {
  id: string
  course_id: string
  title: string
  description: string
  passing_score: number
  time_limit_minutes: number
  cooldown_minutes: number
  active: boolean
}

export interface AttemptRow {
  id: string
  exam_id: string
  user_id: string
  question_ids: string[]
  answers: Record<string, number>
  score: number | null
  passed: boolean | null
  started_at: string
  submitted_at: string | null
}

/** Lições publicadas do curso que o usuário ainda não concluiu. */
export async function getRemainingLessons(
  admin: SupabaseClient,
  courseId: string,
  userId: string,
): Promise<{ total: number; remaining: number }> {
  const { data: lessons } = await admin
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("published", true)

  const lessonIds = ((lessons ?? []) as { id: string }[]).map((l) => l.id)
  if (!lessonIds.length) return { total: 0, remaining: 0 }

  const { data: progress } = await admin
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in("lesson_id", lessonIds)

  const done = new Set(((progress ?? []) as { lesson_id: string }[]).map((p) => p.lesson_id))
  return { total: lessonIds.length, remaining: lessonIds.filter((id) => !done.has(id)).length }
}

/**
 * Elegibilidade para a prova: todas as lições publicadas do curso concluídas,
 * EXCETO as do módulo de certificação (o projeto final é liberado após a prova).
 */
export async function getExamEligibility(
  admin: SupabaseClient,
  courseId: string,
  userId: string,
): Promise<{ eligible: boolean; remaining: number; total: number }> {
  const { data: lessons } = await admin
    .from("lessons")
    .select("id, module")
    .eq("course_id", courseId)
    .eq("published", true)

  const rows = (lessons ?? []) as { id: string; module: string }[]
  const required = rows.filter((l) => !l.module.toLowerCase().includes("certificação"))
  if (!required.length) return { eligible: false, remaining: 0, total: 0 }

  const { data: progress } = await admin
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in("lesson_id", required.map((l) => l.id))

  const done = new Set(((progress ?? []) as { lesson_id: string }[]).map((p) => p.lesson_id))
  const remaining = required.filter((l) => !done.has(l.id)).length
  return { eligible: remaining === 0, remaining, total: required.length }
}

export async function getExamByCourse(
  admin: SupabaseClient,
  courseId: string,
): Promise<ExamRow | null> {
  const { data } = await admin
    .from("exams")
    .select("*")
    .eq("course_id", courseId)
    .eq("active", true)
    .maybeSingle()
  return (data as ExamRow | null) ?? null
}

export async function getLatestAttempts(
  admin: SupabaseClient,
  examId: string,
  userId: string,
): Promise<AttemptRow[]> {
  const { data } = await admin
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(20)
  return ((data ?? []) as AttemptRow[])
}

export function attemptExpiresAt(attempt: AttemptRow, exam: ExamRow): Date {
  return new Date(new Date(attempt.started_at).getTime() + exam.time_limit_minutes * 60_000)
}

/** Fim do cooldown a partir da última tentativa submetida e reprovada. */
export function cooldownUntil(attempts: AttemptRow[], exam: ExamRow): Date | null {
  const lastSubmitted = attempts.find((a) => a.submitted_at !== null)
  if (!lastSubmitted || lastSubmitted.passed) return null
  const until = new Date(
    new Date(lastSubmitted.submitted_at!).getTime() + exam.cooldown_minutes * 60_000,
  )
  return until > new Date() ? until : null
}
