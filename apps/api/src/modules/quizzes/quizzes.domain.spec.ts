import { describe, expect, it } from "vitest"
import { gradeQuiz } from "./quizzes.domain"

const qs = [
  { id: "q1", correctIndex: 0, explanation: "e1" },
  { id: "q2", correctIndex: 2, explanation: "e2" },
  { id: "q3", correctIndex: 1, explanation: "e3" },
]

describe("gradeQuiz", () => {
  it("acerta tudo = 100 e aprova", () => {
    expect(gradeQuiz(qs, { q1: 0, q2: 2, q3: 1 }, 70)).toMatchObject({ score: 100, passed: true, correctCount: 3, total: 3 })
  })

  it("arredonda a nota para inteiro e compara com a mínima", () => {
    const r = gradeQuiz(qs, { q1: 0, q2: 2, q3: 0 }, 70)
    expect(r.score).toBe(67)
    expect(r.passed).toBe(false)
    expect(gradeQuiz(qs, { q1: 0, q2: 2, q3: 0 }, 67).passed).toBe(true)
  })

  it("questão sem resposta conta como erro e ids estranhos são ignorados", () => {
    const r = gradeQuiz(qs, { q1: 0, outra: 1 }, 50)
    expect(r.correctCount).toBe(1)
    expect(r.review).toEqual([
      { questionId: "q1", correct: true, explanation: "e1" },
      { questionId: "q2", correct: false, explanation: "e2" },
      { questionId: "q3", correct: false, explanation: "e3" },
    ])
  })

  it("não é enganado por chaves herdadas do protótipo", () => {
    expect(gradeQuiz([{ id: "constructor", correctIndex: 0, explanation: "" }], {}, 1).correctCount).toBe(0)
  })

  it("quiz vazio nunca aprova", () => {
    expect(gradeQuiz([], {}, 1)).toMatchObject({ score: 0, passed: false, total: 0 })
  })
})
