import { describe, expect, it } from "vitest"
import type { LessonSummary } from "@levelusp/contracts"
import { ROUTES } from "@/lib/constants"
import { getLessonPosition } from "./use-lesson-navigation"

function summary(id: string, courseId: string | null): LessonSummary {
  return {
    id, course_id: courseId, title: id, slug: id, module: "", module_id: null, order: 0,
    difficulty: "iniciante", lesson_type: "coding", xp_reward: 10, published: true,
  }
}

const allLessons = [
  summary("a1", "curso-a"),
  summary("a2", "curso-a"),
  summary("b1", "curso-b"),
  summary("solta", null),
]

describe("getLessonPosition", () => {
  it("navega só entre lições do mesmo curso", () => {
    const position = getLessonPosition(allLessons, 1, { id: "a2", course_id: "curso-a" })
    expect(position).toMatchObject({
      positionInCourse: 1,
      courseLessonCount: 2,
      previousLessonId: "a1",
      nextLessonId: null,
      isCourseEnd: true,
      exitRoute: ROUTES.course("curso-a"),
    })
  })

  it("a primeira lição de um curso não volta para a lição de outro curso", () => {
    const position = getLessonPosition(allLessons, 2, { id: "b1", course_id: "curso-b" })
    expect(position.previousLessonId).toBeNull()
    expect(position.positionInCourse).toBe(0)
  })

  it("lição avulsa sai para o painel e não é fim de curso", () => {
    const position = getLessonPosition(allLessons, 3, { id: "solta", course_id: null })
    expect(position.isCourseEnd).toBe(false)
    expect(position.exitRoute).toBe(ROUTES.dashboard)
  })

  it("aponta a próxima lição quando ela é do mesmo curso", () => {
    const position = getLessonPosition(allLessons, 0, { id: "a1", course_id: "curso-a" })
    expect(position.nextLessonId).toBe("a2")
    expect(position.isCourseEnd).toBe(false)
  })
})
