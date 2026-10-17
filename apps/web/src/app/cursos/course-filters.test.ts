import { describe, expect, it } from "vitest"
import { filterCourses } from "./course-filters"

const courses = [
  { title: "Python Básico", description: "Primeiros passos", level: "iniciante" as const },
  { title: "Ciência de Dados", description: "Pandas e gráficos", level: "intermediario" as const },
]

describe("filterCourses", () => {
  it("busca no título e na descrição sem diferenciar maiúsculas", () => {
    expect(filterCourses(courses, "PANDAS", "all").map((course) => course.title)).toEqual(["Ciência de Dados"])
    expect(filterCourses(courses, "python", "all")).toHaveLength(1)
  })

  it("combina a busca com o filtro de nível", () => {
    expect(filterCourses(courses, "", "iniciante").map((course) => course.title)).toEqual(["Python Básico"])
    expect(filterCourses(courses, "pandas", "iniciante")).toEqual([])
  })
})
