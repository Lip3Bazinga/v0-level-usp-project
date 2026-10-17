import type { CookieOptions, Response } from "express"
import { SESSION_COOKIE } from "@/common/http/request"

export function setSessionCookie(res: Response, token: string, expires: Date, secure: boolean) {
  res.cookie(SESSION_COOKIE, token, baseOptions(secure, expires))
}

export function clearSessionCookie(res: Response, secure: boolean) {
  res.clearCookie(SESSION_COOKIE, baseOptions(secure))
}

function baseOptions(secure: boolean, expires?: Date): CookieOptions {
  return { httpOnly: true, secure, sameSite: "lax", path: "/", ...(expires ? { expires } : {}) }
}
