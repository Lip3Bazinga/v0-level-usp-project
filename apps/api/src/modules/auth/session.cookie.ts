import type { CookieOptions, Response } from "express"
import { SESSION_COOKIE } from "@/common/http/request"

/** Token opaco do cookie de sessão e quando ele expira. */
export interface SessionCookie {
  token: string
  expiresAt: Date
}

/** Grava o cookie de sessão (httpOnly, SameSite=Lax, path /); `secure` vem de COOKIE_SECURE. */
export function setSessionCookie(response: Response, session: SessionCookie, secure: boolean): void {
  response.cookie(SESSION_COOKIE, session.token, { ...cookieOptions(secure), expires: session.expiresAt })
}

/** Apaga o cookie de sessão com as mesmas opções usadas para gravá-lo. */
export function clearSessionCookie(response: Response, secure: boolean): void {
  response.clearCookie(SESSION_COOKIE, cookieOptions(secure))
}

function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: "lax", path: "/" }
}
