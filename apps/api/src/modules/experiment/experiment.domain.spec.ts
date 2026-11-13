import { describe, expect, it } from "vitest"
import { csvCell, EVENTS_CSV_HEADER, toEventsCsv } from "./experiment.domain"

describe("csvCell", () => {
  it("deixa valores simples como estão e null vazio", () => {
    expect(csvCell("abc")).toBe("abc")
    expect(csvCell(12)).toBe("12")
    expect(csvCell(null)).toBe("")
  })
  it("põe aspas quando há vírgula, aspas ou quebra de linha", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""')
    expect(csvCell("a\nb")).toBe('"a\nb"')
  })
  it("neutraliza células que começariam uma fórmula", () => {
    expect(csvCell("=1+1")).toBe("'=1+1")
    expect(csvCell("@cmd")).toBe("'@cmd")
  })
})

describe("toEventsCsv", () => {
  it("gera cabeçalho e uma linha por evento, com o payload em JSON", () => {
    const csv = toEventsCsv([
      { id: 1, user_id: "u1", experiment_condition: "controle", type: "login", created_at: "2026-11-13T10:00:00.000Z", payload: { a: 1 } },
      { id: 2, user_id: null, experiment_condition: null, type: "lesson_viewed", created_at: "2026-11-13T10:01:00.000Z", payload: {} },
    ])
    expect(csv.split("\n")).toEqual([
      EVENTS_CSV_HEADER,
      '1,u1,controle,login,2026-11-13T10:00:00.000Z,"{""a"":1}"',
      "2,,,lesson_viewed,2026-11-13T10:01:00.000Z,{}",
      "",
    ])
  })
})
