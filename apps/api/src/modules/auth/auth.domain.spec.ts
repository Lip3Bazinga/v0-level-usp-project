import { describe, expect, it } from "vitest"
import { isLocked, LOCK_DURATION_MS, MAX_FAILED_LOGINS, registerFailedLogin, usernameBaseFromEmail, usernameWithSuffix } from "./auth.domain"

const now = Date.parse("2026-10-16T12:00:00Z")

describe("bloqueio de login", () => {
  it("bloqueia só enquanto o prazo não venceu", () => {
    expect(isLocked({ failedLoginCount: 10, lockedUntil: new Date(now + 1).toISOString() }, now)).toBe(true)
    expect(isLocked({ failedLoginCount: 10, lockedUntil: new Date(now - 1).toISOString() }, now)).toBe(false)
    expect(isLocked({ failedLoginCount: 3, lockedUntil: null }, now)).toBe(false)
  })

  it("bloqueia ao atingir o máximo de senhas erradas", () => {
    expect(registerFailedLogin({ failedLoginCount: MAX_FAILED_LOGINS - 2, lockedUntil: null }, now)).toEqual({ failures: MAX_FAILED_LOGINS - 1, lockedUntil: null })
    expect(registerFailedLogin({ failedLoginCount: MAX_FAILED_LOGINS - 1, lockedUntil: null }, now)).toEqual({
      failures: MAX_FAILED_LOGINS,
      lockedUntil: new Date(now + LOCK_DURATION_MS).toISOString(),
    })
  })

  it("bloqueio vencido recomeça a contagem", () => {
    const expired = { failedLoginCount: MAX_FAILED_LOGINS, lockedUntil: new Date(now - 1).toISOString() }
    expect(registerFailedLogin(expired, now)).toEqual({ failures: 1, lockedUntil: null })
  })
})

describe("username gerado", () => {
  it("normaliza a parte local do e-mail", () => {
    expect(usernameBaseFromEmail("Maria.Silva+teste@usp.br")).toBe("maria_silva_teste")
    expect(usernameBaseFromEmail("a@usp.br")).toBe("a__")
  })

  it("acrescenta quatro dígitos quando precisa desempatar", () => {
    expect(usernameWithSuffix("ana", () => 0)).toBe("ana1000")
    expect(usernameWithSuffix("ana", () => 0.9999)).toBe("ana9999")
  })
})
