import { describe, expect, it } from "vitest"
import type { Badge } from "@levelusp/contracts"
import { toDisplayBadges } from "./display-badges"

function badge(id: string): Badge {
  return {
    id, name: id, description: "", icon: "Trophy", rarity: "common", criteria_type: "total_xp",
    criteria_value: 100, sort_order: 0, active: true, created_at: "2026-01-01T00:00:00Z",
  }
}

describe("toDisplayBadges", () => {
  it("marca as conquistadas com a data e mantém a ordem do catálogo", () => {
    const badges = toDisplayBadges(
      [badge("primeira"), badge("segunda")],
      [{ user_id: "u1", badge_id: "segunda", earned_at: "2026-10-05T12:00:00Z" }],
    )
    expect(badges.map((item) => [item.id, item.isEarned])).toEqual([["primeira", false], ["segunda", true]])
    expect(badges[1].earnedAt?.toISOString()).toBe("2026-10-05T12:00:00.000Z")
    expect(badges[0].earnedAt).toBeUndefined()
  })
})
