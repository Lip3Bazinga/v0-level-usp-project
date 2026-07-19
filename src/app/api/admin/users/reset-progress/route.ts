import { NextRequest } from "next/server"
import { requireAdmin, logAudit, json } from "@/lib/admin-auth"

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { ctx } = auth

  let userId: string
  try {
    const body = await req.json()
    userId = body.userId
    if (!userId || typeof userId !== "string") throw new Error()
  } catch {
    return json({ error: "Parâmetros inválidos" }, 400)
  }

  // Zera a gamificação do perfil
  const { error: pErr } = await ctx.admin
    .from("profiles")
    .update({
      total_xp: 0,
      level: 1,
      current_streak: 0,
      max_streak: 0,
      lessons_completed: 0,
      courses_completed: 0,
    })
    .eq("id", userId)
  if (pErr) return json({ error: pErr.message }, 500)

  // Apaga o progresso por lição
  const { error: lpErr } = await ctx.admin.from("lesson_progress").delete().eq("user_id", userId)
  if (lpErr) return json({ error: lpErr.message }, 500)

  await logAudit(ctx, "user.reset_progress", userId, {}, "warning")
  return json({ ok: true })
}
