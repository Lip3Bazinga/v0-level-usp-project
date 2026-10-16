import type { Request } from "express"
import type { UserRole } from "@levelusp/contracts"

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  fullName: string
  sessionId: string
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser
}

export const SESSION_COOKIE = "lvl_session"
/** Cabeçalho exigido em métodos que alteram estado (anti-CSRF). */
export const CSRF_HEADER = "x-levelusp-csrf"
