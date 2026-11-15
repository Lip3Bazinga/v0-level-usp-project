import { describe, expect, it } from "vitest"
import type { Lesson } from "@levelusp/contracts"
import { buildCourseOutline, listPendingBeforeProject } from "./course-outline"

function lesson(id: string, module: string, moduleId: string | null, isProject = false): Lesson {
  return {
    id, title: id, description: "", slug: id, module, order: 1, difficulty: "iniciante", content_markdown: "", starter_code: "", starter_files: [],
    checkpoints: [], libraries: [], xp_reward: 50, time_limit: 10, lesson_type: "guided", quiz_passing_score: 70, course_id: "c", module_id: moduleId,
    published: true, created_at: "", updated_at: "", runtime: "python", is_project: isProject, objectives: [], solution_after_attempts: 3, steps: [],
  }
}

describe("buildCourseOutline", () => {
  const lessons = [lesson("a", "Fundamentos", "m1"), lesson("b", "Fundamentos", "m1"), lesson("c", "Funções", "m2"), lesson("p", "Projeto", "m9", true)]

  it("agrupa por módulo na ordem do curso e conta as concluídas", () => {
    const outline = buildCourseOutline(lessons, ["completed", "in-progress", "locked", "locked"])
    expect(outline.modules.map((module) => [module.title, module.lessons.map((item) => item.lesson.id), module.completedCount])).toEqual([
      ["Fundamentos", ["a", "b"], 1],
      ["Funções", ["c"], 0],
    ])
    expect(outline.modules[1]?.lessons[0]?.position).toBe(3)
  })

  it("separa o projeto e diz quantas lições ainda o travam", () => {
    const outline = buildCourseOutline(lessons, ["completed", "in-progress", "locked", "locked"])
    expect(outline.projects.map((item) => item.lesson.id)).toEqual(["p"])
    expect(outline.pendingBeforeProject).toBe(2)
    expect(buildCourseOutline(lessons, ["completed", "completed", "completed", "in-progress"]).pendingBeforeProject).toBe(0)
  })

  it("lições sem módulo ficam num grupo com título genérico", () => {
    expect(buildCourseOutline([lesson("x", "", null)], ["in-progress"]).modules[0]?.title).toBe("Lições")
  })
})

describe("listPendingBeforeProject", () => {
  const course = [lesson("a", "Fundamentos", "m1"), lesson("b", "Fundamentos", "m1"), lesson("p", "Projeto", "m9", true), lesson("q", "Projeto", "m9", true)]
  const done = (...ids: string[]) => (id: string): boolean => ids.includes(id)

  it("devolve, na ordem do curso, as lições comuns não concluídas (outro projeto não trava)", () => {
    expect(listPendingBeforeProject(lesson("p", "Projeto", "m9", true), course, done("a")).map((item) => item.id)).toEqual(["b"])
    expect(listPendingBeforeProject(lesson("p", "Projeto", "m9", true), course, done("a", "b"))).toEqual([])
  })

  it("ignora rascunhos e lições de outros cursos", () => {
    const mixed = [...course, { ...lesson("r", "Fundamentos", "m1"), published: false }, { ...lesson("x", "Outro", "m1"), course_id: "outro" }]
    expect(listPendingBeforeProject(lesson("p", "Projeto", "m9", true), mixed, done()).map((item) => item.id)).toEqual(["a", "b"])
  })

  it("é vazio para lição comum, projeto em rascunho ou sem curso", () => {
    expect(listPendingBeforeProject(lesson("a", "Fundamentos", "m1"), course, done())).toEqual([])
    expect(listPendingBeforeProject({ ...lesson("p", "Projeto", "m9", true), published: false }, course, done())).toEqual([])
    expect(listPendingBeforeProject({ ...lesson("p", "Projeto", "m9", true), course_id: null }, course, done())).toEqual([])
  })
})
