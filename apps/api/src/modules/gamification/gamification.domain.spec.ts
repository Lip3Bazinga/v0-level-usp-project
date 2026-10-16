import { describe, expect, it } from "vitest"
import { eligibleBadges, levelForXp, nextStreak, previousDate, saoPauloDate } from "./gamification.domain"

describe("nextStreak", () => {
  it("mantém a sequência quando já houve atividade hoje", () => {
    expect(nextStreak("2026-10-15", "2026-10-15", 4)).toEqual({ streak: 4, increased: false, reset: false })
  })
  it("incrementa quando a última atividade foi ontem", () => {
    expect(nextStreak("2026-10-14", "2026-10-15", 4)).toEqual({ streak: 5, increased: true, reset: false })
  })
  it("reinicia quando passou mais de um dia", () => {
    expect(nextStreak("2026-10-10", "2026-10-15", 9)).toMatchObject({ streak: 1, reset: true })
  })
  it("começa em 1 no primeiro acesso", () => {
    expect(nextStreak(null, "2026-10-15", 0)).toMatchObject({ streak: 1, increased: true, reset: false })
  })
  it("atravessa virada de mês e ano", () => {
    expect(previousDate("2026-03-01")).toBe("2026-02-28")
    expect(previousDate("2027-01-01")).toBe("2026-12-31")
  })
})

describe("saoPauloDate", () => {
  it("usa o fuso de São Paulo (UTC-3)", () => {
    expect(saoPauloDate(new Date("2026-10-16T02:30:00Z"))).toBe("2026-10-15")
    expect(saoPauloDate(new Date("2026-10-16T03:30:00Z"))).toBe("2026-10-16")
  })
})

describe("levelForXp", () => {
  it("sobe um nível a cada 1000 XP", () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(999)).toBe(1)
    expect(levelForXp(1000)).toBe(2)
    expect(levelForXp(4500)).toBe(5)
  })
})

describe("eligibleBadges", () => {
  const rules = [
    { id: "xp-100", criteriaType: "total_xp" as const, criteriaValue: 100, active: true },
    { id: "streak-3", criteriaType: "current_streak" as const, criteriaValue: 3, active: true },
    { id: "manual", criteriaType: "manual" as const, criteriaValue: 0, active: true },
    { id: "off", criteriaType: "total_xp" as const, criteriaValue: 0, active: false },
  ]
  const stats = { total_xp: 150, current_streak: 2, max_streak: 5, lessons_completed: 3, courses_completed: 0 }

  it("concede só badges automáticos, ativos, atingidos e ainda não obtidos", () => {
    expect(eligibleBadges(stats, rules, new Set())).toEqual(["xp-100"])
    expect(eligibleBadges(stats, rules, new Set(["xp-100"]))).toEqual([])
  })
})
