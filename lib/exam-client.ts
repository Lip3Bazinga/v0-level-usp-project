import { createClient } from "@/lib/supabase/client"

// Cliente das APIs de prova e certificação. Todas as chamadas são autenticadas
// com o JWT da sessão; a correção acontece 100% no servidor.

export interface ExamStatus {
  exam: {
    title: string
    description: string
    passingScore: number
    timeLimitMinutes: number
    cooldownMinutes: number
    questionCount: number
  }
  eligible: boolean
  lessonsRemaining: number
  lessonsTotal: number
  attemptsCount: number
  bestScore: number | null
  passed: boolean
  passedScore: number | null
  cooldownUntil: string | null
  inProgressAttemptId: string | null
  inProgressExpiresAt: string | null
}

export interface ExamQuestion {
  id: string
  prompt: string
  options: string[]
}

export interface ExamStart {
  attemptId: string
  expiresAt: string
  timeLimitMinutes: number
  questions: ExamQuestion[]
  resumed: boolean
}

export interface ExamResult {
  score: number
  passed: boolean
  passingScore: number
  correctCount: number
  total: number
  review: { questionId: string; correct: boolean; explanation: string }[]
}

export interface CertificateIssue {
  issued: boolean
  alreadyIssued: boolean
  verificationCode: string
  issuedAt: string
  examScore: number
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<
  { ok: true; data: T } | { ok: false; status: number; error: string; extra?: Record<string, unknown> }
> {
  const headers = await authHeaders()
  if (!headers) return { ok: false, status: 401, error: "Não autenticado" }
  try {
    const res = await fetch(url, { ...init, headers })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: (body as { error?: string }).error ?? "Erro inesperado",
        extra: body as Record<string, unknown>,
      }
    }
    return { ok: true, data: body as T }
  } catch {
    return { ok: false, status: 0, error: "Erro de conexão. Verifique sua internet." }
  }
}

export function fetchExamStatus(courseId: string) {
  return request<ExamStatus>(`/api/exam/${courseId}`)
}

export function startExam(courseId: string) {
  return request<ExamStart>(`/api/exam/${courseId}/start`, { method: "POST" })
}

export function submitExam(courseId: string, attemptId: string, answers: Record<string, number>) {
  return request<ExamResult>(`/api/exam/${courseId}/submit`, {
    method: "POST",
    body: JSON.stringify({ attemptId, answers }),
  })
}

export function issueCertificate(courseId: string) {
  return request<CertificateIssue>(`/api/certificate/issue`, {
    method: "POST",
    body: JSON.stringify({ courseId }),
  })
}

/** Certificado já emitido do usuário para o curso (leitura direta, RLS own). */
export async function fetchMyCertificate(courseId: string, userId: string): Promise<{
  verification_code: string
  issued_at: string
  exam_score: number
} | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("certificates" as never)
    .select("verification_code, issued_at, exam_score")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle()
  return data as { verification_code: string; issued_at: string; exam_score: number } | null
}

/** Certificado do usuário com o título do curso resolvido (para o perfil). */
export interface MyCertificate {
  verification_code: string
  issued_at: string
  exam_score: number
  course_id: string
  course_title: string
}

/** Todos os certificados do usuário (RLS own), com título do curso via segunda query. */
export async function fetchMyCertificates(userId: string): Promise<MyCertificate[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("certificates" as never)
    .select("verification_code, issued_at, exam_score, course_id")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false })
  const certs = (data ?? []) as {
    verification_code: string
    issued_at: string
    exam_score: number
    course_id: string
  }[]
  if (!certs.length) return []

  // Resolve títulos dos cursos em uma única query
  const courseIds = [...new Set(certs.map((c) => c.course_id))]
  const { data: courseRows } = await supabase
    .from("courses")
    .select("id, title")
    .in("id", courseIds)
  const titleById = new Map(
    ((courseRows ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]),
  )

  return certs.map((c) => ({
    ...c,
    exam_score: Number(c.exam_score),
    course_title: titleById.get(c.course_id) ?? "Curso",
  }))
}
