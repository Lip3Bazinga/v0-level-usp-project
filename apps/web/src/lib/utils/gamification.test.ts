import { describe, expect, it } from "vitest"
import { computeLevelProgress, toClampedPercent } from "./gamification"

describe("computeLevelProgress", () => {
  it("no nível 1 a faixa vai de 0 ao primeiro teto", () => {
    expect(computeLevelProgress(250, 1)).toEqual({
      xpFloor: 0, xpCeil: 1000, xpInLevel: 250, xpLevelRange: 1000, levelPercent: 25,
    })
  })

  it("a partir do nível 2 mede o progresso sobre a faixa do nível, não sobre o teto absoluto", () => {
    expect(computeLevelProgress(1500, 2)).toEqual({
      xpFloor: 1000, xpCeil: 2000, xpInLevel: 500, xpLevelRange: 1000, levelPercent: 50,
    })
    expect(computeLevelProgress(2500, 3)).toMatchObject({ xpInLevel: 500, xpLevelRange: 1000, levelPercent: 50 })
  })

  it("começa em 0% no início do nível", () => {
    expect(computeLevelProgress(2000, 3).levelPercent).toBe(0)
  })
})

describe("toClampedPercent", () => {
  it("arredonda e limita a 100", () => {
    expect(toClampedPercent(1, 3)).toBe(33)
    expect(toClampedPercent(150, 100)).toBe(100)
  })

  it("devolve 0 quando o total não é positivo", () => {
    expect(toClampedPercent(10, 0)).toBe(0)
  })
})
