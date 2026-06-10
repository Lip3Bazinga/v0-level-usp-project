import { NextRequest } from "next/server"
import { requireAdmin, logAudit, json } from "@/lib/admin-auth"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { ctx } = auth

  let email: string
  try {
    const body = await req.json()
    email = body.email
    if (!email || typeof email !== "string" || !email.includes("@")) throw new Error()
  } catch {
    return json({ error: "Email inválido" }, 400)
  }

  const { error } = await ctx.admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/login`,
  })
  if (error) return json({ error: error.message }, 500)

  await logAudit(ctx, "user.invite", email)
  return json({ ok: true })
}
