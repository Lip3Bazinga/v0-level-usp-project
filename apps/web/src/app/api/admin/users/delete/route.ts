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

  if (userId === ctx.actorId) {
    return json({ error: "Você não pode excluir a própria conta." }, 400)
  }

  // Remove o usuário do Auth (cascata no profiles via FK on delete cascade)
  const { error: authErr } = await ctx.admin.auth.admin.deleteUser(userId)
  if (authErr) {
    // Fallback: tenta deletar o profile diretamente
    const { error } = await ctx.admin.from("profiles").delete().eq("id", userId)
    if (error) return json({ error: error.message }, 500)
  }

  await logAudit(ctx, "user.delete", userId, {}, "danger")
  return json({ ok: true })
}
