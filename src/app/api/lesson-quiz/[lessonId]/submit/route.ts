import { NextRequest } from "next/server"
import { json, serviceClient, requireUser } from "@/lib/admin-auth"
import { checkRateLimit } from "@/lib/server/rate-limit"

// POST /api/lesson-quiz/[lessonId]/submit — corrige o quiz NO SERVIDOR.
// Recebe { answers: { [questionId]: indiceEscolhido } } e devolve nota,
// aprovação e feedback por questão — nunca o gabarito bruto das erradas
// antes da correção. O XP é creditado pelo cliente (invariante do projeto:
// awardXp fica no cliente para as animações; as RPCs do banco validam).
export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params

  const auth = await requireUser(req)
  if (!auth.ok) return auth.res
  const user = auth.user

  let body: { answers?: Record<string, number> }
  try {
    body = await req.json()
  } catch {
    return json({ error: "Corpo da requisição inválido" }, 400)
  }
  const { answers } = body
  if (typeof answers !== "object" || answers === null) {
    return json({ error: "answers é obrigatório" }, 400)
  }

  const admin = serviceClient()

  // Rate limit: 20 envios de quiz por usuário a cada 10 minutos.
  const rate = await checkRateLimit(admin, user.id, "lesson_quiz_submit", 20, 600)
  if (!rate.allowed) {
    return json({ error: "Muitos envios seguidos. Aguarde um instante." }, 429)
  }

  const { data: lessonRow } = await admin
    .from("lessons")
    .select("id, lesson_type, published, quiz_passing_score, xp_reward")
    .eq("id", lessonId)
    .maybeSingle()

  const lesson = lessonRow as {
    id: string
    lesson_type: string
    published: boolean
    quiz_passing_score: number
    xp_reward: number
  } | null

  if (!lesson || !lesson.published) return json({ error: "Lição não encontrada" }, 404)
  if (lesson.lesson_type !== "quiz") {
    return json({ error: "Esta lição não é um questionário" }, 422)
  }

  const { data: rows } = await admin
    .from("lesson_quiz_questions")
    .select("id, correct_index, explanation")
    .eq("lesson_id", lessonId)
    .order("sort_order")

  const questions = (rows ?? []) as {
    id: string
    correct_index: number
    explanation: string
  }[]
  if (!questions.length) return json({ error: "Questionário sem questões" }, 422)

  let correct = 0
  const review: { questionId: string; correct: boolean; explanation: string }[] = []

  for (const q of questions) {
    const given = answers[q.id]
    const isCorrect = typeof given === "number" && given === q.correct_index
    if (isCorrect) correct++
    review.push({ questionId: q.id, correct: isCorrect, explanation: q.explanation })
  }

  const score = Math.round((correct / questions.length) * 10000) / 100
  const passed = score >= lesson.quiz_passing_score

  return json({
    score,
    passed,
    passingScore: lesson.quiz_passing_score,
    correctCount: correct,
    total: questions.length,
    xpEarned: passed ? lesson.xp_reward : 0,
    review,
  })
}
