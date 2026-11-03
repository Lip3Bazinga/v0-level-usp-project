import { describe, expect, it } from "vitest"
import { countCompletedLessons, groupLessonsByCourse, groupLessonsByModule, sumEarnedXp } from "./course-groups"

describe("groupLessonsByCourse", () => {
  it("mantém a ordem do catálogo, ordena as lições e omite cursos sem lição", () => {
    const groups = groupLessonsByCourse(
      [{ id: "b" }, { id: "vazio" }, { id: "a" }],
      [
        { id: "a2", course_id: "a", order: 2 },
        { id: "b1", course_id: "b", order: 1 },
        { id: "a1", course_id: "a", order: 1 },
        { id: "solta", course_id: null, order: 1 },
      ],
    )
    expect(groups.map((group) => group.course.id)).toEqual(["b", "a"])
    expect(groups[1]?.lessons.map((lesson) => lesson.id)).toEqual(["a1", "a2"])
  })
})

describe("groupLessonsByModule", () => {
  it("agrupa por módulo na ordem de aparição e usa 'Módulo 1' para lição sem módulo", () => {
    const modules = groupLessonsByModule([
      { id: "x", module: "Laços", order: 2 },
      { id: "y", module: "", order: 1 },
      { id: "z", module: "Laços", order: 1 },
    ])
    expect(modules.map((group) => group.name)).toEqual(["Laços", "Módulo 1"])
    expect(modules[0]?.lessons.map((lesson) => lesson.id)).toEqual(["z", "x"])
  })
})

describe("progresso do aluno", () => {
  const progressByLessonId = new Map([
    ["a", { status: "completed" as const, xp_earned: 30 }],
    ["b", { status: "in_progress" as const, xp_earned: 5 }],
  ])

  it("conta só as lições concluídas", () => {
    expect(countCompletedLessons(progressByLessonId)).toBe(1)
  })

  it("soma o XP ganho nas lições do curso", () => {
    expect(sumEarnedXp([{ id: "a" }, { id: "b" }, { id: "c" }], progressByLessonId)).toBe(35)
  })
})
