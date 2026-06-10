import { NextRequest } from "next/server"
import { requireAdmin, logAudit, json } from "@/lib/admin-auth"

const ALLOWED = [
  "full_name", "username", "email", "role",
  "level", "total_xp", "current_streak",
] as const

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { ctx } = auth

  let userId: string
  let patch: Record<string, unknown>
  try {
    const body = await req.json()
    userId = body.userId
    patch = body.patch ?? {}
    if (!userId || typeof userId !== "string") throw new Error()
  } catch {
    return json({ error: "Parâmetros inválidos" }, 400)
  }

  // Só permite os campos da whitelist
  const safe: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in patch) safe[key] = patch[key]
  }
  if (Object.keys(safe).length === 0) {
    return json({ error: "Nada para atualizar" }, 400)
  }

  const { error } = await ctx.admin.from("profiles").update(safe).eq("id", userId)
  if (error) return json({ error: error.message }, 500)

  // Se email mudou, atualiza também no Auth
  if (typeof safe.email === "string") {
    await ctx.admin.auth.admin.updateUserById(userId, { email: safe.email as string }).catch(() => {})
  }

  await logAudit(ctx, "user.update", userId, { fields: Object.keys(safe) })
  return json({ ok: true })
}
