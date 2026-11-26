import { describe, expect, it } from "vitest"
import { courseInputSchema, courseUpdateSchema } from "./courses"
import { isRunButtonUnlocked, MAX_RUN_BUTTON_LEVEL, resolveRunButtonMinLevel, RUN_BUTTON_MIN_LEVEL } from "./run-button"

describe("resolveRunButtonMinLevel", () => {
  it("usa a constante quando o curso não define limite", () => {
    expect(resolveRunButtonMinLevel(null)).toBe(RUN_BUTTON_MIN_LEVEL)
    expect(resolveRunButtonMinLevel(undefined)).toBe(RUN_BUTTON_MIN_LEVEL)
  })

  it("usa o limite do curso quando ele é válido", () => {
    expect(resolveRunButtonMinLevel(1)).toBe(1)
    expect(resolveRunButtonMinLevel(4)).toBe(4)
  })

  it("ignora limite inválido", () => {
    expect(resolveRunButtonMinLevel(0)).toBe(RUN_BUTTON_MIN_LEVEL)
    expect(resolveRunButtonMinLevel(2.5)).toBe(RUN_BUTTON_MIN_LEVEL)
    expect(resolveRunButtonMinLevel(Number.NaN)).toBe(RUN_BUTTON_MIN_LEVEL)
  })
})

describe("isRunButtonUnlocked", () => {
  it("sem limite do curso, libera a partir da constante", () => {
    expect(isRunButtonUnlocked(RUN_BUTTON_MIN_LEVEL - 1, null)).toBe(false)
    expect(isRunButtonUnlocked(RUN_BUTTON_MIN_LEVEL, null)).toBe(true)
    expect(isRunButtonUnlocked(RUN_BUTTON_MIN_LEVEL + 3, undefined)).toBe(true)
  })

  it("o limite do curso vale no lugar da constante", () => {
    expect(isRunButtonUnlocked(3, 4)).toBe(false)
    expect(isRunButtonUnlocked(4, 4)).toBe(true)
    expect(isRunButtonUnlocked(RUN_BUTTON_MIN_LEVEL, RUN_BUTTON_MIN_LEVEL + 5)).toBe(false)
  })

  it("limite 1 libera sempre, mesmo com nível inválido", () => {
    expect(isRunButtonUnlocked(1, 1)).toBe(true)
    expect(isRunButtonUnlocked(0, 1)).toBe(true)
    expect(isRunButtonUnlocked(Number.NaN, 1)).toBe(true)
  })
})

describe("run_button_min_level no schema do curso", () => {
  it("aceita ausente, null e inteiros de 1 ao teto", () => {
    expect(courseInputSchema.parse({ title: "Curso" }).run_button_min_level).toBeUndefined()
    expect(courseUpdateSchema.parse({ run_button_min_level: null })).toEqual({ run_button_min_level: null })
    expect(courseUpdateSchema.parse({ run_button_min_level: 1 })).toEqual({ run_button_min_level: 1 })
    expect(courseUpdateSchema.safeParse({ run_button_min_level: MAX_RUN_BUTTON_LEVEL }).success).toBe(true)
  })

  it("recusa zero, fração e acima do teto", () => {
    for (const value of [0, 2.5, MAX_RUN_BUTTON_LEVEL + 1]) {
      expect(courseUpdateSchema.safeParse({ run_button_min_level: value }).success).toBe(false)
    }
  })
})
