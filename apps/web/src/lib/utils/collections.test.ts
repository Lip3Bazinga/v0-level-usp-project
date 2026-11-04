import { describe, expect, it } from "vitest"
import { cycleItem, indexBy, isNonEmpty, lastOf, type NonEmptyArray } from "./collections"

describe("indexBy", () => {
  it("indexa pela chave e, em chave repetida, fica o último", () => {
    const byId = indexBy([{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "a", v: 3 }], (item) => item.id)
    expect(byId.get("a")?.v).toBe(3)
    expect(byId.size).toBe(2)
  })
})

describe("isNonEmpty / lastOf", () => {
  it("só aceita listas com itens e dá acesso ao primeiro e ao último", () => {
    const empty: string[] = []
    const items = ["x", "y", "z"]
    expect(isNonEmpty(empty)).toBe(false)
    expect(isNonEmpty(items)).toBe(true)
    if (isNonEmpty(items)) {
      expect(items[0]).toBe("x")
      expect(lastOf(items)).toBe("z")
    }
  })
})

describe("cycleItem", () => {
  const COLORS: NonEmptyArray<string> = ["roxo", "azul", "verde"]

  it("recomeça do início depois do fim", () => {
    expect([0, 1, 2, 3, 4].map((index) => cycleItem(COLORS, index))).toEqual(["roxo", "azul", "verde", "roxo", "azul"])
  })

  it("conta do fim para índices negativos", () => {
    expect(cycleItem(COLORS, -1)).toBe("verde")
  })
})
