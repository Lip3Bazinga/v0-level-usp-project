import { describe, expect, it } from "vitest"
import type { LessonStepInput } from "@levelusp/contracts"
import { createStep } from "../steps-form"
import { buildPreviewSteps, contentWarnings, gradeQuizLocally, mermaidBlocks, stepSeedKey } from "./preview-model"

const reading = (narrative: string): LessonStepInput => ({ ...createStep("leitura", 1), narrative_markdown: narrative })

describe("buildPreviewSteps", () => {
  it("gera ids estáveis, contagens e nenhum gabarito no DTO", () => {
    const exercise: LessonStepInput = { ...createStep("exercicio", 2), hints: ["a", "b"] }
    const quiz: LessonStepInput = {
      ...createStep("quiz", 3),
      quiz_questions: [{ prompt: "P?", options: ["x", "y"], correct_index: 1, explanation: "porque sim" }],
    }
    const { steps, byId } = buildPreviewSteps([createStep("leitura", 1), exercise, quiz], "l1")

    expect(steps.map((step) => step.id)).toEqual(["previa-1", "previa-2", "previa-3"])
    expect(steps[1]).toMatchObject({ lesson_id: "l1", hint_count: 2, test_case_count: 1 })
    expect(steps[2]?.quiz_questions).toEqual([{ prompt: "P?", options: ["x", "y"] }])
    expect(byId.get("previa-2")).toBe(exercise)
    const serialized = JSON.stringify(steps)
    for (const secret of ["solution_files", "test_cases", "expected_output", "correct_index", "porque sim"]) expect(serialized).not.toContain(secret)
  })
})

describe("contentWarnings", () => {
  it("não avisa de um passo bem formado", () => {
    expect(contentWarnings({ ...createStep("exercicio", 1), narrative_markdown: "Veja $x^2$ e ![gato](gato.png)" })).toEqual([])
  })

  it("avisa de imagem sem texto alternativo e ignora a que está em bloco de código", () => {
    expect(contentWarnings(reading("![](a.png)")).join(" ")).toContain("sem texto alternativo")
    expect(contentWarnings(reading("```\n![](a.png)\n```"))).toEqual([])
  })

  it("avisa de fórmula KaTeX inválida (em linha e em bloco) e aceita as válidas", () => {
    expect(contentWarnings(reading("$\\frac{1$")).join(" ")).toContain("Fórmula KaTeX inválida")
    expect(contentWarnings(reading("$$\n\\sqrt{\n$$")).join(" ")).toContain("Fórmula KaTeX inválida")
    expect(contentWarnings(reading("$\\frac{1}{2}$ e $$x^2$$"))).toEqual([])
    expect(contentWarnings(reading("custa R$ 5 e R$ 6"))).toEqual([])
  })

  it("avisa de campos obrigatórios que faltam, por tipo de passo", () => {
    const empty = { ...createStep("exercicio", 1), title: " ", checkpoints: [], solution_files: [], test_cases: [] }
    expect(contentWarnings(empty)).toEqual([
      "O passo está sem título.",
      "O exercício está sem instruções.",
      "O exercício está sem solução de referência.",
      "O exercício está sem casos de teste.",
    ])
    expect(contentWarnings({ ...createStep("previsao", 1), starter_files: [], expected_output: "" })).toEqual([
      "A previsão está sem código para o aluno ler.",
      "A previsão está sem a saída esperada.",
    ])
    const quiz: LessonStepInput = { ...createStep("quiz", 1), quiz_questions: [{ prompt: "", options: ["só uma"], correct_index: 3, explanation: "" }] }
    expect(contentWarnings(quiz)).toHaveLength(3)
    expect(contentWarnings({ ...createStep("quiz", 1), quiz_questions: [] })).toEqual(["O quiz está sem questões."])
  })
})

describe("mermaidBlocks", () => {
  it("extrai o código de cada bloco mermaid dos textos do passo", () => {
    const step = { ...reading("antes\n```mermaid\ngraph TD\n  A-->B\n```\ndepois\n```python\nprint(1)\n```"), hints: ["```mermaid\ngraph LR\n```"] }
    expect(mermaidBlocks(step)).toEqual(["graph TD\n  A-->B", "graph LR"])
  })
})

describe("gradeQuizLocally", () => {
  const quiz: LessonStepInput = {
    ...createStep("quiz", 1),
    quiz_questions: [
      { prompt: "1", options: ["a", "b"], correct_index: 1, explanation: "e1" },
      { prompt: "2", options: ["a", "b"], correct_index: 0, explanation: "e2" },
    ],
  }

  it("aprova com a nota da lição e devolve a explicação de todas as questões", () => {
    const result = gradeQuizLocally(quiz, [1, 0], 70, "previa-1")
    expect(result).toMatchObject({ passed: true, score: 100, correct_count: 2, total: 2, step_completed: false, xp_awarded: 0 })
    expect(result.review.map((item) => item.explanation)).toEqual(["e1", "e2"])
  })

  it("reprova abaixo da nota mínima e marca as erradas", () => {
    const result = gradeQuizLocally(quiz, [1, 1], 70, "previa-1")
    expect(result).toMatchObject({ passed: false, score: 50, correct_count: 1 })
    expect(result.review.map((item) => item.correct)).toEqual([true, false])
  })
})

describe("stepSeedKey", () => {
  it("muda com o código inicial e não muda com a narrativa", () => {
    const base = createStep("exercicio", 1)
    expect(stepSeedKey({ ...base, narrative_markdown: "outro texto" })).toBe(stepSeedKey(base))
    expect(stepSeedKey({ ...base, starter_files: [{ path: "main.py", content: "x = 1" }] })).not.toBe(stepSeedKey(base))
  })
})
