import { describe, expect, it } from "vitest"
import { EMPTY_COURSE_FORM, addTag, diffCourseInput, toCourseInput, validateCourseForm } from "./course-form"

describe("formulário do curso", () => {
  it("apara o título e não envia mais os campos do projeto final antigo (o projeto é uma lição)", () => {
    const input = toCourseInput({ ...EMPTY_COURSE_FORM, title: " Python " })
    expect(input.title).toBe("Python")
    expect(Object.keys(input).some((field) => field.startsWith("final_project"))).toBe(false)
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
