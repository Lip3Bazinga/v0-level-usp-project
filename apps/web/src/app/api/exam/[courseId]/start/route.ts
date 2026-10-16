import { NextRequest } from "next/server"
import { json, serviceClient, requireUser } from "@/lib/admin-auth"
import {
  getExamByCourse,
  getExamEligibility,
  getLatestAttempts,
  cooldownUntil,
  attemptExpiresAt,
  type AttemptRow,
} from "@/lib/server/exam"
import { checkRateLimit } from "@/lib/server/rate-limit"

// POST /api/exam/[courseId]/start — inicia (ou retoma) uma tentativa.
// Retorna as questões SEM o gabarito (id, prompt, options apenas).
export const runtime = "nodejs"

interface PublicQuestion {
  id: string
  prompt: string
  options: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params

  const auth = await requireUser(req)
  if (!auth.ok) return auth.res
  const user = auth.user

  const admin = serviceClient()

  // Rate limit, prova e elegibilidade não dependem entre si — em paralelo.
  const [rate, exam, eligibility] = await Promise.all([
    checkRateLimit(admin, user.id, "exam_start", 10, 3600),
    getExamByCourse(admin, courseId),
    getExamEligibility(admin, courseId, user.id),
  ])
  if (!rate.allowed) {
    return json({ error: "Muitas tentativas de iniciar a prova. Aguarde alguns minutos." }, 429)
  }
  if (!exam) return json({ error: "Este curso não possui prova final" }, 404)

  if (!eligibility.eligible) {
    return json(
      { error: `Conclua todas as lições antes da prova (faltam ${eligibility.remaining}).` },
      403,
    )
  }

  const attempts = await getLatestAttempts(admin, exam.id, user.id)
  if (attempts.some((a) => a.submitted_at !== null && a.passed)) {
    return json({ error: "Você já foi aprovado nesta prova." }, 409)
  }
  const cooldown = cooldownUntil(attempts, exam)
  if (cooldown) {
    return json(
      { error: "Aguarde o intervalo entre tentativas.", cooldownUntil: cooldown.toISOString() },
      429,
    )
  }

  // Carrega as questões (service role — inclui gabarito, que NÃO será enviado)
  const { data: questionRows, error: qError } = await admin
    .from("exam_questions")
    .select("id, prompt, options")
    .eq("exam_id", exam.id)
    .eq("active", true)
    .order("sort_order")
  if (qError || !questionRows?.length) {
    return json({ error: "Prova sem questões cadastradas" }, 500)
  }
  const allQuestions = questionRows as unknown as PublicQuestion[]

  // Retoma tentativa aberta não expirada, mantendo a mesma ordem de questões
  const open = attempts.find(
    (a) => a.submitted_at === null && attemptExpiresAt(a, exam) > new Date(),
  )
  if (open) {
    const byId = new Map(allQuestions.map((q) => [q.id, q]))
    const ordered = open.question_ids
      .map((id) => byId.get(id))
      .filter((q): q is PublicQuestion => !!q)
    return json({
      attemptId: open.id,
      expiresAt: attemptExpiresAt(open, exam).toISOString(),
      timeLimitMinutes: exam.time_limit_minutes,
      questions: ordered.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
      resumed: true,
    })
  }

  const shuffled = shuffle(allQuestions)
  const { data: created, error: insertError } = await admin
    .from("exam_attempts")
    .insert({
      exam_id: exam.id,
      user_id: user.id,
      question_ids: shuffled.map((q) => q.id),
    })
    .select()
    .single()
  if (insertError || !created) {
    return json({ error: "Erro ao iniciar a tentativa" }, 500)
  }
  const attempt = created as unknown as AttemptRow

  return json({
    attemptId: attempt.id,
    expiresAt: attemptExpiresAt(attempt, exam).toISOString(),
    timeLimitMinutes: exam.time_limit_minutes,
    questions: shuffled.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
    resumed: false,
  })
}
