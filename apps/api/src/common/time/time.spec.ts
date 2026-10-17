import { describe, expect, it } from "vitest"
import { isoAfter, previousDate, saoPauloDate, toIsoTimestamp } from "./time"

describe("datas civis", () => {
  it("atravessa virada de mês e ano", () => {
    expect(previousDate("2026-03-01")).toBe("2026-02-28")
    expect(previousDate("2027-01-01")).toBe("2026-12-31")
  })

  it("usa o fuso de São Paulo (UTC-3)", () => {
    expect(saoPauloDate(new Date("2026-10-16T02:30:00Z"))).toBe("2026-10-15")
    expect(saoPauloDate(new Date("2026-10-16T03:30:00Z"))).toBe("2026-10-16")
  })
})

describe("timestamps", () => {
  it("converte o formato do Postgres para ISO 8601", () => {
    expect(toIsoTimestamp("2026-10-16 12:00:00+00")).toBe("2026-10-16T12:00:00.000Z")
  })

  it("soma a duração ao instante de referência", () => {
    expect(isoAfter(90_000, Date.parse("2026-10-16T12:00:00Z"))).toBe("2026-10-16T12:01:30.000Z")
  })
})
