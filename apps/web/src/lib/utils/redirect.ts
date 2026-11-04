import { AUTH_ROUTES, ROUTES } from "@/lib/constants"

/**
 * Destino seguro após o login. Só aceita caminhos internos ("/x"): URLs absolutas,
 * "//host" e "/\host" abririam um redirecionamento para fora (open redirect).
 */
export function safeRedirectPath(raw: string | null | undefined, fallback: string = ROUTES.dashboard): string {
  if (!raw) return fallback
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback
  if (AUTH_ROUTES.some((route) => raw.startsWith(route))) return fallback
  return raw
}
