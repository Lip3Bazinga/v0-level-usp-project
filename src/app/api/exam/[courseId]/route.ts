import { NextRequest } from "next/server"
import { json, serviceClient, requireUser } from "@/lib/admin-auth"
import {
  getExamByCourse,
  getExamEligibility,
  getLatestAttempts,
  cooldownUntil,
  attemptExpiresAt,
} from "@/lib/server/exam"

// GET /api/exam/[courseId] — status da prova para o usuário autenticado.
// Nunca retorna questões nem gabarito: apenas metadados e elegibilidade.
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params

  const auth = await requireUser(req)
  if (!auth.ok) return auth.res
  const user = auth.user

  const admin = serviceClient()
  const exam = await getExamByCourse(admin, courseId)
  if (!exam) return json({ error: "Este curso não possui prova final" }, 404)

  const [eligibility, attempts] = await Promise.all([
    getExamEligibility(admin, courseId, user.id),
    getLatestAttempts(admin, exam.id, user.id),
  ])

  const { count: questionCount } = await admin
    .from("exam_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", exam.id)
    .eq("active", true)

  const submitted = attempts.filter((a) => a.submitted_at !== null)
  const passedAttempt = submitted.find((a) => a.passed)
  const bestScore = submitted.reduce<number | null>(
    (best, a) => (a.score !== null && (best === null || Number(a.score) > best) ? Number(a.score) : best),
    null,
  )
  const inProgress = attempts.find(
    (a) => a.submitted_at === null && attemptExpiresAt(a, exam) > new Date(),
  )
  const cooldown = cooldownUntil(attempts, exam)

  return json({
    exam: {
      title: exam.title,
      description: exam.description,
      passingScore: exam.passing_score,
      timeLimitMinutes: exam.time_limit_minutes,
      cooldownMinutes: exam.cooldown_minutes,
      questionCount: questionCount ?? 0,
    },
    eligible: eligibility.eligible,
    lessonsRemaining: eligibility.remaining,
    lessonsTotal: eligibility.total,
    attemptsCount: submitted.length,
    bestScore,
    passed: !!passedAttempt,
    passedScore: passedAttempt ? Number(passedAttempt.score) : null,
    cooldownUntil: cooldown ? cooldown.toISOString() : null,
    inProgressAttemptId: inProgress?.id ?? null,
    inProgressExpiresAt: inProgress ? attemptExpiresAt(inProgress, exam).toISOString() : null,
  })
}
