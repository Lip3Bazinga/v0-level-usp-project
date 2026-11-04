import type { Request } from "express"
import type { UserRole } from "@levelusp/contracts"

/** Usuário da sessão, resolvido pelo SessionGuard a cada requisição (papel e nome já atualizados). */
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  fullName: string
  sessionId: string
}

/** Requisição Express depois do SessionGuard; `user` só existe com sessão válida. */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser
}

export const SESSION_COOKIE = "lvl_session"
/** Cabeçalho exigido em métodos que alteram estado (anti-CSRF). */
export const CSRF_HEADER = "x-levelusp-csrf"

/** Cookie de sessão, se presente e textual (o cookie-parser tipa os cookies como `any`). */
export function readSessionCookie(request: Request): string | undefined {
  const cookies: unknown = request.cookies
  if (typeof cookies !== "object" || cookies === null || !(SESSION_COOKIE in cookies)) return undefined
  const token = cookies[SESSION_COOKIE]
  return typeof token === "string" ? token : undefined
}
