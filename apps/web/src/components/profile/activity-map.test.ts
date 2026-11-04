import { describe, expect, it } from "vitest"
import { activityColor, countTrailingActiveDays, groupIntoWeeks, toActivityCells } from "./activity-calendar"

describe("toActivityCells", () => {
  const today = new Date(2026, 9, 16, 15, 30) // 16/out/2026, horário local

  it("gera 365 dias contínuos terminando hoje (datas locais)", () => {
    const cells = toActivityCells([], today)
    expect(cells).toHaveLength(365)
    const last = cells[364]
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

describe("groupIntoWeeks", () => {
  it("completa a primeira semana com espaços até o dia da semana do primeiro dia", () => {
    const wednesday = new Date(2026, 9, 14)
    const weeks = groupIntoWeeks([{ date: wednesday, xp: 0, activities: 0 }])
    expect(weeks).toHaveLength(1)
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null])
    expect(weeks[0][3]?.date).toBe(wednesday)
  })
})

describe("activityColor e sequência", () => {
  it("dia sem XP é cinza e muito XP é o roxo mais escuro", () => {
    expect(activityColor(0)).toBe("#F3F4F6")
    expect(activityColor(99)).toBe("#E9D5FF")
    expect(activityColor(950)).toBe("#6D28D9")
  })

  it("conta os dias ativos seguidos até hoje", () => {
    const cell = (xp: number) => ({ date: new Date(), xp, activities: 0 })
    expect(countTrailingActiveDays([cell(10), cell(0), cell(5), cell(7)])).toBe(2)
    expect(countTrailingActiveDays([cell(10), cell(0)])).toBe(0)
  })
})
