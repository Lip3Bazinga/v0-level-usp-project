import { NextRequest } from "next/server"
import { json, serviceClient, requireUser } from "@/lib/admin-auth"
import { getRemainingLessons, getExamByCourse, getLatestAttempts } from "@/lib/server/exam"

// POST /api/certificate/issue — emite o certificado quando (e somente quando)
// as três condições valem: todas as lições concluídas, prova aprovada e
// projeto final aprovado (o projeto é a última lição do curso, então está
// coberto por "todas as lições"). Idempotente: retorna o existente.
export const runtime = "nodejs"

function generateCode(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
  return `LU-${hex.slice(0, 5)}-${hex.slice(5)}`
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.ok) return auth.res
  const user = auth.user

  let body: { courseId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: "Corpo da requisição inválido" }, 400)
  }
  if (!body.courseId) return json({ error: "courseId é obrigatório" }, 400)
  const courseId = body.courseId

  const admin = serviceClient()

  // Idempotência: se já existe, retorna
  const { data: existing } = await admin
    .from("certificates")
    .select("verification_code, issued_at, exam_score")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle()
  if (existing) {
    const e = existing as { verification_code: string; issued_at: string; exam_score: number }
    return json({
      issued: true,
      alreadyIssued: true,
      verificationCode: e.verification_code,
      issuedAt: e.issued_at,
      examScore: Number(e.exam_score),
    })
  }

  // Condições 1 e 2 não dependem entre si — verificação em paralelo.
  const [lessons, exam] = await Promise.all([
    getRemainingLessons(admin, courseId, user.id),
    getExamByCourse(admin, courseId),
  ])
  if (lessons.total === 0) return json({ error: "Curso sem lições publicadas" }, 422)
  if (lessons.remaining > 0) {
    return json(
      { error: `Ainda faltam ${lessons.remaining} lições para concluir o curso.` },
      403,
    )
  }
  if (!exam) return json({ error: "Este curso não possui prova final" }, 422)
  const attempts = await getLatestAttempts(admin, exam.id, user.id)
  const passedAttempt = attempts.find((a) => a.submitted_at !== null && a.passed)
  if (!passedAttempt) {
    return json({ error: "Você precisa ser aprovado na prova final." }, 403)
  }

  // Emissão (código único; retry em colisão improvável)
  let code = generateCode()
  let inserted = null
  for (let i = 0; i < 3 && !inserted; i++) {
    const { data, error } = await admin
      .from("certificates")
      .insert({
        user_id: user.id,
        course_id: courseId,
        verification_code: code,
        exam_score: passedAttempt.score,
        project_status: "passed",
      })
      .select("verification_code, issued_at, exam_score")
      .single()
    if (!error && data) inserted = data
    else code = generateCode()
  }
  if (!inserted) return json({ error: "Erro ao emitir o certificado" }, 500)

  // Auditoria (padrão existente: log_audit via service role)
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()
  try {
    await admin.rpc("log_audit" as never, {
      p_actor_id: user.id,
      p_actor_name: (profile as { full_name?: string } | null)?.full_name ?? "Aluno",
      p_action: "certificate.issued",
      p_target: courseId,
      p_meta: { verification_code: code, exam_score: Number(passedAttempt.score) },
      p_severity: "info",
    } as never)
  } catch { /* auditoria não bloqueia a emissão */ }

  // Notificação interna de emissão — falha aqui não pode quebrar a resposta.
  try {
    await admin.from("notifications").insert({
      user_id: user.id,
      title: "Certificado emitido! 🎓",
      body: `Seu certificado foi emitido com o código de verificação ${code}. Compartilhe e baixe o PDF quando quiser.`,
      kind: "success",
      href: `/certificado/${code}`,
    })
  } catch { /* notificação é melhor-esforço */ }

  const result = inserted as { verification_code: string; issued_at: string; exam_score: number }
  return json({
    issued: true,
    alreadyIssued: false,
    verificationCode: result.verification_code,
    issuedAt: result.issued_at,
    examScore: Number(result.exam_score),
  })
}
