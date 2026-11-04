import { describe, expect, it } from "vitest"
import { filterNotes, sortByRecentUpdate } from "./note-collection"

const notes = [
  { title: "Laços", content: "<p>for e while</p>", lesson_title: "Repetição", course_title: "Python Básico", updated_at: "2026-10-01T10:00:00Z" },
  { title: null, content: "listas", lesson_title: undefined, course_title: undefined, updated_at: "2026-10-03T10:00:00Z" },
]

describe("filterNotes", () => {
  it("sem busca devolve todas", () => {
    expect(filterNotes(notes, "  ", ["title"])).toHaveLength(2)
  })

  it("busca só nos campos pedidos, sem diferenciar maiúsculas", () => {
    expect(filterNotes(notes, "PYTHON", ["title", "content", "lesson_title", "course_title"])).toEqual([notes[0]])
    expect(filterNotes(notes, "python", ["title", "content", "lesson_title"])).toEqual([])
  })

  it("aceita título vazio", () => {
    expect(filterNotes(notes, "listas", ["title", "content"])).toEqual([notes[1]])
  })
})

describe("sortByRecentUpdate", () => {
  it("põe a nota editada por último no topo", () => {
    expect(sortByRecentUpdate(notes).map((note) => note.updated_at)).toEqual(["2026-10-03T10:00:00Z", "2026-10-01T10:00:00Z"])
  })
})
