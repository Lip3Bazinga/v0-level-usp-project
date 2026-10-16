import { NextRequest } from "next/server"
import { requireAdmin, logAudit, json } from "@/lib/admin-auth"

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { ctx } = auth

  let userId: string
  let suspended: boolean
  try {
    const body = await req.json()
    userId = body.userId
    suspended = !!body.suspended
    if (!userId || typeof userId !== "string") throw new Error()
  } catch {
    return json({ error: "Parâmetros inválidos" }, 400)
  }

  if (userId === ctx.actorId) {
    return json({ error: "Você não pode suspender a própria conta." }, 400)
  }

  // Marca no profile
  const { error } = await ctx.admin.from("profiles").update({ suspended }).eq("id", userId)
  if (error) return json({ error: error.message }, 500)

  // Bane/desbane no Auth (bloqueia login imediatamente)
  await ctx.admin.auth.admin
    .updateUserById(userId, { ban_duration: suspended ? "876000h" : "none" })
    .catch(() => {})

  await logAudit(ctx, suspended ? "user.suspend" : "user.unsuspend", userId, {}, "warning")
  return json({ ok: true })
}
