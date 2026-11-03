import { AUTH_ROUTES, ROUTES } from "@/lib/constants"

/** Origem fictícia só para o parser de URL resolver o caminho relativo. */
const PARSE_ORIGIN = "http://levelusp.invalid"

/**
 * Destino seguro após o login. Só aceita caminhos internos ("/x"). A decisão é
 * do parser de URL do navegador (WHATWG), não de prefixos: ele descarta TAB e
 * quebras de linha e trata "\" como "/", então "/\t/evil.com" e "/\\evil.com"
 * viram "//evil.com" (open redirect) mesmo começando com uma única barra.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback: string = ROUTES.dashboard): string {
  if (!raw?.startsWith("/")) return fallback
  let url: URL
  try {
    url = new URL(raw, PARSE_ORIGIN)
  } catch {
    return fallback
  }
  if (url.origin !== PARSE_ORIGIN) return fallback
  const path = `${url.pathname}${url.search}${url.hash}`
  if (AUTH_ROUTES.some((route) => path.startsWith(route))) return fallback
  return path
}
