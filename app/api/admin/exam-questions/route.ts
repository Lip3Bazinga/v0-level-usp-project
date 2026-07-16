import { NextRequest } from "next/server"
import { requireAdmin, logAudit, json } from "@/lib/admin-auth"

// Gestão do banco de questões da prova (admin). Única rota POST com ações,
// seguindo o padrão adminFetch. O gabarito (correct_index) só trafega aqui —
// rota protegida por requireAdmin; a tabela é deny-all para clientes.

interface QuestionInput {
  prompt?: string
  options?: string[]
  correct_index?: number
  explanation?: string
  topic?: string
  sort_order?: number
  active?: boolean
}

function validateQuestion(q: QuestionInput, partial: boolean): string | null {
  if (!partial || q.prompt !== undefined) {
    if (typeof q.prompt !== "string" || q.prompt.trim().length < 10) {
      return "Enunciado deve ter pelo menos 10 caracteres"
    }
  }
  if (!partial || q.options !== undefined) {
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 ||
        q.options.some((o) => typeof o !== "string" || !o.trim())) {
      return "Alternativas: entre 2 e 6, todas preenchidas"
    }
  }
  if (!partial || q.correct_index !== undefined) {
    if (typeof q.correct_index !== "number" || q.correct_index < 0) {
      return "correct_index inválido"
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { ctx } = auth

  let body: { action?: string; examId?: string; id?: string; question?: QuestionInput }
  try {
    body = await req.json()
  } catch {
    return json({ error: "Corpo da requisição inválido" }, 400)
  }

  const { action, examId, id, question } = body

  if (action === "list") {
    if (!examId) return json({ error: "examId é obrigatório" }, 400)
    const { data, error } = await ctx.admin
      .from("exam_questions")
      .select("id, prompt, options, correct_index, explanation, topic, sort_order, active")
      .eq("exam_id", examId)
      .order("sort_order")
    if (error) return json({ error: error.message }, 500)
    return json({ questions: data ?? [] })
  }

  if (action === "create") {
    if (!examId || !question) return json({ error: "examId e question são obrigatórios" }, 400)
    const invalid = validateQuestion(question, false)
    if (invalid) return json({ error: invalid }, 400)
    if (question.correct_index! >= question.options!.length) {
      return json({ error: "correct_index fora do intervalo das alternativas" }, 400)
    }
    const { data, error } = await ctx.admin
      .from("exam_questions")
      .insert({
        exam_id: examId,
        prompt: question.prompt!.trim(),
        options: question.options,
        correct_index: question.correct_index,
        explanation: question.explanation?.trim() ?? "",
        topic: question.topic?.trim() ?? "",
        sort_order: question.sort_order ?? 0,
        active: question.active ?? true,
      })
      .select("id")
      .single()
    if (error) return json({ error: error.message }, 500)
    await logAudit(ctx, "exam_question.create", (data as { id: string }).id, { examId })
    return json({ ok: true, id: (data as { id: string }).id })
  }

  if (action === "update") {
    if (!id || !question) return json({ error: "id e question são obrigatórios" }, 400)
    const invalid = validateQuestion(question, true)
    if (invalid) return json({ error: invalid }, 400)
    const patch: Record<string, unknown> = {}
    if (question.prompt !== undefined) patch.prompt = question.prompt.trim()
    if (question.options !== undefined) patch.options = question.options
    if (question.correct_index !== undefined) patch.correct_index = question.correct_index
    if (question.explanation !== undefined) patch.explanation = question.explanation.trim()
    if (question.topic !== undefined) patch.topic = question.topic.trim()
    if (question.sort_order !== undefined) patch.sort_order = question.sort_order
    if (question.active !== undefined) patch.active = question.active
    if (!Object.keys(patch).length) return json({ error: "Nada para atualizar" }, 400)

    const { error } = await ctx.admin.from("exam_questions").update(patch).eq("id", id)
    if (error) return json({ error: error.message }, 500)
    await logAudit(ctx, "exam_question.update", id, { fields: Object.keys(patch) })
    return json({ ok: true })
  }

  return json({ error: "Ação desconhecida" }, 400)
}
