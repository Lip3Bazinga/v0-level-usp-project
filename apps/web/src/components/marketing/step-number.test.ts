import { describe, expect, it } from "vitest"
import { formatStepNumber } from "./step-number"

describe("formatStepNumber", () => {
  it("numera a partir de 1 com dois dígitos", () => {
    expect(formatStepNumber(0)).toBe("01")
    expect(formatStepNumber(8)).toBe("09")
    expect(formatStepNumber(11)).toBe("12")
  })
})
