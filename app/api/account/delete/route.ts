import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Auto-exclusão: o próprio usuário autenticado remove a sua conta. */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Não autenticado" }, { status: 401 })
  }
  const jwt = authHeader.slice(7)

  // Valida o token e descobre QUEM é o usuário (só pode excluir a si mesmo)
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: { user }, error } = await userClient.auth.getUser(jwt)
  if (error || !user?.id) {
    return Response.json({ error: "Token inválido" }, { status: 401 })
  }

  // Exclui o próprio usuário via service role (cascata remove profile/progresso)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    return Response.json({ error: delErr.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
