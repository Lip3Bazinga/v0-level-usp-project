import { describe, expect, it } from "vitest"
import { formatCountdown } from "./exam-countdown"

describe("formatCountdown", () => {
  it("mostra minutos e segundos com dois dígitos", () => {
    expect(formatCountdown(65_000)).toBe("1:05")
    expect(formatCountdown(20 * 60_000)).toBe("20:00")
  })

  it("arredonda para baixo e não fica negativo depois do prazo", () => {
    expect(formatCountdown(59_999)).toBe("0:59")
    expect(formatCountdown(-3_000)).toBe("0:00")
  })
})
