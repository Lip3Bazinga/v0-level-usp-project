import { NextRequest } from "next/server"
import { json, serviceClient, requireUser } from "@/lib/admin-auth"
import { getExamByCourse, attemptExpiresAt, type AttemptRow } from "@/lib/server/exam"

// POST /api/exam/[courseId]/submit — corrige a tentativa NO SERVIDOR.
// O cliente envia { attemptId, answers: { [questionId]: indiceEscolhido } }
// e recebe score, aprovação e correção por questão — nunca o gabarito bruto.
export const runtime = "nodejs"

// Tolerância além do time limit para latência de rede
const GRACE_MS = 2 * 60_000

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params

  const auth = await requireUser(req)
  if (!auth.ok) return auth.res
  const user = auth.user

  let body: { attemptId?: string; answers?: Record<string, number> }
  try {
    body = await req.json()
  } catch {
    return json({ error: "Corpo da requisição inválido" }, 400)
  }
  const { attemptId, answers } = body
  if (!attemptId || typeof answers !== "object" || answers === null) {
    return json({ error: "attemptId e answers são obrigatórios" }, 400)
  }

  const admin = serviceClient()
  const exam = await getExamByCourse(admin, courseId)
  if (!exam) return json({ error: "Prova não encontrada" }, 404)

  const { data: attemptRow } = await admin
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .eq("exam_id", exam.id)
    .maybeSingle()
  const attempt = attemptRow as AttemptRow | null
  if (!attempt) return json({ error: "Tentativa não encontrada" }, 404)
  if (attempt.submitted_at !== null) {
    return json({ error: "Esta tentativa já foi enviada." }, 409)
  }
  if (new Date() > new Date(attemptExpiresAt(attempt, exam).getTime() + GRACE_MS)) {
    // Marca como expirada (nota zero) para liberar nova tentativa após cooldown
    await admin
      .from("exam_attempts")
      .update({ submitted_at: new Date().toISOString(), score: 0, passed: false, answers: {} })
      .eq("id", attempt.id)
    return json({ error: "Tempo esgotado — a tentativa expirou. Tente novamente." }, 408)
  }

  // Correção server-side
  const { data: questionRows } = await admin
    .from("exam_questions")
    .select("id, correct_index, explanation")
    .eq("exam_id", exam.id)
    .in("id", attempt.question_ids)
  const questions = (questionRows ?? []) as { id: string; correct_index: number; explanation: string }[]
  if (!questions.length) return json({ error: "Prova sem questões" }, 500)

  let correct = 0
  const review: { questionId: string; correct: boolean; explanation: string }[] = []
  const sanitizedAnswers: Record<string, number> = {}

  for (const q of questions) {
    const given = answers[q.id]
    const isCorrect = typeof given === "number" && given === q.correct_index
    if (typeof given === "number") sanitizedAnswers[q.id] = given
    if (isCorrect) correct++
    review.push({
      questionId: q.id,
      correct: isCorrect,
      explanation: q.explanation,
    })
  }

  const score = Math.round((correct / questions.length) * 10000) / 100
  const passed = score >= exam.passing_score

  const { error: updateError } = await admin
    .from("exam_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      answers: sanitizedAnswers,
      score,
      passed,
    })
    .eq("id", attempt.id)
  if (updateError) return json({ error: "Erro ao salvar a tentativa" }, 500)

  // Notificação interna de aprovação — falha aqui não pode quebrar a resposta.
  if (passed) {
    try {
      await admin.from("notifications").insert({
        user_id: user.id,
        title: "Prova aprovada! 🎉",
        body: `Você tirou ${score.toLocaleString("pt-BR")} na prova final. Agora conclua o projeto final para emitir seu certificado.`,
        kind: "success",
        href: `/cursos/${courseId}`,
      })
    } catch { /* notificação é melhor-esforço */ }
  }

  return json({
    score,
    passed,
    passingScore: exam.passing_score,
    correctCount: correct,
    total: questions.length,
    review,
  })
}
