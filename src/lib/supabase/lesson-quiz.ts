import { createClient } from "@/lib/supabase/client"

// Quiz de lição — camada de acesso a dados.
// O gabarito (correct_index) NUNCA é lido pelo cliente aluno: a tabela é
// deny-all no RLS. Professores/admins leem via RPC (checa dono da lição);
// alunos recebem as questões sem gabarito pela rota /api/lesson-quiz/[id].

/** Questão como o PROFESSOR vê (inclui o gabarito). */
export interface QuizQuestionFull {
  id: string
  prompt: string
  options: string[]
  correct_index: number
  explanation: string
  sort_order: number
}

/** Questão como o ALUNO vê (sem gabarito). */
export interface QuizQuestionPublic {
  id: string
  prompt: string
  options: string[]
}

/** Payload de escrita (o id é gerado pelo banco). */
export interface QuizQuestionInput {
  prompt: string
  options: string[]
  correct_index: number
  explanation?: string
}

/** Questões com gabarito — só o dono da lição (ou admin) consegue ler. */
export async function fetchQuizQuestionsForTeacher(
  lessonId: string,
): Promise<QuizQuestionFull[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("get_lesson_quiz_questions", {
    p_lesson_id: lessonId,
  })
  if (error) throw error
  return ((data ?? []) as QuizQuestionFull[]).map((q) => ({
    ...q,
    options: Array.isArray(q.options) ? q.options : [],
  }))
}

/** Substitui todas as questões da lição de uma vez (transacional no banco). */
export async function replaceQuizQuestions(
  lessonId: string,
  questions: QuizQuestionInput[],
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc("replace_lesson_quiz_questions", {
    p_lesson_id: lessonId,
    p_questions: questions.map((q) => ({
      prompt: q.prompt.trim(),
      options: q.options,
      correct_index: q.correct_index,
      explanation: (q.explanation ?? "").trim(),
    })),
  })
  if (error) throw error
}

// ── Cliente do aluno (rotas server-side) ──────────────────────────────────────

export interface QuizResult {
  score: number
  passed: boolean
  passingScore: number
  correctCount: number
  total: number
  xpEarned: number
  review: { questionId: string; correct: boolean; explanation: string }[]
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

/** Busca as questões SEM gabarito para o aluno responder. */
export async function fetchQuizForStudent(
  lessonId: string,
): Promise<{ ok: true; questions: QuizQuestionPublic[]; passingScore: number }
        | { ok: false; error: string }> {
  const headers = await authHeaders()
  if (!headers) return { ok: false, error: "Sessão expirada. Faça login novamente." }
  try {
    const res = await fetch(`/api/lesson-quiz/${lessonId}`, { headers })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: (body as { error?: string }).error ?? "Erro ao carregar o quiz" }
    return { ok: true, ...(body as { questions: QuizQuestionPublic[]; passingScore: number }) }
  } catch {
    return { ok: false, error: "Erro de conexão. Verifique sua internet." }
  }
}

/** Envia as respostas; a correção acontece no servidor. */
export async function submitQuiz(
  lessonId: string,
  answers: Record<string, number>,
): Promise<{ ok: true; result: QuizResult } | { ok: false; error: string }> {
  const headers = await authHeaders()
  if (!headers) return { ok: false, error: "Sessão expirada. Faça login novamente." }
  try {
    const res = await fetch(`/api/lesson-quiz/${lessonId}/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({ answers }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: (body as { error?: string }).error ?? "Erro ao corrigir o quiz" }
    return { ok: true, result: body as QuizResult }
  } catch {
    return { ok: false, error: "Erro de conexão. Verifique sua internet." }
  }
}
