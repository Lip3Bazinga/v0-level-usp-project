import { SupabaseClient } from "@supabase/supabase-js"

// Rate limiting server-side por usuário, com janela deslizante sobre a tabela
// public.rate_limits (RLS deny-all — só o service role lê/escreve aqui).

export interface RateLimitResult {
  allowed: boolean
  /** Segundos até a ação mais antiga sair da janela (0 quando permitido). */
  retryAfterSeconds: number
}

/**
 * Verifica se o usuário ainda pode executar `action` dentro da janela.
 * Se puder, registra a ocorrência (consome uma "vaga") e permite.
 * Caso contrário, calcula quando a linha mais antiga da janela expira.
 *
 * Nota: count + insert não são atômicos, então uma rajada extrema pode passar
 * uma ou duas requisições além do limite — aceitável para abuso humano/script.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  action: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

  const { count, error: countError } = await admin
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", windowStart)

  // Fail-open: se a contagem falhar, não bloqueamos o usuário por erro nosso.
  if (countError) return { allowed: true, retryAfterSeconds: 0 }

  if ((count ?? 0) < max) {
    await admin.from("rate_limits").insert({ user_id: userId, action })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  // Bloqueado: o usuário poderá tentar de novo quando a ocorrência mais
  // antiga da janela ficar mais velha que windowSeconds.
  const { data: oldest } = await admin
    .from("rate_limits")
    .select("created_at")
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const oldestAt = oldest ? new Date((oldest as { created_at: string }).created_at) : new Date()
  const retryAfterMs = oldestAt.getTime() + windowSeconds * 1000 - Date.now()
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  }
}
