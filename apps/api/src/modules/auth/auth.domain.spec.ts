import { describe, expect, it } from "vitest"
import { isLocked, usernameBaseFromEmail, usernameWithSuffix } from "./auth.domain"

const now = Date.parse("2026-10-16T12:00:00Z")

describe("bloqueio de login", () => {
  it("bloqueia só enquanto o prazo não venceu", () => {
    expect(isLocked({ failedLoginCount: 10, lockedUntil: new Date(now + 1).toISOString() }, now)).toBe(true)
    expect(isLocked({ failedLoginCount: 10, lockedUntil: new Date(now - 1).toISOString() }, now)).toBe(false)
    expect(isLocked({ failedLoginCount: 3, lockedUntil: null }, now)).toBe(false)
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
