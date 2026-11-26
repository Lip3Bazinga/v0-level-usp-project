import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import type { ApiErrorBody, DraftStepVerifyResult, ProbeObservation, RunnerJob, StepSubmitResult, TestCase } from "@levelusp/contracts"
import { ServiceUnavailable } from "@/common/errors/app-error"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { agent, bodyOf, countRows, createTestApp, signUp, type TestContext } from "./harness"

const VERIFY_URL = "/api/teacher/draft-steps/verify"
const SUBMIT_URL = "/api/teacher/draft-steps/submit"

/** Só aparece no gabarito do caso: não pode chegar ao executor. */
const SECRET_EXPECTED = 4242

const main = (content: string): { path: string; content: string } => ({ path: "main.py", content })
const RIGHT_CODE = "def soma(a, b):\n    return a + b\n"
const WRONG_CODE = "def soma(a, b):\n    return a - b\n"
const cases: TestCase[] = [{ id: "c1", kind: "call", function: "soma", args: [4000, 242], kwargs: {}, expected: SECRET_EXPECTED, name: "Soma", hint: "Some os dois", checkpoint: 1 }]

const exerciseStep = {
  order: 1,
  kind: "exercicio",
  title: "Escreva soma",
  starter_files: [main("# seu código\n")],
  solution_files: [main(RIGHT_CODE)],
  checkpoints: [{ id: 1, instruction: "Defina soma(a, b)." }],
  test_cases: cases,
}

const parsonsStep = {
  ...exerciseStep,
  exercise_mode: "ordenar",
  starter_files: [],
  parsons_lines: [{ id: "l1", text: "return a + b" }, { id: "l2", text: "def soma(a, b):" }],
}

/** O "sandbox" falso só acerta quando o projeto recebido soma de verdade. */
function respondByCode(job: RunnerJob): ProbeObservation[] {
  const isRight = job.files.some((file) => file.content.replace(/\s+/g, " ").includes("def soma(a, b): return a + b"))
  return job.probes.map((probe) => ({ id: probe.id, ok: true, value: isRight ? SECRET_EXPECTED : 0 }))
}

describe("Teste de gabarito do rascunho (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(async () => {
    await ctx.reset()
    ctx.runner.respond(respondByCode)
  })

  it("exige sessão e papel de professor ou admin nas duas rotas", async () => {
    const anonymous = agent(ctx.app)
    const student = await signUp(ctx.app)
    for (const url of [VERIFY_URL, SUBMIT_URL]) {
      expect((await anonymous.post(url, { step: exerciseStep, files: [main(RIGHT_CODE)] })).status).toBe(401)
      expect((await student.agent.post(url, { step: exerciseStep, files: [main(RIGHT_CODE)] })).status).toBe(403)
    }
    expect(ctx.runner.jobs).toHaveLength(0)
  })

  it("professor recebe o veredito da referência, do código inicial e de cada solução errada", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const response = await teacher.agent.post(VERIFY_URL, {
      step: { ...exerciseStep, wrong_solutions: [{ name: "subtrai", files: [main(WRONG_CODE)] }] },
    })
    expect(response.status).toBe(200)
    const body = bodyOf<DraftStepVerifyResult>(response)
    expect(body).toMatchObject({ order: 1, status: "ok", details: [] })
    expect(body.solution).toEqual({ passed: true, as_expected: true, failed_cases: [] })
    expect(body.starter).toMatchObject({ passed: false, as_expected: true, inherited_from: null, shuffled_order: false })
    expect(body.starter?.failed_cases.map((item) => item.id)).toEqual(["c1"])
    expect(body.wrong_solutions).toHaveLength(1)
    expect(body.wrong_solutions[0]).toMatchObject({ name: "subtrai", passed: false, as_expected: true })

    // Um projeto por vez, na ordem referência → inicial → erradas, e o esperado nunca vai ao executor.
    expect(ctx.runner.jobs.map((job) => job.files[0]?.content)).toEqual([RIGHT_CODE, "# seu código\n", WRONG_CODE])
    expect(JSON.stringify(ctx.runner.jobs)).not.toContain(String(SECRET_EXPECTED))
  })

  it("aponta o gabarito incoerente: código inicial que já aprova e solução errada que aprova", async () => {
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const response = await admin.agent.post(VERIFY_URL, {
      step: { ...exerciseStep, starter_files: [main(RIGHT_CODE)], wrong_solutions: [{ name: "igual à certa", files: [main(`${RIGHT_CODE}# fim\n`)] }] },
    })
    const body = bodyOf<DraftStepVerifyResult>(response)
    expect(body.status).toBe("falha")
    expect(body.starter).toMatchObject({ passed: true, as_expected: false })
    expect(body.wrong_solutions[0]).toMatchObject({ passed: true, as_expected: false })
    expect(body.details).toEqual([
      "código inicial APROVADO sem o aluno fazer nada (casos que passaram: c1)",
      'solução errada APROVADA: "igual à certa" (casos que passaram quando deviam falhar: c1)',
    ])
  })

  it("solução de referência reprovada vira falha com os casos que falharam", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const response = await teacher.agent.post(VERIFY_URL, { step: { ...exerciseStep, solution_files: [main(WRONG_CODE)] } })
    const body = bodyOf<DraftStepVerifyResult>(response)
    expect(body.status).toBe("falha")
    expect(body.solution).toMatchObject({ passed: false, as_expected: false })
    expect(body.solution?.failed_cases.map((item) => item.id)).toEqual(["c1"])
    expect(body.details[0]).toBe("solução de referência REPROVADA:")
  })

  it("sem código inicial próprio, testa o herdado; no modo ordenar, a solução montada e a ordem embaralhada", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const inherited = await teacher.agent.post(VERIFY_URL, {
      step: { ...exerciseStep, order: 2, starter_files: [] },
      inherited_starter: { order: 1, files: [main("x = 1\n")] },
    })
    expect(bodyOf<DraftStepVerifyResult>(inherited)).toMatchObject({ status: "ok", starter: { inherited_from: 1, passed: false } })

    ctx.runner.jobs = []
    const parsons = await teacher.agent.post(VERIFY_URL, { step: parsonsStep })
    expect(bodyOf<DraftStepVerifyResult>(parsons)).toMatchObject({ status: "ok", starter: { shuffled_order: true, passed: false } })
    expect(ctx.runner.jobs.map((job) => job.files[0]?.content)).toEqual([RIGHT_CODE, "return a + b\ndef soma(a, b):\n"])
  })

  it("recusa corpo inválido: passo que não é exercício, sem casos ou com soluções erradas demais", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const tooManyWrong = Array.from({ length: 6 }, (_item, index) => ({ name: `errada ${index + 1}`, files: [main(WRONG_CODE)] }))
    const bodies = [
      { step: { order: 1, kind: "leitura", title: "Texto" } },
      { step: { ...exerciseStep, test_cases: [] } },
      { step: { ...exerciseStep, wrong_solutions: tooManyWrong } },
      { step: exerciseStep, runtime: "node" },
    ]
    for (const body of bodies) expect((await teacher.agent.post(VERIFY_URL, body)).status).toBe(400)
    expect(ctx.runner.jobs).toHaveLength(0)
  })

  it("Verificar da prévia: corrige arquivos ou arranjo e devolve o resultado do aluno sem efeito na gamificação", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const right = bodyOf<StepSubmitResult>(await teacher.agent.post(SUBMIT_URL, { step: exerciseStep, files: [main(RIGHT_CODE)] }))
    expect(right).toMatchObject({ passed: true, step_completed: false, xp_awarded: 0, lesson_completed: false, granted_badges: [], attempts: 0 })
    expect(right.cases).toEqual([{ id: "c1", name: "Soma", passed: true, message: null, hint: null, checkpoint: 1 }])

    const wrong = bodyOf<StepSubmitResult>(await teacher.agent.post(SUBMIT_URL, { step: exerciseStep, files: [main(WRONG_CODE)] }))
    expect(wrong).toMatchObject({ passed: false, xp_awarded: 0 })
    expect(wrong.cases[0]).toMatchObject({ passed: false, hint: "Some os dois" })

    const arrangement = [{ line_id: "l2", indent: 0 }, { line_id: "l1", indent: 1 }]
    expect(bodyOf<StepSubmitResult>(await teacher.agent.post(SUBMIT_URL, { step: parsonsStep, arrangement }))).toMatchObject({ passed: true })

    const wrongFormat = await teacher.agent.post(SUBMIT_URL, { step: parsonsStep, files: [main(RIGHT_CODE)] })
    expect(wrongFormat.status).toBe(400)
    expect(bodyOf<ApiErrorBody>(wrongFormat).code).toBe("WRONG_SUBMISSION_FORMAT")
    const unknownLine = await teacher.agent.post(SUBMIT_URL, { step: parsonsStep, arrangement: [{ line_id: "zz", indent: 0 }] })
    expect(bodyOf<ApiErrorBody>(unknownLine).code).toBe("INVALID_ARRANGEMENT")
    const noEntry = await teacher.agent.post(SUBMIT_URL, { step: exerciseStep, files: [{ path: "util.py", content: RIGHT_CODE }] })
    expect(noEntry.status).toBe(400)
  })

  it("nada é gravado: sem submissão, progresso nem XP", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    await teacher.agent.post(VERIFY_URL, { step: { ...exerciseStep, wrong_solutions: [{ name: "subtrai", files: [main(WRONG_CODE)] }] } })
    await teacher.agent.post(SUBMIT_URL, { step: exerciseStep, files: [main(RIGHT_CODE)] })
    await teacher.agent.post(SUBMIT_URL, { step: exerciseStep, files: [main(WRONG_CODE)] })

    for (const table of ["submissions", "lesson_progress", "lesson_step_progress", "lessons", "lesson_steps"]) {
      expect(await countRows(ctx.db, sql`select count(*)::int as n from ${sql.identifier(table)}`), table).toBe(0)
    }
    expect(await countRows(ctx.db, sql`select count(*)::int as n from profiles where id = ${teacher.id} and total_xp = 0`)).toBe(1)
  })

  it("o limite por usuário vale para as duas operações somadas e devolve 429", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const { limit } = RATE_LIMITS.draftStepGrading
    const statuses: number[] = []
    for (let index = 0; index < limit; index++) {
      const isVerify = index % 2 === 0
      statuses.push((await teacher.agent.post(isVerify ? VERIFY_URL : SUBMIT_URL, { step: exerciseStep, files: [main(RIGHT_CODE)] })).status)
    }
    expect(statuses.every((status) => status === 200)).toBe(true)
    const jobsBefore = ctx.runner.jobs.length
    expect((await teacher.agent.post(VERIFY_URL, { step: exerciseStep })).status).toBe(429)
    expect((await teacher.agent.post(SUBMIT_URL, { step: exerciseStep, files: [main(RIGHT_CODE)] })).status).toBe(429)
    expect(ctx.runner.jobs).toHaveLength(jobsBefore)

    // O limite é por usuário: outro professor continua testando.
    const other = await signUp(ctx.app, "teacher", ctx.db)
    expect((await other.agent.post(VERIFY_URL, { step: exerciseStep })).status).toBe(200)
  })

  it("executor ocupado: 503 sem detalhe interno, e o pedido não conta no limite", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const { limit } = RATE_LIMITS.draftStepGrading
    ctx.runner.failNext(ServiceUnavailable("O corretor está ocupado. Tente de novo em 5 s.", "RUNNER_BUSY", 5), limit)
    for (let index = 0; index < limit; index++) {
      const busy = await teacher.agent.post(VERIFY_URL, { step: exerciseStep })
      expect(busy.status).toBe(503)
      expect(Object.keys(bodyOf<ApiErrorBody>(busy))).not.toContain("stack")
    }
    expect((await teacher.agent.post(VERIFY_URL, { step: exerciseStep })).status).toBe(200)
  })
})
