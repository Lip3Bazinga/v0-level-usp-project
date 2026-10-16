/**
 * Caminho interno seguro para redirecionar após o login.
 * Aceita só caminhos relativos da própria aplicação ("/x"), recusando URLs
 * absolutas e "//host" (open redirect). Padrão: /dashboard.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback
  if (raw.startsWith("/login") || raw.startsWith("/signup")) return fallback
  return raw
}
