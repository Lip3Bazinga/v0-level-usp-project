import { describe, expect, it } from "vitest"
import { lessonStepsSchema } from "@levelusp/contracts"
import { checkpointsFromLines, createStep, hintsFromLines, mainFileContent, parseTestCasesJson, renumberSteps, validateSteps, withMainFileContent } from "./steps-form"

describe("passos no editor do professor", () => {
  it("todo passo novo já passa no schema da API", () => {
    const steps = [createStep("leitura", 1), createStep("exercicio", 2), createStep("quiz", 3)]
    expect(lessonStepsSchema.safeParse(steps).success).toBe(true)
    expect(validateSteps(steps)).toBeNull()
  })

  it("renumera depois de remover ou mover", () => {
    const steps = [createStep("leitura", 1), createStep("quiz", 3)]
    expect(renumberSteps(steps).map((step) => step.order)).toEqual([1, 2])
  })

  it("aponta o passo com problema", () => {
    expect(validateSteps([])).toBe("Uma lição guiada precisa de pelo menos um passo.")
    const broken = [{ ...createStep("exercicio", 1), test_cases: [] }]
    expect(validateSteps(broken)).toBe("Passo 1: um passo de exercício precisa de pelo menos um caso de teste")
  })

  it("instruções por linha viram checkpoints numerados e mantêm a dica da posição", () => {
    expect(checkpointsFromLines("um\n\n  dois  ", [{ id: 1, instruction: "antigo", hint: "dica" }])).toEqual([
      { id: 1, instruction: "um", hint: "dica" },
      { id: 2, instruction: "dois" },
    ])
  })

  it("limita as dicas a três", () => {
    expect(hintsFromLines("a\nb\nc\nd")).toEqual(["a", "b", "c"])
  })

  it("edita o main.py preservando os outros arquivos", () => {
    const files = [{ path: "dados.csv", content: "x" }, { path: "main.py", content: "antes" }]
    expect(mainFileContent(files)).toBe("antes")
    expect(withMainFileContent(files, "depois")).toEqual([{ path: "main.py", content: "depois" }, { path: "dados.csv", content: "x" }])
    expect(withMainFileContent([{ path: "main.py", content: "x" }], "")).toEqual([])
  })

  it("valida o JSON dos casos com o schema do contrato", () => {
    expect(parseTestCasesJson("[")).toEqual({ ok: false, error: "JSON inválido: confira vírgulas, aspas e colchetes." })
    expect(parseTestCasesJson('[{"kind":"io"}]').ok).toBe(false)
    const parsed = parseTestCasesJson('[{"kind":"io","id":"a","stdin":"","expected_stdout":"1"}]')
    expect(parsed.ok && parsed.cases[0]?.id).toBe("a")
  })
})
