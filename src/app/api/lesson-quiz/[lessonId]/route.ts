import { NextRequest } from "next/server"
import { json, serviceClient, requireUser } from "@/lib/admin-auth"

// GET /api/lesson-quiz/[lessonId] — questões do quiz para o ALUNO responder.
// Retorna id, prompt e options; NUNCA correct_index nem explanation.
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params

  const auth = await requireUser(req)
  if (!auth.ok) return auth.res

  const admin = serviceClient()

  const { data: lessonRow } = await admin
    .from("lessons")
    .select("id, lesson_type, published, quiz_passing_score")
    .eq("id", lessonId)
    .maybeSingle()

  const lesson = lessonRow as {
    id: string
    lesson_type: string
    published: boolean
    quiz_passing_score: number
  } | null

  if (!lesson || !lesson.published) {
    return json({ error: "Lição não encontrada" }, 404)
  }
  if (lesson.lesson_type !== "quiz") {
    return json({ error: "Esta lição não é um questionário" }, 422)
  }

  // Service role lê a tabela (deny-all para clientes); enviamos só o público.
  const { data: rows, error } = await admin
    .from("lesson_quiz_questions")
    .select("id, prompt, options")
    .eq("lesson_id", lessonId)
    .order("sort_order")

  if (error) return json({ error: "Erro ao carregar o questionário" }, 500)
  if (!rows?.length) return json({ error: "Questionário sem questões cadastradas" }, 422)

  return json({
    passingScore: lesson.quiz_passing_score,
    questions: (rows as { id: string; prompt: string; options: string[] }[]).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: Array.isArray(q.options) ? q.options : [],
    })),
  })
}
