import { describe, expect, it } from "vitest"
import type { CaseResult, GradeResult, GradingStrength } from "@levelusp/contracts"
import {
  concludeStepVerification, planStepVerification, resolveSolution, resolveStepStarter, UNASSEMBLED_PARSONS_DETAIL, wrongSolutionFiles,
  type StepVerificationGrades, type VerifiableStep,
} from "./step-verification.domain"

const main = (content: string): { path: string; content: string } => ({ path: "main.py", content })

const step = (overrides: Partial<VerifiableStep> = {}): VerifiableStep => ({
  exercise_mode: "codigo",
  parsons_lines: [],
  starter_files: [main("# seu código\n")],
  solution_files: [main("print('oi')\n"), { path: "dados.csv", content: "a,b\n" }],
  wrong_solutions: [],
  ...overrides,
})

const parsonsStep = (solution: string): VerifiableStep =>
  step({
    exercise_mode: "ordenar",
    starter_files: [],
    solution_files: [main(solution)],
    parsons_lines: [{ id: "l1", text: "print(i)" }, { id: "l2", text: "for i in range(2):" }],
  })

const grade = (passed: boolean, extra: { strength?: GradingStrength; ids?: string[]; durationMs?: number; failureDetails?: string[] } = {}): GradeResult => {
  const cases: CaseResult[] = (extra.ids ?? ["c1"]).map((id) => ({ id, name: id, passed, message: passed ? null : "saída diferente" }))
  return {
    testsRun: cases.length,
    passed: passed ? cases.length : 0,
    failures: passed ? 0 : cases.length,
    errors: 0,
    allPassed: passed,
    failureDetails: extra.failureDetails ?? (passed ? [] : cases.map((item) => `${item.id}: saída diferente`)),
    cases,
    strength: extra.strength ?? "strong",
    durationMs: extra.durationMs ?? 0,
  }
}

const grades = (overrides: Partial<StepVerificationGrades> = {}): StepVerificationGrades => ({ solution: grade(true), starter: grade(false), wrong: [], ...overrides })

describe("resolveStepStarter", () => {
  it("usa o código inicial do próprio passo, mesmo havendo um herdado", () => {
    const own = step()
    expect(resolveStepStarter(own, { order: 1, files: [main("x = 1\n")] })).toEqual({ files: own.starter_files, inheritedFrom: null })
  })

  it("sem código inicial próprio, parte do herdado; sem nenhum, não há o que rodar", () => {
    const empty = step({ starter_files: [] })
    expect(resolveStepStarter(empty, { order: 2, files: [main("x = 1\n")] })).toEqual({ files: [main("x = 1\n")], inheritedFrom: 2 })
    expect(resolveStepStarter(empty, null)).toBeNull()
  })

  it("no modo ordenar, são as linhas na ordem embaralhada e sem indentação (o herdado é ignorado)", () => {
    const starter = resolveStepStarter(parsonsStep("for i in range(2):\n    print(i)\n"), { order: 1, files: [main("x = 1\n")] })
    expect(starter).toEqual({ files: [main("print(i)\nfor i in range(2):\n")], inheritedFrom: null, isShuffledOrder: true })
  })
})

describe("resolveSolution e wrongSolutionFiles", () => {
  it("no modo ordenar, monta a solução com as linhas do passo; null quando elas não montam", () => {
    expect(resolveSolution(parsonsStep("for i in range(2):\n    print(i)\n"))).toEqual([main("for i in range(2):\n    print(i)\n")])
    expect(resolveSolution(parsonsStep("for i in range(3):\n    print(i)\n"))).toBeNull()
  })

  it("a solução errada substitui só os arquivos que declara e mantém os demais da solução", () => {
    const files = wrongSolutionFiles(step(), [main("print('tchau')\n")])
    expect(files).toEqual([{ path: "dados.csv", content: "a,b\n" }, main("print('tchau')\n")])
  })
})

describe("planStepVerification", () => {
  it("planeja a solução, o código inicial e cada solução errada já com os arquivos da solução", () => {
    const target = step({ wrong_solutions: [{ name: "sem aspas", files: [main("print(oi)\n")] }] })
    const starter = resolveStepStarter(target, null)
    expect(planStepVerification(target, starter)).toEqual({
      solution: target.solution_files,
      starter,
      wrong: [{ name: "sem aspas", files: [{ path: "dados.csv", content: "a,b\n" }, main("print(oi)\n")] }],
    })
  })

  it("devolve null quando as linhas de ordenar não montam a solução", () => {
    expect(planStepVerification(parsonsStep("while True:\n    pass\n"), null)).toBeNull()
    expect(UNASSEMBLED_PARSONS_DETAIL).toContain("não montam")
  })
})

describe("concludeStepVerification", () => {
  const target = step({ wrong_solutions: [{ name: "sem aspas", files: [main("print(oi)\n")] }] })
  const starter = resolveStepStarter(target, null)
  const wrong = [{ name: "sem aspas", result: grade(false) }]

  it("ok: a solução aprova, o código inicial reprova e a solução errada reprova", () => {
    const outcome = concludeStepVerification(target, starter, { solution: grade(true, { durationMs: 5 }), starter: grade(false, { durationMs: 3 }), wrong }, { requireWrongSolutions: true })
    expect(outcome).toEqual({ status: "ok", details: [], durationMs: 8 })
  })

  it("falha quando a solução de referência reprova, citando até 5 casos", () => {
    const failureDetails = ["c1", "c2", "c3", "c4", "c5", "c6", "c7"].map((id) => `${id}: saída diferente`)
    const outcome = concludeStepVerification(target, starter, grades({ solution: grade(false, { failureDetails }), wrong }), { requireWrongSolutions: true })
    expect(outcome.status).toBe("falha")
    expect(outcome.details).toEqual(["solução de referência REPROVADA:", ...failureDetails.slice(0, 5).map((detail) => `  ${detail}`), "  … e mais 2"])
  })

  it("falha quando o código inicial aprova, dizendo de onde ele veio", () => {
    const own = concludeStepVerification(target, starter, grades({ starter: grade(true, { ids: ["c1", "c2"] }), wrong }), { requireWrongSolutions: true })
    expect(own.details).toEqual(["código inicial APROVADO sem o aluno fazer nada (casos que passaram: c1, c2)"])

    const inherited = concludeStepVerification(target, { files: [main("x = 1\n")], inheritedFrom: 3 }, grades({ starter: grade(true), wrong }), { requireWrongSolutions: true })
    expect(inherited.details[0]).toContain("código inicial herdado do passo 3 APROVADO")

    const shuffled = parsonsStep("for i in range(2):\n    print(i)\n")
    const shuffledOutcome = concludeStepVerification(shuffled, resolveStepStarter(shuffled, null), grades({ starter: grade(true) }), { requireWrongSolutions: false })
    expect(shuffledOutcome.details[0]).toContain("a ordem embaralhada")
  })

  it("falha quando uma solução errada aprova, pelo nome dela", () => {
    const outcome = concludeStepVerification(target, starter, grades({ wrong: [{ name: "sem aspas", result: grade(true) }] }), { requireWrongSolutions: true })
    expect(outcome).toMatchObject({ status: "falha", details: ['solução errada APROVADA: "sem aspas" (casos que passaram quando deviam falhar: c1)'] })
  })

  it("passo sem soluções erradas só é problema quando elas são exigidas (conteúdo versionado)", () => {
    const bare = step()
    const bareStarter = resolveStepStarter(bare, null)
    expect(concludeStepVerification(bare, bareStarter, grades(), { requireWrongSolutions: false }).status).toBe("ok")
    expect(concludeStepVerification(bare, bareStarter, grades(), { requireWrongSolutions: true }).details).toEqual([
      "sem soluções erradas: adicione ao menos uma em ### Soluções erradas",
    ])
  })

  it("gabarito com casos legacy é problema mesmo com tudo coerente; sem código inicial não há o que cobrar dele", () => {
    const outcome = concludeStepVerification(target, null, { solution: grade(true, { strength: "legacy" }), starter: null, wrong }, { requireWrongSolutions: true })
    expect(outcome.details).toEqual(["o gabarito tem casos legacy: converta para casos declarativos"])
  })
})
