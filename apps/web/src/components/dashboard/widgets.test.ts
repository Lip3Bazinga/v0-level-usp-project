import { describe, expect, it } from "vitest"
import type { Badge } from "@levelusp/contracts"
import { pickNextBadge } from "./widgets"

function badge(id: string, overrides: Partial<Badge> = {}): Badge {
  return {
    id, name: id, description: "", icon: "Trophy", rarity: "common", criteria_type: "total_xp",
    criteria_value: 1000, sort_order: 0, active: true, created_at: "2026-01-01T00:00:00Z", ...overrides,
  }
}

const profile = { total_xp: 500, current_streak: 2, max_streak: 9, lessons_completed: 9, courses_completed: 0 }

describe("pickNextBadge", () => {
  it("escolhe a badge com a maior fração do critério já cumprida", () => {
    const next = pickNextBadge(
      [badge("xp-1000"), badge("licoes-10", { criteria_type: "lessons_completed", criteria_value: 10 })],
      new Set(),
      profile,
    )
    expect(next).toEqual({ badge: expect.objectContaining({ id: "licoes-10" }), current: 9 })
  })

  it("ignora conquistadas, inativas, manuais e critério zerado", () => {
    const catalog = [
      badge("conquistada"),
      badge("inativa", { active: false }),
      badge("manual", { criteria_type: "manual" }),
      badge("zerada", { criteria_value: 0 }),
    ]
    expect(pickNextBadge(catalog, new Set(["conquistada"]), profile)).toBeNull()
  })

  it("limita o progresso ao valor do critério", () => {
    const next = pickNextBadge([badge("xp-100", { criteria_value: 100 })], new Set(), profile)
    expect(next?.current).toBe(100)
  })
})
