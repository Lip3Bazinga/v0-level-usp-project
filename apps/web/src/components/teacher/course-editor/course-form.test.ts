import { describe, expect, it } from "vitest"
import { EMPTY_COURSE_FORM, addTag, diffCourseInput, toCourseInput, validateCourseForm } from "./course-form"

describe("formulário do curso", () => {
  it("campos opcionais vazios viram null", () => {
    const input = toCourseInput({ ...EMPTY_COURSE_FORM, title: " Python ", final_project_title: "   " })
    expect(input.title).toBe("Python")
    expect(input.final_project_title).toBeNull()
  })

  it("PATCH contém só os campos alterados", () => {
    const before = toCourseInput({ ...EMPTY_COURSE_FORM, title: "Python" })
    expect(diffCourseInput(before, { ...before, tags: ["iniciante"] })).toEqual({ tags: ["iniciante"] })
    expect(diffCourseInput(before, before)).toEqual({})
  })

  it("valida o título", () => {
    expect(validateCourseForm({ ...EMPTY_COURSE_FORM, title: "Py" })).toMatch(/3 caracteres/)
    expect(validateCourseForm({ ...EMPTY_COURSE_FORM, title: "Python" })).toBeNull()
  })

  it("adiciona tags novas e ignora repetidas ou vazias", () => {
    expect(addTag(["python"], " dados ")).toEqual(["python", "dados"])
    expect(addTag(["python"], "python")).toEqual(["python"])
    expect(addTag(["python"], "  ")).toEqual(["python"])
  })
})
