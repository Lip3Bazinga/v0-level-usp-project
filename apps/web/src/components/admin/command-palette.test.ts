import { describe, expect, it } from "vitest"
import { searchCommandTargets } from "./command-palette"

describe("busca ⌘K do admin", () => {
  const sources = {
    users: [{ id: "u1", full_name: "Ana Souza", email: "ana@usp.br", username: "ana" }],
    lessons: [{ id: "l1", title: "Listas em Python", module: "Estruturas" }],
    courses: [{ id: "c1", title: "Python Básico" }],
  }

  it("sem termo não devolve nada", () => {
    expect(searchCommandTargets("  ", sources)).toEqual([])
  })

  it("encontra usuários, lições (também pelo módulo) e cursos", () => {
    expect(searchCommandTargets("ana", sources).map((target) => target.kind)).toEqual(["user"])
    expect(searchCommandTargets("estrut", sources)[0]).toMatchObject({ kind: "lesson", page: "lessons", href: "/teacher/edit/l1" })
    expect(searchCommandTargets("python", sources).map((target) => target.kind)).toEqual(["lesson", "course"])
  })
})
