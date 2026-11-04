import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import type { SubmissionResult, TestCase } from "@levelusp/contracts"
import { bodyOf, countRows, createLesson, createTestApp, signUp, type TestContext } from "./harness"

const files = [{ path: "main.py", content: "def f():\n    return 'x'\n" }]
const cases: TestCase[] = [
  { id: "c", kind: "call", function: "f", args: [], kwargs: {}, expected: "ok" },
  { id: "s", kind: "io", stdin: "", expected_stdout: "fim", match: "trimmed", reveal: true },
]

/** Robustez da correção na API com banco real: o que o aluno controla não derruba a gravação. */
describe("Correção: dados hostis do aluno (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  it("\\u0000 em valor, saída e exceção não vira 500 (o jsonb recusaria)", async () => {
    const lesson = await createLesson(ctx.db, { testCases: cases })
    const { agent } = await signUp(ctx.app)
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: "a\u0000b", type: "str", stdout: "\u0000\u0000" })))
    const response = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(response.status).toBe(200)
    const result = bodyOf<SubmissionResult>(response)
    expect(result.allPassed).toBe(false)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from submissions where passed = false`)).toBe(1)
  })

  it("saída hostil de 64 000 espaços não trava a correção", async () => {
    const lesson = await createLesson(ctx.db, { testCases: Array.from({ length: 20 }, (_, index): TestCase => ({ id: `s${index}`, kind: "io", stdin: "", expected_stdout: "fim", match: "trimmed" })) })
    const { agent } = await signUp(ctx.app)
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, stdout: `${" ".repeat(63_999)}x` })))
    const startedAt = performance.now()
    const response = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(response.status).toBe(200)
    expect(performance.now() - startedAt).toBeLessThan(3_000)
  })

  it("observações com chaves __proto__/constructor não casam com o gabarito", async () => {
    const lesson = await createLesson(ctx.db, { testCases: [{ id: "d", kind: "call", function: "f", args: [], kwargs: {}, expected: { a: 1 } }] })
    const { agent } = await signUp(ctx.app)
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: JSON.parse('{"__proto__": {"a": 1}}') as { a: number }, type: "dict" })))
    const response = await agent.post(`/api/lessons/${lesson.id}/submissions`, { files })
    expect(bodyOf<SubmissionResult>(response).allPassed).toBe(false)
  })
})
