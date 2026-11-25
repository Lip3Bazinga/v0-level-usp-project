import type { AddressInfo } from "node:net"
import { describe, expect, it } from "vitest"
import type { Probe, ProbeObservation, RunnerJob } from "@levelusp/contracts"
import { InsufficientMemoryError, type Engine, type EngineBatch, type EngineLease } from "../src/engine"
import { Executor } from "../src/executor"
import { MemoryBudget } from "../src/memory-budget"
import { QueueFullError, Semaphore } from "../src/semaphore"
import { buildServer } from "../src/server"
import { RunnerStats } from "../src/stats"

const sleep = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Motor falso: cada lote demora `delayMs` e devolve ok para cada sonda; registra o que rodou. */
function fakeSandbox(delayMs: number): Engine & { ran: string[][] } {
  const ran: string[][] = []
  return {
    ran,
    name: "wasi",
    versions: { python: "falso", runtime: "falso" },
    readiness: { ready: true, reason: "" },
    accept: () => undefined,
    cost: () => ({ key: "wasi", memoryMb: 0 }),
    warmupMs: () => 0,
    stats: () => ({ batches: ran.length }),
    async run(batch: EngineBatch): Promise<ProbeObservation[]> {
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
    const executor = new Executor({ python: sandbox }, new Semaphore(1, 2))
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
    const executor = new Executor({ python: sandbox }, new Semaphore(2, 500), { maxQueueWaitMs: 20_000 })
    for (let index = 0; index < 5; index++) await executor.execute(job([callProbe(`aquece${index}`)]))
    const results = await Promise.all(Array.from({ length: 120 }, (_unused, index) => executor.execute(job([callProbe(`p${index}`), astProbe(`s${index}`)]))))
    expect(results).toHaveLength(120)
    expect(executor.estimatedBatchMs).toBeLessThan(100)
  })

  it("recusa com espera sugerida quando os lotes medidos são lentos", async () => {
    const sandbox = fakeSandbox(60)
    const executor = new Executor({ python: sandbox }, new Semaphore(1, 500), { maxQueueWaitMs: 1_000 })
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
    const executor = new Executor({ python: sandbox }, semaphore, { stats })
    const result = await executor.execute(job([callProbe("a"), astProbe("s1"), astProbe("s2"), astProbe("s3")]))
    expect(sandbox.ran).toEqual([["a"], ["s1", "s2", "s3"]])
    expect(result.observations.map((observation) => observation.id)).toEqual(["a", "s1", "s2", "s3"])
    const snapshot = stats.snapshot()
    expect(snapshot.jobs.completed).toBe(1)
    expect(snapshot.recent[0]).toMatchObject({ batches: 2 })
    expect(snapshot.recent[0]?.execMs).toBeGreaterThanOrEqual(15)
  })
})

/** "Máquina" simulada: soma a memória dos lotes em execução e marca OOM quando passa do limite. */
interface FakeMachine {
  limitMb: number
  usedMb: number
  peakMb: number
  oom: boolean
}

const ML_MEMORY_MB = 1229
const machine = (limitMb = 4096): FakeMachine => ({ limitMb, usedMb: 0, peakMb: 0, oom: false })
const mlJob = (probes: Probe[]): RunnerJob => ({ ...job(probes), runtime: "python-dados", libraries: ["scikit-learn"] })

interface FakeMlOptions {
  delayMs: number
  memoryMb?: number
  /** Duração inicial informada pelo motor (ex.: o aquecimento de um worker `ml` a frio). */
  initialBatchMs?: number
  /** Aquecimento informado em `warmupMs` (motor que não informa a duração inicial). */
  warmupMs?: number
  /** Com orçamento: o motor reserva por conta própria (`reserve`), como o Pyodide. */
  budget?: MemoryBudget
  events?: string[]
}

/**
 * Motor falso do perfil `ml`: cada lote ocupa `memoryMb` da máquina enquanto roda. Sem
 * `budget`, não tem `reserve` (o executor reserva o peso direto no orçamento); com `budget`,
 * reserva e libera sozinho e exige que `run` receba a reserva.
 */
function fakeMlEngine(host: FakeMachine, { delayMs, memoryMb = ML_MEMORY_MB, initialBatchMs, warmupMs = 0, budget, events }: FakeMlOptions): Engine & { ran: string[]; leases: number } {
  const key = "pyodide:ml"
  const engine: Engine & { ran: string[]; leases: number } = {
    ran: [],
    leases: 0,
    name: "pyodide",
    versions: { python: "falso", runtime: "falso" },
    readiness: { ready: true, reason: "" },
    accept: () => undefined,
    cost: () => (initialBatchMs === undefined ? { key, memoryMb } : { key, memoryMb, initialBatchMs }),
    warmupMs: () => warmupMs,
    stats: () => ({ batches: engine.ran.length }),
    async run(batch: EngineBatch, lease?: EngineLease): Promise<ProbeObservation[]> {
      if (budget && lease === undefined) throw new Error("lote sem reserva")
      if (lease) engine.leases++
      host.usedMb += memoryMb
      host.peakMb = Math.max(host.peakMb, host.usedMb)
      if (host.usedMb > host.limitMb) host.oom = true
      events?.push(`inicio:${batch.probes[0]?.id ?? ""}`)
      await sleep(delayMs)
      host.usedMb -= memoryMb
      engine.ran.push(...batch.probes.map((probe) => probe.id))
      events?.push(`fim:${batch.probes[0]?.id ?? ""}`)
      budget?.release(memoryMb)
      return batch.probes.map((probe) => ({ id: probe.id, ok: true }))
    },
  }
  if (budget) engine.reserve = (): EngineLease | undefined => (budget.tryReserve(memoryMb) ? { key, memoryMb } : undefined)
  return engine
}

const rejections = (outcomes: PromiseSettledResult<unknown>[]): unknown[] => outcomes.flatMap((outcome) => (outcome.status === "rejected" ? [outcome.reason as unknown] : []))

describe("Executor: orçamento de memória", () => {
  it("sem orçamento (comportamento antigo), 8 lotes ml simultâneos com CONCURRENCY 8 estouram a máquina de 4 GiB", async () => {
    const host = machine()
    const executor = new Executor({ python: fakeSandbox(1), "python-dados": fakeMlEngine(host, { delayMs: 20 }) }, new Semaphore(8, 200))
    await Promise.all(Array.from({ length: 8 }, (_unused, index) => executor.execute(mlJob([callProbe(`m${index}`)]))))
    expect(host.peakMb).toBe(8 * ML_MEMORY_MB)
    expect(host.oom).toBe(true)
  })

  it("com orçamento, os mesmos 8 lotes esperam memória: pico dentro do limite e todos terminam", async () => {
    const host = machine()
    const budget = new MemoryBudget(host.limitMb - 512)
    const semaphore = new Semaphore(8, 200, budget)
    const stats = new RunnerStats(semaphore, [], budget)
    const executor = new Executor({ python: fakeSandbox(1), "python-dados": fakeMlEngine(host, { delayMs: 20 }) }, semaphore, { budget, stats })
    const pending = Array.from({ length: 8 }, (_unused, index) => executor.execute(mlJob([callProbe(`m${index}`)])))
    expect(semaphore.active).toBe(2)
    expect(stats.snapshot().memory).toEqual({ limitMb: 3584, usedMb: 2 * ML_MEMORY_MB, peakUsedMb: 2 * ML_MEMORY_MB, blocked: 6 })
    const results = await Promise.all(pending)
    expect(results).toHaveLength(8)
    expect(host.oom).toBe(false)
    expect(host.peakMb).toBe(2 * ML_MEMORY_MB)
    expect(budget.peakUsedMb).toBeLessThanOrEqual(budget.limitMb)
    expect(stats.snapshot().memory).toMatchObject({ usedMb: 0, blocked: 0 })
  })

  it("motor com `reserve`: cada lote roda com a reserva feita pelo motor e o pico respeita o orçamento", async () => {
    const host = machine()
    const budget = new MemoryBudget(host.limitMb - 512)
    const engine = fakeMlEngine(host, { delayMs: 10, budget })
    const executor = new Executor({ python: fakeSandbox(1), "python-dados": engine }, new Semaphore(8, 200, budget), { budget })
    await Promise.all(Array.from({ length: 8 }, (_unused, index) => executor.execute(mlJob([callProbe(`m${index}`)]))))
    expect(engine.leases).toBe(8)
    expect(host.oom).toBe(false)
    expect(host.peakMb).toBe(2 * ML_MEMORY_MB)
    expect(budget.usedMb).toBe(0)
  })

  it("sobrecarga: quem não cabe no tempo recebe QueueFullError com Retry-After (na admissão ou pelo prazo na fila), nunca OOM", async () => {
    const host = machine()
    const budget = new MemoryBudget(host.limitMb - 512)
    const semaphore = new Semaphore(8, 200, budget)
    // A estimativa inicial (150 ms) é menor que a duração real (400 ms): a admissão aceita
    // mais do que cabe em 1 s e o prazo na fila recusa o excedente.
    const executor = new Executor({ python: fakeSandbox(1), "python-dados": fakeMlEngine(host, { delayMs: 400 }) }, semaphore, { budget, maxQueueWaitMs: 1_000 })
    const outcomes = await Promise.allSettled(Array.from({ length: 30 }, (_unused, index) => executor.execute(mlJob([callProbe(`m${index}`)]))))
    const rejected = rejections(outcomes)
    const fulfilled = outcomes.length - rejected.length
    expect(host.oom).toBe(false)
    expect(host.peakMb).toBeLessThanOrEqual(host.limitMb)
    expect(fulfilled).toBeGreaterThanOrEqual(2)
    expect(fulfilled).toBeLessThanOrEqual(8)
    expect(rejected.length).toBeGreaterThanOrEqual(22)
    expect(rejected.every((reason) => reason instanceof QueueFullError && (reason.retryAfterSeconds ?? 0) >= 2)).toBe(true)
    expect(semaphore.pending).toBe(0)
    expect(budget.usedMb).toBe(0)
    expect(budget.blocked).toBe(0)
  })

  it("rajada ml a frio: a duração inicial vem do motor (aquecimento de 18 s) e o excedente recebe 503 já na admissão", async () => {
    const host = machine()
    const budget = new MemoryBudget(host.limitMb - 512)
    const semaphore = new Semaphore(8, 200, budget)
    const engine = fakeMlEngine(host, { delayMs: 300, initialBatchMs: 19_000 })
    const executor = new Executor({ python: fakeSandbox(1), "python-dados": engine }, semaphore, { budget })
    expect(executor.estimatedBatchMsOf("pyodide:ml")).toBe(150)
    const settled: (string | number)[] = []
    const pending = Array.from({ length: 40 }, (_unused, index) =>
      executor.execute(mlJob([callProbe(`m${index}`)])).then(
        () => settled.push("ok"),
        (reason: unknown) => settled.push(reason instanceof QueueFullError ? (reason.retryAfterSeconds ?? 0) : "outro erro"),
      ),
    )
    // Só os 2 que cabem na memória entraram: ninguém ficou na fila segurando a conexão.
    expect(semaphore.active).toBe(2)
    expect(semaphore.pending).toBe(0)
    expect(executor.estimatedBatchMsOf("pyodide:ml")).toBe(19_000)
    // As 38 recusas saem na hora (um turno do laço de eventos), antes de qualquer lote terminar.
    await new Promise((resolve) => setImmediate(resolve))
    expect(engine.ran).toEqual([])
    expect(settled).toHaveLength(38)
    // 3 lotes para 2 vagas de memória × 19 s = 28,5 s de espera estimada.
    expect(settled.every((retryAfterSeconds) => typeof retryAfterSeconds === "number" && retryAfterSeconds >= 20)).toBe(true)
    await Promise.all(pending)
    expect(settled.filter((outcome) => outcome === "ok")).toHaveLength(2)
    expect(host.oom).toBe(false)
    // A primeira medição substitui o palpite inicial.
    expect(executor.estimatedBatchMsOf("pyodide:ml")).toBeLessThan(2_000)
  })

  it("o aquecimento só é somado enquanto a duração da classe não o inclui (sem medição e sem duração inicial do motor)", async () => {
    const host = machine()
    const budget = new MemoryBudget(host.limitMb - 512)
    const cost = { key: "pyodide:ml", memoryMb: ML_MEMORY_MB }
    const executor = new Executor({ python: fakeSandbox(1), "python-dados": fakeMlEngine(host, { delayMs: 20, warmupMs: 5_000 }) }, new Semaphore(8, 200, budget), { budget })
    // Sem medição: palpite padrão (150 ms) + aquecimento.
    expect(executor.estimateWaitMs([cost], 5_000)).toBe(150 / 2 + 5_000)
    await executor.execute(mlJob([callProbe("m")]))
    // Com medição, a duração do lote já contou o aquecimento que ele pagou.
    const measured = executor.estimatedBatchMsOf("pyodide:ml")
    expect(measured).toBeLessThan(1_000)
    expect(executor.estimateWaitMs([cost], 5_000)).toBe(measured / 2)
    // Motor que informa a duração inicial (já com o aquecimento): nunca soma de novo.
    const informed = new Executor({ python: fakeSandbox(1), "python-dados": fakeMlEngine(host, { delayMs: 20, initialBatchMs: 19_000, warmupMs: 18_000 }) }, new Semaphore(8, 200, budget), { budget })
    expect(informed.estimateWaitMs([{ ...cost, initialBatchMs: 19_000 }], 18_000)).toBe(19_000 / 2)
  })

  it("a média de duração é por classe de custo: o WASI rápido não esconde o ml lento", async () => {
    const host = machine()
    const budget = new MemoryBudget(host.limitMb - 512)
    const executor = new Executor({ python: fakeSandbox(2), "python-dados": fakeMlEngine(host, { delayMs: 80 }) }, new Semaphore(2, 200, budget), { budget, maxQueueWaitMs: 1_000 })
    for (let index = 0; index < 12; index++) {
      await executor.execute(job([callProbe(`w${index}`)]))
      await executor.execute(mlJob([callProbe(`m${index}`)]))
    }
    expect(executor.estimatedBatchMs).toBeLessThan(60)
    expect(executor.estimatedBatchMsOf("wasi")).toBe(executor.estimatedBatchMs)
    expect(executor.estimatedBatchMsOf("pyodide:ml")).toBeGreaterThan(70)
    // 2 vagas de memória e ~80 ms por lote: 40 lotes ml levariam ~1,6 s (> 1 s); 40 lotes WASI, ~0,1 s.
    const mlCosts = Array.from({ length: 40 }, () => ({ key: "pyodide:ml", memoryMb: ML_MEMORY_MB }))
    const wasiCosts = Array.from({ length: 40 }, () => ({ key: "wasi", memoryMb: 0 }))
    expect(executor.estimateWaitMs(mlCosts)).toBeGreaterThan(1_000)
    expect(executor.estimateWaitMs(wasiCosts)).toBeLessThan(1_000)
  })

  it("lote sem custo (análise ast no WASI) passa à frente de um lote bloqueado por memória", async () => {
    const host = machine()
    const budget = new MemoryBudget(ML_MEMORY_MB)
    const events: string[] = []
    const wasi = fakeSandbox(1)
    const executor = new Executor({ python: wasi, "python-dados": fakeMlEngine(host, { delayMs: 60, events }) }, new Semaphore(4, 200, budget), { budget })
    const first = executor.execute(mlJob([callProbe("primeiro")]))
    const second = executor.execute(mlJob([callProbe("segundo"), astProbe("estrutura")]))
    // Sem esperar nada (os lotes entram na fila de forma síncrona): o ast do segundo job já
    // começou no WASI; o lote ml dele ainda espera a memória do primeiro.
    expect(wasi.ran).toEqual([["estrutura"]])
    expect(events).toEqual(["inicio:primeiro"])
    await Promise.all([first, second])
    expect(events).toEqual(["inicio:primeiro", "fim:primeiro", "inicio:segundo", "fim:segundo"])
    expect(host.peakMb).toBe(ML_MEMORY_MB)
  })

  it("perfil que pesa mais que o orçamento inteiro é recusado na hora com erro claro (nunca fica na fila)", async () => {
    const host = machine()
    const budget = new MemoryBudget(1000)
    const engine = fakeMlEngine(host, { delayMs: 1 })
    const semaphore = new Semaphore(2, 10, budget)
    const executor = new Executor({ python: fakeSandbox(1), "python-dados": engine }, semaphore, { budget })
    const error: unknown = await executor.execute(mlJob([callProbe("m")])).catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(InsufficientMemoryError)
    expect((error as Error).message).toMatch(/pyodide:ml.*1229 MB.*1000 MB/)
    expect(engine.ran).toEqual([])
    expect(semaphore.pending).toBe(0)
    // O motor python (peso 0) continua atendendo.
    await expect(executor.execute(job([callProbe("w")]))).resolves.toMatchObject({ observations: [{ id: "w", ok: true }] })
  })
})

describe("Executor: falha de um lote cancela os irmãos na fila", () => {
  it("os outros lotes do job que ainda esperam não rodam", async () => {
    const sandbox = fakeSandbox(30)
    const run = sandbox.run.bind(sandbox)
    sandbox.run = (batch: EngineBatch): Promise<ProbeObservation[]> => (batch.probes.some((probe) => probe.id === "quebra") ? Promise.reject(new Error("motor quebrou")) : run(batch))
    const semaphore = new Semaphore(1, 10)
    const executor = new Executor({ python: sandbox }, semaphore)
    const first = executor.execute(job([callProbe("a")]))
    const broken = executor.execute(job([callProbe("quebra"), unittestProbe("u1"), unittestProbe("u2")]))
    const after = executor.execute(job([callProbe("b")]))
    await expect(broken).rejects.toThrow("motor quebrou")
    await Promise.all([first, after])
    expect(sandbox.ran).toEqual([["a"], ["b"]])
    expect(semaphore.pending).toBe(0)
    expect(semaphore.active).toBe(0)
  })

  it("prazo vencido na fila de memória recusa o job inteiro e devolve o que ele não usou", async () => {
    const host = machine()
    const budget = new MemoryBudget(ML_MEMORY_MB)
    const semaphore = new Semaphore(4, 200, budget)
    const engine = fakeMlEngine(host, { delayMs: 600 })
    const executor = new Executor({ python: fakeSandbox(1), "python-dados": engine }, semaphore, { budget, maxQueueWaitMs: 5_000 })
    const holder = executor.execute(mlJob([callProbe("dono")]))
    // Dois lotes ml (execução + unittest): nenhum começa antes de 600 ms... com prazo de 100 ms.
    const shortExecutor = new Executor({ python: fakeSandbox(1), "python-dados": engine }, semaphore, { budget, maxQueueWaitMs: 100 })
    const error: unknown = await shortExecutor.execute(mlJob([callProbe("x"), unittestProbe("y")])).catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(QueueFullError)
    expect((error as QueueFullError).retryAfterSeconds).toBeGreaterThanOrEqual(2)
    expect(semaphore.pending).toBe(0)
    expect(budget.blocked).toBe(0)
    await holder
    expect(engine.ran).toEqual(["dono"])
    expect(budget.usedMb).toBe(0)
  })
})

describe("servidor: /v1/stats e 503 com Retry-After", () => {
  it("exige o token nas estatísticas e devolve Retry-After quando a fila recusa", async () => {
    const token = "s".repeat(32)
    const semaphore = new Semaphore(1, 1)
    const stats = new RunnerStats(semaphore)
    const executor = new Executor({ python: fakeSandbox(200) }, semaphore, { stats })
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

  it("informa o orçamento em /v1/stats e responde 501 (indisponível, não ocupado) ao perfil que não cabe nele", async () => {
    const token = "s".repeat(32)
    const budget = new MemoryBudget(1000)
    const semaphore = new Semaphore(2, 10, budget)
    const stats = new RunnerStats(semaphore, [], budget)
    const executor = new Executor({ python: fakeSandbox(1), "python-dados": fakeMlEngine(machine(), { delayMs: 1 }) }, semaphore, { stats, budget })
    const server = buildServer({ executor, token, log: () => undefined, stats })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` }
    try {
      const refused = await fetch(`${base}/v1/run`, { method: "POST", headers, body: JSON.stringify(mlJob([callProbe("m")])) })
      expect(refused.status).toBe(501)
      expect(refused.headers.get("retry-after")).toBeNull()
      expect(await refused.json()).toMatchObject({ error: "insufficient_memory", message: expect.stringContaining("pyodide:ml") as unknown })
      const snapshot = (await (await fetch(`${base}/v1/stats`, { headers })).json()) as { memory: unknown; jobs: { rejected: number; failed: number } }
      expect(snapshot.memory).toEqual({ limitMb: 1000, usedMb: 0, peakUsedMb: 0, blocked: 0 })
      expect(snapshot.jobs).toMatchObject({ rejected: 0, failed: 0 })
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
