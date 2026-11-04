import type { AddressInfo } from "node:net"
import { describe, expect, it } from "vitest"
import type { Probe, ProbeObservation, RunnerJob } from "@levelusp/contracts"
import { Executor, type BatchRunner } from "../src/executor"
import { QueueFullError, Semaphore } from "../src/semaphore"
import { buildServer } from "../src/server"
import type { SandboxBatch } from "../src/sandbox"
import { RunnerStats } from "../src/stats"

const sleep = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Sandbox falso: cada lote demora `delayMs` e devolve ok para cada sonda; registra o que rodou. */
function fakeSandbox(delayMs: number): BatchRunner & { ran: string[][] } {
  const ran: string[][] = []
  return {
    ran,
    async runBatch(batch: SandboxBatch): Promise<ProbeObservation[]> {
      ran.push(batch.probes.map((probe) => probe.id))
      await sleep(delayMs)
      return batch.probes.map((probe) => ({ id: probe.id, ok: true }))
    },
  }
}

const astProbe = (id: string): Probe => ({ id, kind: "ast" })
const callProbe = (id: string): Probe => ({ id, kind: "call", function: "f", args: [], kwargs: {} })
const unittestProbe = (id: string): Probe => ({ id, kind: "unittest" })
const job = (probes: Probe[]): RunnerJob => ({ files: [{ path: "main.py", content: "x = 1\n" }], entry: "main.py", probes, limits: { timeoutMs: 2_000, memoryMb: 64 } })

describe("Executor: admissão na fila", () => {
  it("recusa o job inteiro quando nem todos os lotes cabem (nenhum lote dele roda)", async () => {
    const sandbox = fakeSandbox(30)
    const executor = new Executor(sandbox, new Semaphore(1, 2))
    const first = executor.execute(job([callProbe("a1")]))
    const second = executor.execute(job([callProbe("b1")]))
    // 3 lotes (execução + 2 unittest) para 1 lugar livre na fila: recusado sem enfileirar nada.
    await expect(executor.execute(job([callProbe("c1"), unittestProbe("c2"), unittestProbe("c3")]))).rejects.toBeInstanceOf(QueueFullError)
    await Promise.all([first, second])
    expect(sandbox.ran.flat()).not.toContain("c1")
    expect(sandbox.ran.flat()).not.toContain("c2")
  })

  it("aceita uma turma inteira de lotes rápidos (a fila é limitada pelo tempo estimado)", async () => {
    const sandbox = fakeSandbox(5)
    const executor = new Executor(sandbox, new Semaphore(2, 500), { maxQueueWaitMs: 20_000 })
    for (let index = 0; index < 5; index++) await executor.execute(job([callProbe(`aquece${index}`)]))
    const results = await Promise.all(Array.from({ length: 120 }, (_unused, index) => executor.execute(job([callProbe(`p${index}`), astProbe(`s${index}`)]))))
    expect(results).toHaveLength(120)
    expect(executor.estimatedBatchMs).toBeLessThan(100)
  })

  it("recusa com espera sugerida quando os lotes medidos são lentos", async () => {
    const sandbox = fakeSandbox(60)
    const executor = new Executor(sandbox, new Semaphore(1, 500), { maxQueueWaitMs: 1_000 })
    // Calibra a estimativa com lotes lentos.
    for (let index = 0; index < 8; index++) await executor.execute(job([callProbe(`aquece${index}`)]))
    expect(executor.estimatedBatchMs).toBeGreaterThan(50)
    const outcomes = await Promise.allSettled(Array.from({ length: 30 }, (_unused, index) => executor.execute(job([callProbe(`q${index}`)]))))
    const rejected = outcomes.flatMap((outcome) => (outcome.status === "rejected" ? [outcome.reason as unknown] : []))
    const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled").length
    // Com ~60–100 ms por lote, cabem cerca de 10–17 lotes em 1 s de espera; o resto é recusado.
    expect(fulfilled).toBeGreaterThanOrEqual(8)
    expect(fulfilled).toBeLessThan(25)
    expect(rejected.every((reason) => reason instanceof QueueFullError && (reason.retryAfterSeconds ?? 0) >= 2)).toBe(true)
  })

  it("junta todas as regras de estrutura (ast) numa instância e registra fila × execução", async () => {
    const sandbox = fakeSandbox(10)
    const semaphore = new Semaphore(1, 10)
    const stats = new RunnerStats(semaphore)
    const executor = new Executor(sandbox, semaphore, { stats })
    const result = await executor.execute(job([callProbe("a"), astProbe("s1"), astProbe("s2"), astProbe("s3")]))
    expect(sandbox.ran).toEqual([["a"], ["s1", "s2", "s3"]])
    expect(result.observations.map((observation) => observation.id)).toEqual(["a", "s1", "s2", "s3"])
    const snapshot = stats.snapshot()
    expect(snapshot.jobs.completed).toBe(1)
    expect(snapshot.recent[0]).toMatchObject({ batches: 2 })
    expect(snapshot.recent[0]?.execMs).toBeGreaterThanOrEqual(15)
  })
})

describe("servidor: /v1/stats e 503 com Retry-After", () => {
  it("exige o token nas estatísticas e devolve Retry-After quando a fila recusa", async () => {
    const token = "s".repeat(32)
    const semaphore = new Semaphore(1, 1)
    const stats = new RunnerStats(semaphore)
    const executor = new Executor(fakeSandbox(200), semaphore, { stats })
    const server = buildServer({ executor, token, log: () => undefined, stats })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    try {
      expect((await fetch(`${base}/v1/stats`)).status).toBe(401)
      const post = (): Promise<Response> =>
        fetch(`${base}/v1/run`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(job([callProbe("a")])) })
      const responses = await Promise.all([post(), post(), post()])
      const busy = responses.find((response) => response.status === 503)
      expect(busy?.headers.get("retry-after")).toMatch(/^\d+$/)
      expect(await busy?.json()).toMatchObject({ error: "busy" })
      await Promise.all(responses.map((response) => response.text().catch(() => "")))
      const snapshot = (await (await fetch(`${base}/v1/stats`, { headers: { authorization: `Bearer ${token}` } })).json()) as { jobs: { completed: number; rejected: number } }
      expect(snapshot.jobs).toMatchObject({ completed: 2, rejected: 1 })
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
