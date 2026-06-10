import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Cliente com service role — ignora RLS. Uso exclusivo server-side. */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export interface AdminContext {
  admin: SupabaseClient   // service role
  actorId: string
  actorName: string
}

/**
 * Valida o JWT do header Authorization, confirma que o usuário é admin,
 * e retorna o cliente service-role + dados do ator. Em falha, retorna
 * uma NextResponse de erro (401/403) que a rota deve repassar.
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<{ ok: true; ctx: AdminContext } | { ok: false; res: NextResponse }> {
  const authHeader = req.headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, res: json({ error: "Não autenticado" }, 401) }
  }
  const jwt = authHeader.slice(7)

  // Valida o token
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser(jwt)
  if (authError || !user?.id) {
    return { ok: false, res: json({ error: "Token inválido" }, 401) }
  }

  // Confirma role admin via service role
  const admin = serviceClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  if (!profile || (profile as { role: string }).role !== "admin") {
    return { ok: false, res: json({ error: "Acesso restrito a administradores" }, 403) }
  }

  return {
    ok: true,
    ctx: {
      admin,
      actorId: user.id,
      actorName: (profile as { full_name?: string }).full_name ?? "Admin",
    },
  }
}

/** Registra a ação no audit_log via RPC log_audit (service role). */
export async function logAudit(
  ctx: AdminContext,
  action: string,
  target: string,
  meta: Record<string, unknown> = {},
  severity: "info" | "warning" | "danger" = "info",
): Promise<void> {
  try {
    await ctx.admin.rpc("log_audit" as never, {
      p_actor_id: ctx.actorId,
      p_actor_name: ctx.actorName,
      p_action: action,
      p_target: target,
      p_meta: meta,
      p_severity: severity,
    } as never)
  } catch { /* auditoria não deve quebrar a ação principal */ }
}
