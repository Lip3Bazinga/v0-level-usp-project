import { describe, expect, it } from "vitest"
import type { RunnerJob, RunnerResult, TestCase } from "@levelusp/contracts"
import type { AppError } from "@/common/errors/app-error"
import type { CodeRunner } from "@/infra/runner/code-runner"
import { GradingService } from "./grading.service"

const FILES = [{ path: "main.py", content: "def soma(a, b):\n    return a + b\n" }]
const REFERENCE = "def soma(a, b):\n    return a + b  # REFERENCIA-DO-PROFESSOR\n"
const CALL_CASE = { id: "c1", kind: "call", function: "soma", args: [2, 3], expected: 5 } as TestCase
const UNITTEST_CASE = { id: "u1", kind: "unittest", target: "soma", implementation: REFERENCE, expect: "pass" } as TestCase
const LEGACY_CASE = { id: "l1", kind: "legacy", code: "assert soma(2, 3) == 5" } as TestCase

/** Executor falso: guarda os pedidos e responde uma observação ok por sonda. */
class RecordingRunner implements CodeRunner {
  jobs: RunnerJob[] = []

  run(job: RunnerJob): Promise<RunnerResult> {
    this.jobs.push(job)
    return Promise.resolve({ observations: job.probes.map((probe) => ({ id: probe.id, ok: true, value: 5, type: "int" })), engine: { python: "3.14", runtime: "teste" }, durationMs: 1 })
  }
}

async function rejection(action: Promise<unknown>): Promise<AppError> {
  try {
    await action
  } catch (error) {
    return error as AppError
  }
  throw new Error("a correção deveria ter sido recusada")
}

describe("GradingService: lição python-completo não manda sonda estrita ao executor", () => {
  it("recusa caso unittest com 422 e NADA vai ao executor (a referência do professor não sai da API)", async () => {
    const runner = new RecordingRunner()
    const error = await rejection(new GradingService(runner).grade(FILES, [CALL_CASE, UNITTEST_CASE], { runtime: "python-completo", libraries: ["torch"] }))
    expect(error).toMatchObject({ statusCode: 422, code: "UNSUPPORTED_CASES" })
    expect(error.message).toContain("python-completo")
    expect(error.message).not.toContain("REFERENCIA")
    expect(runner.jobs).toEqual([])
  })

  it("recusa caso legado do mesmo jeito", async () => {
    const runner = new RecordingRunner()
    const error = await rejection(new GradingService(runner).grade(FILES, [LEGACY_CASE], { runtime: "python-completo", libraries: ["numpy"] }))
    expect(error).toMatchObject({ statusCode: 422, code: "UNSUPPORTED_CASES" })
    expect(runner.jobs).toEqual([])
  })

  it("aceita os casos não estritos e pede o motor python-completo com as bibliotecas", async () => {
    const runner = new RecordingRunner()
    await new GradingService(runner).grade(FILES, [CALL_CASE], { runtime: "python-completo", libraries: ["torch"] })
    expect(runner.jobs).toHaveLength(1)
    expect(runner.jobs[0]).toMatchObject({ runtime: "python-completo", libraries: ["torch"] })
    expect(JSON.stringify(runner.jobs[0])).not.toContain('"expected"')
  })

  it("os outros motores continuam aceitando unittest e legado", async () => {
    for (const runtime of [undefined, "python", "python-dados"] as const) {
      const runner = new RecordingRunner()
      await new GradingService(runner).grade(FILES, [UNITTEST_CASE, LEGACY_CASE], runtime === undefined ? {} : { runtime, libraries: runtime === "python-dados" ? ["numpy"] : [] })
      expect(runner.jobs, String(runtime)).toHaveLength(1)
    }
  })
})
