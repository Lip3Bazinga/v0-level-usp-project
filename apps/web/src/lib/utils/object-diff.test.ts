import { describe, expect, it } from "vitest"
import { diffChangedFields } from "./object-diff"

describe("diffChangedFields", () => {
  it("devolve só os campos alterados", () => {
    expect(diffChangedFields({ title: "a", order: 1 }, { title: "b", order: 1 })).toEqual({ title: "b" })
  })

  it("compara listas e objetos pelo conteúdo", () => {
    const before = { tags: ["x"], meta: { a: 1 } }
    expect(diffChangedFields(before, { tags: ["x"], meta: { a: 1 } })).toEqual({})
    expect(diffChangedFields(before, { tags: ["x", "y"], meta: { a: 1 } })).toEqual({ tags: ["x", "y"] })
  })

  it("trata null e undefined como o mesmo valor", () => {
    const before: { cover: string | null | undefined } = { cover: null }
    expect(diffChangedFields(before, { cover: undefined })).toEqual({})
  })
})
