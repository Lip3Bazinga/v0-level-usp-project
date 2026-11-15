import { describe, expect, it } from "vitest"
import { isParsonsSolutionOrder, lessonStepsSchema, parsonsSolutionPlacements } from "@levelusp/contracts"
import {
  buildParsonsLines, checkpointsFromLines, createStep, exerciseModeChanges, hintsFromLines, mainFileContent, parseTestCasesJson, parsonsContentChanges, parsonsDistractors,
  renumberSteps, validateSteps, withMainFileContent,
} from "./steps-form"

const PARSONS_SOLUTION = 'def situacao(notas):\n    media = sum(notas) / len(notas)\n    if media >= 6:\n        return "aprovado"\n    return "reprovado"\n'

describe("passos no editor do professor", () => {
  it("todo passo novo já passa no schema da API", () => {
    const steps = [createStep("leitura", 1), createStep("exercicio", 2), createStep("quiz", 3), createStep("previsao", 4)]
    expect(lessonStepsSchema.safeParse(steps).success).toBe(true)
    expect(validateSteps(steps)).toBeNull()
  })

  it("previsão sem código ou sem saída esperada é apontada antes de salvar", () => {
    const prediction = createStep("previsao", 1)
    expect(validateSteps([{ ...prediction, expected_output: "  " }])).toBe("Passo 1: um passo de previsão precisa da saída esperada")
    expect(validateSteps([{ ...prediction, starter_files: [] }])).toBe("Passo 1: um passo de previsão precisa do código a ler em main.py")
  })

  it("modo lacunas exige pelo menos uma lacuna no código inicial", () => {
    const exercise = createStep("exercicio", 1)
    const blanks = { ...exercise, ...exerciseModeChanges(exercise, "lacunas") }
    expect(validateSteps([blanks])).toMatch(/^Passo 1: um exercício de lacunas precisa de pelo menos uma lacuna/)
    expect(validateSteps([{ ...blanks, starter_files: [{ path: "main.py", content: "print(___)\n" }] }])).toBeNull()
  })

  it("modo ordenar gera as linhas da solução embaralhadas, sem código inicial, e passa no schema", () => {
    const exercise = { ...createStep("exercicio", 1), solution_files: [{ path: "main.py", content: PARSONS_SOLUTION }] }
    const parsons = { ...exercise, ...exerciseModeChanges(exercise, "ordenar") }
    expect(parsons.starter_files).toEqual([])
    expect(parsons.parsons_lines).toHaveLength(5)
    expect(parsons.parsons_lines.every((line) => line.text === line.text.trim())).toBe(true)
    expect(isParsonsSolutionOrder(parsons.parsons_lines, PARSONS_SOLUTION)).toBe(false)
    expect(validateSteps([parsons])).toBeNull()

    const withDistractors = { ...parsons, ...parsonsContentChanges(PARSONS_SOLUTION, ["if media > 6:", "  return aprovado  ", ""]) }
    expect(withDistractors.parsons_lines).toHaveLength(7)
    expect(parsonsDistractors(withDistractors.parsons_lines, PARSONS_SOLUTION).sort()).toEqual(["if media > 6:", "return aprovado"])
    expect(parsonsSolutionPlacements(withDistractors.parsons_lines, PARSONS_SOLUTION)).not.toBeNull()
    expect(validateSteps([withDistractors])).toBeNull()

    // Voltar ao modo código descarta as linhas (a API recusa parsons_lines fora do modo ordenar).
    expect(exerciseModeChanges(withDistractors, "codigo")).toEqual({ exercise_mode: "codigo", parsons_lines: [] })
  })

  it("o embaralhamento é estável para o mesmo texto e os ids não seguem a ordem da solução", () => {
    const first = buildParsonsLines(PARSONS_SOLUTION, ["x = 1"])
    expect(buildParsonsLines(PARSONS_SOLUTION, ["x = 1"])).toEqual(first)
    expect(first.map((line) => line.id)).toEqual(["l1", "l2", "l3", "l4", "l5", "l6"])
    expect(new Set(first.map((line) => line.text)).size).toBe(6)
    // Duas linhas: a única ordem diferente da solução é a invertida.
    expect(buildParsonsLines("a = 1\nprint(a)\n", []).map((line) => line.text)).toEqual(["print(a)", "a = 1"])
  })

  it("solução com indentação irregular é apontada no modo ordenar", () => {
    const exercise = { ...createStep("exercicio", 1), solution_files: [{ path: "main.py", content: "if True:\n  print(1)\n" }] }
    expect(validateSteps([{ ...exercise, ...exerciseModeChanges(exercise, "ordenar") }])).toMatch(/^Passo 1: as linhas não montam a solução/)
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
