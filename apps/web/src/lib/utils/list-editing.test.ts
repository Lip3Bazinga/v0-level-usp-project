import { describe, expect, it } from "vitest"
import { moveItem, removeChoiceAt } from "./list-editing"

describe("moveItem", () => {
  it("troca o item com o vizinho", () => {
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"])
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"])
  })

  it("não move para fora da lista", () => {
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"])
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"])
  })
})

describe("removeChoiceAt", () => {
  const question = { prompt: "?", options: ["a", "b", "c"], correct_index: 2 }

  it("mantém o gabarito na mesma alternativa", () => {
    expect(removeChoiceAt(question, 0)).toEqual({ prompt: "?", options: ["b", "c"], correct_index: 1 })
    expect(removeChoiceAt({ ...question, correct_index: 0 }, 2).correct_index).toBe(0)
  })

  it("volta para a primeira quando a correta é removida", () => {
    expect(removeChoiceAt(question, 2)).toEqual({ prompt: "?", options: ["a", "b"], correct_index: 0 })
  })
})
