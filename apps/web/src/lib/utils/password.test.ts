import { describe, expect, it } from "vitest"
import { PASSWORD_MIN_LENGTH, getPasswordPolicyError } from "./password"

describe("getPasswordPolicyError", () => {
  it("aceita senha com 10+ caracteres, letra e número", () => {
    expect(getPasswordPolicyError("senhaForte123")).toBeNull()
  })

  it("explica em pt-BR a primeira regra violada", () => {
    expect(getPasswordPolicyError("curta1")).toMatch(/ao menos 10 caracteres/)
    expect(getPasswordPolicyError("abcdefghij")).toMatch(/número/)
    expect(getPasswordPolicyError("1234567890")).toMatch(/letra/)
  })

  it("expõe o mínimo da política para o atributo minLength", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10)
  })
})
