import type { LessonProgress } from "@levelusp/contracts"
import { describe, expect, it } from "vitest"
import { applyLessonCompletion, summarizeGamification } from "./progress"

const completion = { lessonId: "l1", userId: "u1", xpAwarded: 50, completedAt: "2026-03-10T12:00:00.000Z" }

describe("applyLessonCompletion", () => {
  it("cria o registro local quando a lição ainda não tinha progresso", () => {
    expect(applyLessonCompletion([], completion)).toEqual([
      expect.objectContaining({ id: "local-l1", lesson_id: "l1", status: "completed", xp_earned: 50 }),
    ])
  })

  it("marca como concluída e soma o XP de um progresso existente", () => {
    const existing: LessonProgress = {
      id: "p1", user_id: "u1", lesson_id: "l1", status: "in_progress", code_snapshot: null, score: null,
      xp_earned: 10, completed_at: null, created_at: "2026-03-01T00:00:00.000Z",
    }
    expect(applyLessonCompletion([existing], completion)).toEqual([
      { ...existing, status: "completed", xp_earned: 60, completed_at: completion.completedAt },
    ])
  })
})

describe("summarizeGamification", () => {
  it("usa valores iniciais sem perfil", () => {
    expect(summarizeGamification(null)).toEqual({
      level: 1, totalXp: 0, streak: 0, maxStreak: 0, xpInLevel: 0, xpCeil: 1000, xpProgress: 0,
    })
  })

  it("calcula o XP dentro do nível atual", () => {
    const summary = summarizeGamification({ level: 3, total_xp: 2500, current_streak: 2, max_streak: 7 })
    expect(summary).toMatchObject({ xpInLevel: 500, xpCeil: 3000, xpProgress: 17 })
  })
})
