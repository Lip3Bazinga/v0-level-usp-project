import { describe, expect, it } from "vitest"
import { definedProps } from "./defined-props"

describe("definedProps", () => {
  it("tira só as chaves undefined (null, 0, false e texto vazio ficam)", () => {
    const props = definedProps({ className: undefined, title: "", count: 0, isOpen: false, ref: null })
    expect(props).toEqual({ title: "", count: 0, isOpen: false, ref: null })
    expect("className" in props).toBe(false)
  })
})
