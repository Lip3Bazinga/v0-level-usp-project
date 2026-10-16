import { NextRequest } from "next/server"
import { requireAdmin, logAudit, json } from "@/lib/admin-auth"

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { ctx } = auth

  // userId opcional: se fornecido, invalida só aquele usuário; senão, intenção global.
  let userId: string | undefined
  try {
    const body = await req.json().catch(() => ({}))
    userId = body.userId
  } catch { /* corpo vazio é ok */ }

  if (userId) {
    const { error } = await ctx.admin.auth.admin.signOut(userId, "global")
    if (error) return json({ error: error.message }, 500)
    await logAudit(ctx, "sessions.invalidate_user", userId, {}, "warning")
    return json({ ok: true })
  }

  // Invalidação global de TODAS as sessões: itera os usuários e faz signOut.
  // (A Auth Admin API não tem um "signOut all" único.)
  const { data, error } = await ctx.admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return json({ error: error.message }, 500)

  let count = 0
  for (const u of data.users) {
    const { error: e } = await ctx.admin.auth.admin.signOut(u.id, "global")
    if (!e) count++
  }

  await logAudit(ctx, "sessions.invalidate_all", `${count} usuários`, { count }, "danger")
  return json({ ok: true, count })
}
