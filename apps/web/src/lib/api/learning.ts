import type {
  ActivityDay, Lesson, LessonProgress, ProjectFile, QuizQuestionFull, QuizQuestionInput, QuizQuestionPublic, QuizResult,
  SubmissionResult,
} from "@levelusp/contracts"
import { api, ApiError } from "./client"

export const fetchUserProgress = () => api.get<LessonProgress[]>("/me/progress")
export async function fetchCompletedLessonIds(): Promise<Set<string>> {
  return new Set(await api.get<string[]>("/me/progress/completed"))
}

export async function fetchProgressSnapshot(lessonId: string): Promise<ProjectFile[] | null> {
  const { files } = await api.get<{ files: ProjectFile[] | null }>(`/lessons/${lessonId}/snapshot`)
  return files
}
export const saveProgressSnapshot = (lessonId: string, files: ProjectFile[]) => api.put<void>(`/lessons/${lessonId}/snapshot`, { files })

export interface CompletionResult {
  lesson_completed: boolean
  xp_awarded: number
  new_badges: SubmissionResult["new_badges"]
  level_up: boolean
  new_level: number
}

/** Conclui uma lição teórica (sem avaliação). */
export const completeTheoryLesson = (lessonId: string) => api.post<CompletionResult>(`/lessons/${lessonId}/complete`)

export type EvaluateError =
  | { type: "unauthenticated" }
  | { type: "timeout"; message: string }
  | { type: "not_found" }
  | { type: "rate_limited"; message: string }
  | { type: "server_error"; message: string }
  | { type: "network_error" }

export type EvaluateResponse = { ok: true; result: SubmissionResult } | { ok: false; error: EvaluateError }

/**
 * "Verificar resposta": a API corrige no executor isolado e, se aprovado,
 * já conclui a lição e credita o XP. O gabarito nunca chega ao navegador.
 */
export async function evaluateOnServer(lessonId: string, files: ProjectFile[]): Promise<EvaluateResponse> {
  try {
    const result = await api.post<SubmissionResult>(`/lessons/${lessonId}/submissions`, {
      files: files.map((f) => ({ path: f.path, content: f.content })),
    })
    return { ok: true, result }
  } catch (err) {
    if (!(err instanceof ApiError)) return { ok: false, error: { type: "network_error" } }
    if (err.status === 0) return { ok: false, error: { type: "network_error" } }
    if (err.status === 401) return { ok: false, error: { type: "unauthenticated" } }
    if (err.status === 404) return { ok: false, error: { type: "not_found" } }
    if (err.status === 429) return { ok: false, error: { type: "rate_limited", message: err.message } }
    return { ok: false, error: { type: "server_error", message: err.message } }
  }
}

export const fetchUserActivity = (userId: string) => api.get<ActivityDay[]>(`/users/${userId}/activity`)

// ── Quiz de lição ────────────────────────────────────────────────────────────
export const fetchQuizForStudent = (lessonId: string) => api.get<QuizQuestionPublic[]>(`/lessons/${lessonId}/quiz`)
export const fetchQuizQuestionsForTeacher = (lessonId: string) => api.get<QuizQuestionFull[]>(`/lessons/${lessonId}/quiz/authoring`)
export const replaceQuizQuestions = (lessonId: string, questions: QuizQuestionInput[]) =>
  api.put<QuizQuestionFull[]>(`/lessons/${lessonId}/quiz`, { questions })
export const submitQuiz = (lessonId: string, answers: Record<string, number>) =>
  api.post<QuizResult>(`/lessons/${lessonId}/quiz/submissions`, { answers })

// ── Utilitários puros (antes em lib/supabase/lessons.ts) ─────────────────────
/**
 * Interpreta um snapshot/seed de arquivos de forma tolerante:
 * ProjectFile[] | string JSON | código legado (string simples) | vazio.
 */
export function parseProjectFiles(raw: unknown, fallback: ProjectFile[] = []): ProjectFile[] {
  if (Array.isArray(raw)) {
    const valid = raw.filter((f): f is ProjectFile => !!f && typeof f.path === "string" && typeof f.content === "string")
    return valid.length ? valid : fallback
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return parseProjectFiles(JSON.parse(raw), fallback)
    } catch {
      return [{ path: "main.py", content: raw }]
    }
  }
  return fallback
}

/** Arquivos iniciais: starter_files do professor; se vazio, starter_code. */
export function resolveStarterFiles(lesson: Pick<Lesson, "starter_files" | "starter_code">): ProjectFile[] {
  const seeded = parseProjectFiles(lesson.starter_files)
  if (seeded.length) return seeded
  return [{ path: "main.py", content: lesson.starter_code ?? "" }]
}

export type TrailStatus = "completed" | "in-progress" | "locked"

/** Cada lição desbloqueia somente após a anterior estar concluída. */
export function computeModuleStatuses(sortedLessons: Pick<Lesson, "id">[], progressMap: Map<string, Pick<LessonProgress, "status">>): TrailStatus[] {
  const statuses: TrailStatus[] = []
  let canUnlock = true
  for (const lesson of sortedLessons) {
    if (progressMap.get(lesson.id)?.status === "completed") statuses.push("completed")
    else if (canUnlock) {
      statuses.push("in-progress")
      canUnlock = false
    } else statuses.push("locked")
  }
  return statuses
}
