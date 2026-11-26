import { describe, expect, it } from "vitest"
import type { LessonStepInput } from "@levelusp/contracts"
import { buildVerifyRequest, exerciseSteps, inheritedStarterOf, requestSignature, toWrongSolutions, type GabaritoLesson } from "./gabarito-test"
import { createStep } from "./steps-form"

const reading = createStep("leitura", 1)
const first = createStep("exercicio", 2)
const second: LessonStepInput = { ...createStep("exercicio", 3), starter_files: [] }
const quiz = createStep("quiz", 4)
const lesson: GabaritoLesson = { runtime: "python-dados", libraries: ["numpy"], steps: [reading, first, second, quiz] }

describe("modelo do teste de gabarito", () => {
  it("só os passos de exercício têm gabarito para testar", () => {
    expect(exerciseSteps(lesson.steps).map((step) => step.order)).toEqual([2, 3])
  })

  it("o código inicial herdado é a solução do exercício anterior", () => {
    expect(inheritedStarterOf(lesson.steps, first)).toBeNull()
    expect(inheritedStarterOf(lesson.steps, second)).toEqual({ order: 2, files: first.solution_files })
  })

  it("soluções erradas: ignora as sem código e dá nome às sem nome", () => {
    const wrong = toWrongSolutions([{ name: "  esqueceu o print ", code: "x = 1\n" }, { name: "vazia", code: "  \n" }, { name: "", code: "pass\n" }])
    expect(wrong).toEqual([
      { name: "esqueceu o print", files: [{ path: "main.py", content: "x = 1\n" }] },
      { name: "Solução errada 3", files: [{ path: "main.py", content: "pass\n" }] },
    ])
  })

  it("monta o pedido com o motor da lição, o passo, o herdado e as soluções erradas", () => {
    const request = buildVerifyRequest(lesson, second, [{ name: "errada", code: "pass\n" }])
    expect(request).toEqual({
      ok: true,
      input: {
        runtime: "python-dados",
        libraries: ["numpy"],
        step: { ...second, wrong_solutions: [{ name: "errada", files: [{ path: "main.py", content: "pass\n" }] }] },
        inherited_starter: { order: 2, files: first.solution_files },
      },
    })
  })

  it("passo incompleto não vira pedido: devolve a mensagem de validação", () => {
    const request = buildVerifyRequest(lesson, { ...first, test_cases: [] }, [])
    expect(request).toEqual({ ok: false, error: "test_cases: um passo de exercício precisa de pelo menos um caso de teste" })
  })

  it("a assinatura muda com o gabarito e com as soluções erradas, não com o texto do passo", () => {
    const base = requestSignature(lesson, first, [])
    expect(requestSignature(lesson, { ...first, narrative_markdown: "Outro texto", title: "Outro título" }, [])).toBe(base)
    expect(requestSignature(lesson, { ...first, solution_files: [{ path: "main.py", content: "print(2)\n" }] }, [])).not.toBe(base)
    expect(requestSignature(lesson, first, [{ name: "errada", code: "pass\n" }])).not.toBe(base)
    expect(requestSignature({ ...lesson, runtime: "python" }, first, [])).not.toBe(base)
  })
})
