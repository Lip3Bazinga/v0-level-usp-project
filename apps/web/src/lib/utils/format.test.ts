import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeDay,
  formatTimeAgo,
  formatXp,
  truncatePlainText,
} from "./format"

describe("formatação em pt-BR", () => {
  it("números, XP e porcentagem", () => {
    expect(formatNumber(1234567)).toBe("1.234.567")
    expect(formatXp(1500)).toBe("1.500 XP")
    expect(formatPercent(87.4)).toBe("87%")
    expect(formatPercent(12.34, 1)).toBe("12,3%")
  })

  it("datas nos estilos usados pela interface", () => {
    const date = new Date(2026, 2, 5, 14, 32)
    expect(formatDate(date)).toBe("05/03/2026")
    expect(formatDate(date, "long")).toBe("5 de março de 2026")
    expect(formatDate(date, "monthYear")).toBe("março de 2026")
  })

  it("remove HTML e trunca com reticências", () => {
    expect(truncatePlainText("<p>Olá <b>mundo</b></p>")).toBe("Olá mundo")
    expect(truncatePlainText("abcdef", 3)).toBe("abc…")
  })
})

describe("tempo relativo", () => {
  const now = new Date(2026, 2, 10, 12, 0)
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })
  afterEach(() => vi.useRealTimers())

  const minutesAgo = (minutes: number): Date => new Date(now.getTime() - minutes * 60_000)

  it("formatTimeAgo em minutos, horas e dias", () => {
    expect(formatTimeAgo(minutesAgo(0))).toBe("há 0min")
    expect(formatTimeAgo(minutesAgo(0), { withNow: true })).toBe("agora")
    expect(formatTimeAgo(minutesAgo(5))).toBe("há 5min")
    expect(formatTimeAgo(minutesAgo(3 * 60))).toBe("há 3h")
    expect(formatTimeAgo(minutesAgo(2 * 24 * 60))).toBe("há 2d")
  })

  it("formatRelativeDay para hoje, ontem, dias da semana e datas antigas", () => {
    expect(formatRelativeDay(minutesAgo(30))).toBe("Hoje, 11:30")
    expect(formatRelativeDay(minutesAgo(24 * 60))).toBe("Ontem")
    expect(formatRelativeDay(minutesAgo(3 * 24 * 60))).toBe("3 dias atrás")
    expect(formatRelativeDay(new Date(2026, 0, 5))).toBe("05 de jan.")
  })
})
