import { beforeEach, describe, expect, it } from "vitest"
import { draftStepSubmitSchema, draftStepVerifySchema, type DraftStepSubmitInput, type DraftStepVerifyInput, type RunnerJob, type RunnerResult } from "@levelusp/contracts"
import { ServiceUnavailable, type AppError } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import type { CodeRunner } from "@/infra/runner/code-runner"
import { GradingService } from "../grading/grading.service"
import { DraftStepsService } from "./draft-steps.service"

const teacher: AuthUser = { id: "prof-1", email: "prof@usp.br", role: "teacher", fullName: "Professora", sessionId: "s1" }
const EXPECTED = 5
const RIGHT_CODE = "def soma(a, b):\n    return a + b\n"
const WRONG_CODE = "def soma(a, b):\n    return a - b\n"
const main = (content: string): { path: string; content: string } => ({ path: "main.py", content })

const exercise = {
  order: 2,
  kind: "exercicio",
  title: "Escreva soma",
  starter_files: [main("# seu código\n")],
  solution_files: [main(RIGHT_CODE)],
  test_cases: [{ id: "c1", kind: "call", function: "soma", args: [2, 3], expected: EXPECTED, name: "Soma", hint: "Some os dois" }],
}

/** Executor falso: só "acerta" quando o `main.py` recebido soma de verdade; guarda os pedidos na ordem. */
class ScriptedRunner implements CodeRunner {
  jobs: RunnerJob[] = []
  /** Uma entrada por execução, na ordem: um erro faz aquela falhar; null deixa rodar. */
  failures: (Error | null)[] = []
  /** Quando definida, toda execução espera por ela (para manter um pedido em andamento). */
  gate: Promise<void> | null = null

  async run(job: RunnerJob): Promise<RunnerResult> {
    if (this.gate) await this.gate
    const failure = this.failures.shift()
    if (failure) return Promise.reject(failure)
    this.jobs.push(job)
    const isRight = job.files.some((file) => file.content.includes("return a + b"))
    return Promise.resolve({
      observations: job.probes.map((probe) => ({ id: probe.id, ok: true, value: isRight ? EXPECTED : 0 })),
      engine: { python: "fake", runtime: "fake" },
      durationMs: 2,
    })
  }
}

const verifyInput = (step: object = exercise, extra: object = {}): DraftStepVerifyInput => draftStepVerifySchema.parse({ step, ...extra })

describe("DraftStepsService", () => {
  let runner: ScriptedRunner
  let service: DraftStepsService

  beforeEach(() => {
    runner = new ScriptedRunner()
    service = new DraftStepsService(new GradingService(runner), new RateLimitService())
  })

  it("verify: roda referência, inicial e erradas em sequência e devolve um veredito por projeto", async () => {
    const result = await service.verify(teacher, verifyInput({ ...exercise, wrong_solutions: [{ name: "subtrai", files: [main(WRONG_CODE)] }] }))
    expect(result).toEqual({
      order: 2,
      status: "ok",
      solution: { passed: true, as_expected: true, failed_cases: [] },
      starter: { passed: false, as_expected: true, failed_cases: [expect.objectContaining({ id: "c1", passed: false })], inherited_from: null, shuffled_order: false },
      wrong_solutions: [{ name: "subtrai", passed: false, as_expected: true, failed_cases: [expect.objectContaining({ id: "c1" })] }],
      details: [],
    })
    expect(runner.jobs.map((job) => job.files[0]?.content)).toEqual([RIGHT_CODE, "# seu código\n", WRONG_CODE])
    // O valor esperado fica na API: o executor só recebe as entradas.
    expect(JSON.stringify(runner.jobs)).not.toContain("expected")
  })

  it("verify: gabarito incoerente vira falha com o motivo; soluções erradas são opcionais", async () => {
    const approvedStarter = await service.verify(teacher, verifyInput({ ...exercise, starter_files: [main(RIGHT_CODE)] }))
    expect(approvedStarter).toMatchObject({ status: "falha", starter: { passed: true, as_expected: false }, wrong_solutions: [] })
    expect(approvedStarter.details).toEqual(["código inicial APROVADO sem o aluno fazer nada (casos que passaram: c1)"])

    const failedSolution = await service.verify(teacher, verifyInput({ ...exercise, solution_files: [main(WRONG_CODE)] }))
    expect(failedSolution).toMatchObject({ status: "falha", solution: { passed: false, as_expected: false } })
    expect(failedSolution.details[0]).toBe("solução de referência REPROVADA:")
  })

  it("verify: usa o código herdado quando o passo não tem inicial próprio e manda o motor da lição", async () => {
    const input = verifyInput({ ...exercise, starter_files: [] }, { runtime: "python-dados", libraries: ["numpy"], inherited_starter: { order: 1, files: [main("x = 1\n")] } })
    expect(await service.verify(teacher, input)).toMatchObject({ status: "ok", starter: { inherited_from: 1 } })
    expect(runner.jobs.map((job) => job.files[0]?.content)).toEqual([RIGHT_CODE, "x = 1\n"])
    expect(runner.jobs[0]).toMatchObject({ runtime: "python-dados", libraries: ["numpy"] })
  })

  it("submit: corrige os arquivos e devolve o resultado do aluno com a gamificação zerada", async () => {
    const result = await service.submit(teacher, draftStepSubmitSchema.parse({ step: exercise, files: [main(WRONG_CODE)] }))
    expect(result).toEqual({
      step_completed: false, xp_awarded: 0, lesson_completed: false, granted_badges: [], level_up: false, new_level: 0,
      step_id: "rascunho-2", passed: false, attempts: 0, solution_available: true,
      cases: [expect.objectContaining({ id: "c1", passed: false, hint: "Some os dois", checkpoint: null })],
    })
    expect((await service.submit(teacher, draftStepSubmitSchema.parse({ step: exercise, files: [main(RIGHT_CODE)] }))).passed).toBe(true)
  })

  it("submit: recusa formato que não é o do modo e projeto sem main.py, sem rodar nada", async () => {
    const withArrangement = draftStepSubmitSchema.parse({ step: exercise, arrangement: [{ line_id: "l1", indent: 0 }] })
    await expect(service.submit(teacher, withArrangement)).rejects.toMatchObject({ statusCode: 400, code: "WRONG_SUBMISSION_FORMAT" })
    const withoutEntry = draftStepSubmitSchema.parse({ step: exercise, files: [{ path: "util.py", content: RIGHT_CODE }] })
    await expect(service.submit(teacher, withoutEntry)).rejects.toMatchObject({ statusCode: 400 })
    expect(runner.jobs).toHaveLength(0)
  })

  const submitInput = (code = RIGHT_CODE): DraftStepSubmitInput => draftStepSubmitSchema.parse({ step: exercise, files: [main(code)] })
  const busy = (): AppError => ServiceUnavailable("O corretor está ocupado.", "RUNNER_BUSY", 5)
  const { limit } = RATE_LIMITS.draftStepGrading

  it("o limite conta execuções: cada verify consome uma por projeto e o submit, uma", async () => {
    const wrong = ["a", "b", "c"].map((name) => ({ name, files: [main(WRONG_CODE)] }))
    const executionsPerVerify = 5
    for (let used = 0; used < limit; used += executionsPerVerify) await service.verify(teacher, verifyInput({ ...exercise, wrong_solutions: wrong }))
    expect(runner.jobs).toHaveLength(limit)
    await expect(service.submit(teacher, submitInput())).rejects.toMatchObject({ statusCode: 429 })
    await expect(service.verify(teacher, verifyInput())).rejects.toMatchObject({ statusCode: 429 })
    expect(runner.jobs).toHaveLength(limit)
    // O limite é por usuário.
    await expect(service.verify({ ...teacher, id: "prof-2" }, verifyInput())).resolves.toMatchObject({ status: "ok" })
  })

  it("sem cota para o passo inteiro nada roda nem é consumido", async () => {
    for (let used = 0; used < limit - 1; used++) await service.submit(teacher, submitInput())
    await expect(service.verify(teacher, verifyInput())).rejects.toMatchObject({ statusCode: 429 })
    expect(runner.jobs).toHaveLength(limit - 1)
    // A execução que sobrava continua disponível: a reserva parcial foi devolvida.
    await expect(service.submit(teacher, submitInput())).resolves.toMatchObject({ passed: true })
    await expect(service.submit(teacher, submitInput())).rejects.toMatchObject({ statusCode: 429 })
  })

  it("recusa com 409 um segundo pedido do mesmo usuário enquanto o primeiro roda, e libera a trava no fim (mesmo com erro)", async () => {
    let release: () => void = () => undefined
    runner.gate = new Promise((resolve) => {
      release = resolve
    })
    const running = service.verify(teacher, verifyInput())
    await expect(service.submit(teacher, submitInput())).rejects.toMatchObject({ statusCode: 409, code: "DRAFT_GRADING_IN_PROGRESS" })
    await expect(service.verify(teacher, verifyInput())).rejects.toMatchObject({ statusCode: 409 })
    // Outro usuário não é afetado pela trava (fica esperando o executor, como o primeiro).
    const other = service.submit({ ...teacher, id: "prof-2" }, submitInput())
    release()
    await expect(running).resolves.toMatchObject({ status: "ok" })
    await expect(other).resolves.toMatchObject({ passed: true })
    runner.gate = null

    runner.failures = [ServiceUnavailable("O corretor está fora do ar.", "RUNNER_UNAVAILABLE")]
    await expect(service.submit(teacher, submitInput())).rejects.toMatchObject({ statusCode: 503 })
    await expect(service.submit(teacher, submitInput())).resolves.toMatchObject({ passed: true })
  })

  it("executor ocupado na primeira execução: repassa o 503 e devolve a cota inteira", async () => {
    runner.failures = Array.from({ length: limit + 1 }, busy)
    for (let index = 0; index <= limit; index++) await expect(service.verify(teacher, verifyInput())).rejects.toMatchObject({ statusCode: 503, code: "RUNNER_BUSY" })
    for (let used = 0; used < limit; used++) await service.submit(teacher, submitInput())
    await expect(service.submit(teacher, submitInput())).rejects.toMatchObject({ statusCode: 429 })
  })

  it("executor ocupado no meio do passo: só as execuções que não rodaram são devolvidas", async () => {
    // Três execuções reservadas (solução, inicial, errada); a solução roda e o inicial encontra a fila cheia.
    runner.failures = [null, busy()]
    await expect(service.verify(teacher, verifyInput({ ...exercise, wrong_solutions: [{ name: "subtrai", files: [main(WRONG_CODE)] }] }))).rejects.toMatchObject({ code: "RUNNER_BUSY" })
    expect(runner.jobs).toHaveLength(1)
    for (let used = 1; used < limit; used++) await service.submit(teacher, submitInput())
    await expect(service.submit(teacher, submitInput())).rejects.toMatchObject({ statusCode: 429 })
  })

  it("falha do executor que não é fila cheia consome as execuções reservadas", async () => {
    runner.failures = [ServiceUnavailable("O corretor está fora do ar.", "RUNNER_UNAVAILABLE")]
    await expect(service.verify(teacher, verifyInput())).rejects.toMatchObject({ statusCode: 503, code: "RUNNER_UNAVAILABLE" })
    for (let used = 2; used < limit; used++) await service.submit(teacher, submitInput())
    await expect(service.submit(teacher, submitInput())).rejects.toMatchObject({ statusCode: 429 })
  })
})
