import { describe, expect, it } from "vitest"
import { computeTrailStatuses } from "./trail"

describe("computeTrailStatuses", () => {
  const lessons = [{ id: "l1" }, { id: "l2" }, { id: "l3" }, { id: "l4" }]

  it("sem progresso: só a primeira lição fica disponível", () => {
    expect(computeTrailStatuses(lessons, new Map())).toEqual(["in-progress", "locked", "locked", "locked"])
  })

  it("libera a lição seguinte à última concluída", () => {
    const progress = new Map([
      ["l1", { status: "completed" as const }],
      ["l2", { status: "in_progress" as const }],
    ])
    expect(computeTrailStatuses(lessons, progress)).toEqual(["completed", "in-progress", "locked", "locked"])
  })

  it("lições concluídas continuam concluídas mesmo depois de uma bloqueada", () => {
    const progress = new Map([
      ["l1", { status: "completed" as const }],
      ["l3", { status: "completed" as const }],
    ])
    expect(computeTrailStatuses(lessons, progress)).toEqual(["completed", "in-progress", "completed", "locked"])
  })

  it("tudo concluído e lista vazia", () => {
    const all = new Map(lessons.map((lesson) => [lesson.id, { status: "completed" as const }]))
    expect(computeTrailStatuses(lessons, all)).toEqual(["completed", "completed", "completed", "completed"])
    expect(computeTrailStatuses([], new Map())).toEqual([])
  })
})
