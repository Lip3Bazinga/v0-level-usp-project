import { describe, expect, it } from "vitest"
import { reviewAnswers } from "./answer-sheet"

const questions = [
  { id: "q1", correctIndex: 0, explanation: "e1" },
  { id: "q2", correctIndex: 2, explanation: "e2" },
]

describe("reviewAnswers", () => {
  it("marca acertos e erros na ordem das questões", () => {
    expect(reviewAnswers(questions, { q1: 0, q2: 1 })).toEqual({
      review: [
        { questionId: "q1", correct: true, explanation: "e1" },
        { questionId: "q2", correct: false, explanation: "e2" },
      ],
      correctCount: 1,
      answeredQuestions: { q1: 0, q2: 1 },
    })
  })

  it("descarta respostas a questões de fora da folha", () => {
    expect(reviewAnswers(questions, { q1: 0, intrusa: 3 }).answeredQuestions).toEqual({ q1: 0 })
  })
})
