/** Cookie httpOnly emitido pela API. O front só verifica a presença dele. */
export const SESSION_COOKIE_NAME = "lvl_session"

/** Chaves de `localStorage` usadas pela web (preferências de UI, nunca dados sensíveis). */
export const STORAGE_KEYS = {
  adminActivePage: "adminPage",
} as const
