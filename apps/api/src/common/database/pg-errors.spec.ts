import { describe, expect, it } from "vitest"
import { isUniqueViolation } from "./pg-errors"

describe("isUniqueViolation", () => {
  it("reconhece o erro do driver e o erro embrulhado pelo Drizzle", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true)
    expect(isUniqueViolation(new Error("falhou", { cause: { code: "23505" } }))).toBe(true)
  })

  it("ignora outros erros e valores que não são objetos", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation("23505")).toBe(false)
  })
})
