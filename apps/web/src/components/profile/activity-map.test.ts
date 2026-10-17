import { describe, expect, it } from "vitest"
import { toActivityCells } from "./activity-map"

describe("toActivityCells", () => {
  const today = new Date(2026, 9, 16, 15, 30) // 16/out/2026, horário local

  it("gera 365 dias contínuos terminando hoje (datas locais)", () => {
    const cells = toActivityCells([], today)
    expect(cells).toHaveLength(365)
    const last = cells[364]!
    expect([last.date.getFullYear(), last.date.getMonth(), last.date.getDate()]).toEqual([2026, 9, 16])
    expect(cells.every((c) => c.xp === 0 && c.activities === 0)).toBe(true)
  })

  it("posiciona os dias da API (yyyy-mm-dd) sem deslocar pelo fuso", () => {
    const cells = toActivityCells(
      [
        { date: "2026-10-16", xp: 120, activities: 2 },
        { date: "2026-10-01", xp: 50, activities: 1 },
        { date: "2020-01-01", xp: 999, activities: 9 }, // fora da janela: ignorado
      ],
      today,
    )
    expect(cells[364]).toMatchObject({ xp: 120, activities: 2 })
    expect(cells[349]).toMatchObject({ xp: 50, activities: 1 })
    expect(cells.reduce((s, c) => s + c.xp, 0)).toBe(170)
  })
})
