import { describe, expect, it } from "vitest"
import { draftStepSubmitSchema, draftStepVerifySchema, MAX_DRAFT_WRONG_SOLUTIONS } from "./draft-steps"

const main = (content: string): { path: string; content: string } => ({ path: "main.py", content })
const exercise = {
  order: 1,
  kind: "exercicio",
  title: "Diga olá",
  starter_files: [main("# seu código\n")],
  solution_files: [main('print("Olá")\n')],
  test_cases: [{ kind: "io", id: "saida", expected_stdout: "Olá" }],
}

describe("contrato do teste de gabarito do rascunho", () => {
  it("aplica os padrões: motor python, sem bibliotecas, sem soluções erradas e sem código herdado", () => {
    const parsed = draftStepVerifySchema.parse({ step: exercise })
    expect(parsed).toMatchObject({ runtime: "python", libraries: [], inherited_starter: null })
    expect(parsed.step.wrong_solutions).toEqual([])
    expect(parsed.step.exercise_mode).toBe("codigo")
  })

  it("só aceita passo de exercício válido (as regras do passo do pacote)", () => {
    const messages = (step: object): string[] => {
      const result = draftStepVerifySchema.safeParse({ step })
      return result.success ? [] : result.error.issues.map((issue) => issue.message)
    }
    expect(messages({ order: 1, kind: "leitura", title: "Texto" })).toEqual(["só passos de exercício têm gabarito para testar"])
    expect(messages({ ...exercise, test_cases: [] })).toEqual(["um passo de exercício precisa de pelo menos um caso de teste"])
    expect(messages({ ...exercise, exercise_mode: "lacunas" })[0]).toContain("precisa de pelo menos uma lacuna")
  })

  it("limita as soluções erradas por pedido", () => {
    const wrong = (count: number): object[] => Array.from({ length: count }, (_item, index) => ({ name: `errada ${index + 1}`, files: [main("pass\n")] }))
    expect(draftStepVerifySchema.safeParse({ step: { ...exercise, wrong_solutions: wrong(MAX_DRAFT_WRONG_SOLUTIONS) } }).success).toBe(true)
    expect(draftStepVerifySchema.safeParse({ step: { ...exercise, wrong_solutions: wrong(MAX_DRAFT_WRONG_SOLUTIONS + 1) } }).success).toBe(false)
  })

  it("a submissão da prévia exige arquivos ou arranjo", () => {
    expect(draftStepSubmitSchema.safeParse({ step: exercise }).success).toBe(false)
    expect(draftStepSubmitSchema.safeParse({ step: exercise, files: [main("print(1)\n")] }).success).toBe(true)
    expect(draftStepSubmitSchema.safeParse({ step: exercise, arrangement: [{ line_id: "l1", indent: 0 }] }).success).toBe(true)
    expect(draftStepSubmitSchema.safeParse({ step: exercise, files: [{ path: "../fora.py", content: "" }] }).success).toBe(false)
  })
})
