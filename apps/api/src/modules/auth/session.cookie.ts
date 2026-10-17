import type { CookieOptions, Response } from "express"
import { SESSION_COOKIE } from "@/common/http/request"

export interface SessionCookie {
  token: string
  expiresAt: Date
}

export function setSessionCookie(response: Response, session: SessionCookie, secure: boolean): void {
  response.cookie(SESSION_COOKIE, session.token, { ...cookieOptions(secure), expires: session.expiresAt })
}

export function clearSessionCookie(response: Response, secure: boolean): void {
  response.clearCookie(SESSION_COOKIE, cookieOptions(secure))
}

function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: "lax", path: "/" }
}
