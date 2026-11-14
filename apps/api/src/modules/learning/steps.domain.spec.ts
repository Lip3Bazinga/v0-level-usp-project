import { describe, expect, it } from "vitest"
import type { StepQuizQuestionInput, TestCase } from "@levelusp/contracts"
import { findBlockingStep, gradeStepQuiz, isSolutionAvailable, matchesPrediction, normalizePredictionOutput, toStepCases } from "./steps.domain"

const STEPS = [{ id: "a", order: 1 }, { id: "b", order: 2 }, { id: "c", order: 3 }]

describe("findBlockingStep", () => {
  it("o primeiro passo nunca está travado", () => {
    expect(findBlockingStep(STEPS, new Set(), { id: "a", order: 1 })).toBeNull()
  })
  it("aponta o primeiro passo anterior não concluído", () => {
    expect(findBlockingStep(STEPS, new Set(), { id: "c", order: 3 })?.id).toBe("a")
    expect(findBlockingStep(STEPS, new Set(["a"]), { id: "c", order: 3 })?.id).toBe("b")
  })
  it("libera quando todos os anteriores estão concluídos (os posteriores não importam)", () => {
    expect(findBlockingStep(STEPS, new Set(["a"]), { id: "b", order: 2 })).toBeNull()
  })
})

describe("isSolutionAvailable", () => {
  it("libera ao alcançar o número de tentativas reprovadas", () => {
    expect(isSolutionAvailable(2, 3)).toBe(false)
    expect(isSolutionAvailable(3, 3)).toBe(true)
    expect(isSolutionAvailable(9, 3)).toBe(true)
  })
  it("0 significa que a solução nunca é liberada", () => {
    expect(isSolutionAvailable(100, 0)).toBe(false)
  })
})

describe("toStepCases", () => {
  const testCases: TestCase[] = [
    { kind: "io", id: "um", stdin: "", expected_stdout: "1", match: "trimmed", hint: "imprima 1", checkpoint: 1 },
    { kind: "io", id: "dois", stdin: "", expected_stdout: "2", match: "trimmed" },
  ]
  it("liga o caso ao checkpoint e só mostra a dica do caso que falhou", () => {
    const cases = toStepCases(
      [
        { id: "um", name: "Um", passed: false, message: "saída diferente" },
        { id: "dois", name: "Dois", passed: true, message: null },
      ],
      testCases,
    )
    expect(cases).toEqual([
      { id: "um", name: "Um", passed: false, message: "saída diferente", hint: "imprima 1", checkpoint: 1 },
      { id: "dois", name: "Dois", passed: true, message: null, hint: null, checkpoint: null },
    ])
  })
  it("não mostra a dica de um caso aprovado", () => {
    expect(toStepCases([{ id: "um", name: "Um", passed: true, message: null }], testCases)[0]?.hint).toBeNull()
  })
})

describe("gradeStepQuiz", () => {
  const questions: StepQuizQuestionInput[] = [
    { prompt: "1+1?", options: ["1", "2"], correct_index: 1, explanation: "dois" },
    { prompt: "2+2?", options: ["4", "5"], correct_index: 0, explanation: "quatro" },
    { prompt: "3+3?", options: ["5", "6"], correct_index: 1, explanation: "seis" },
  ]
  it("aprova com a nota mínima e devolve todas as explicações", () => {
    const grade = gradeStepQuiz(questions, [1, 0, 0], 60)
    expect(grade).toMatchObject({ score: 67, passed: true, correctCount: 2, total: 3 })
    expect(grade.review.map((item) => item.explanation)).toEqual(["dois", "quatro", "seis"])
  })
  it("na reprovação só explica o que o aluno acertou (não entrega as outras respostas)", () => {
    const grade = gradeStepQuiz(questions, [1, 1, 0], 70)
    expect(grade).toMatchObject({ score: 33, passed: false })
    expect(grade.review).toEqual([
      { index: 0, correct: true, explanation: "dois" },
      { index: 1, correct: false, explanation: "" },
      { index: 2, correct: false, explanation: "" },
    ])
  })
  it("resposta faltando conta como erro e resposta a mais é ignorada", () => {
    expect(gradeStepQuiz(questions, [1], 50).correctCount).toBe(1)
    expect(gradeStepQuiz(questions, [1, 0, 1, 0, 0], 100).passed).toBe(true)
  })
  it("quiz sem questões nunca aprova", () => {
    expect(gradeStepQuiz([], [], 1).passed).toBe(false)
  })
})

describe("previsão de saída", () => {
  it("ignora espaços no fim das linhas, linhas em branco no fim e \\r\\n", () => {
    expect(matchesPrediction("7\n16\nmédia: 7.0", "7  \r\n16\t\r\nmédia: 7.0\n\n  \n")).toBe(true)
    expect(matchesPrediction("7\n16\n", "7\n16")).toBe(true)
  })

  it("o resto conta: maiúsculas, espaço no começo ou no meio, linha em branco no meio, linha a mais ou a menos", () => {
    const expected = "Olá\n7.0"
    for (const wrong of ["olá\n7.0", " Olá\n7.0", "Olá\n\n7.0", "Olá\n7.0\n8", "Olá", "Olá\n7", "Olá \n 7.0", "", "\nOlá\n7.0"]) {
      expect(matchesPrediction(expected, wrong), JSON.stringify(wrong)).toBe(false)
    }
    expect(matchesPrediction("a b", "a  b")).toBe(false)
  })

  it("normalizePredictionOutput é idempotente", () => {
    const once = normalizePredictionOutput("a \n\n b \n\n")
    expect(once).toBe("a\n\n b")
    expect(normalizePredictionOutput(once)).toBe(once)
  })
})
