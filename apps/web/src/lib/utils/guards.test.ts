import { describe, expect, it } from "vitest"
import { isOneOf } from "./guards"

describe("isOneOf", () => {
  const SORTS = ["name", "recent"] as const

  it("aceita só os valores da lista", () => {
    expect(isOneOf(SORTS, "name")).toBe(true)
    expect(isOneOf(SORTS, "xp")).toBe(false)
    expect(isOneOf(SORTS, null)).toBe(false)
  })
})
