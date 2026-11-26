import os from "node:os"
import { DEFAULT_PYTHON_RUNTIME, type Probe, type ProbeObservation, type PythonRuntime, type RunnerJob, type RunnerResult } from "@levelusp/contracts"
import { InsufficientMemoryError, RuntimeUnavailableError, type Engine, type EngineBatch, type EngineCost, type EngineLease, type EngineRequest } from "./engine.js"
import { MemoryBudget } from "./memory-budget.js"
import { planBatches } from "./plan.js"
import { QueueFullError, type Semaphore, type SemaphoreRunOptions } from "./semaphore.js"
import type { RunnerStats } from "./stats.js"

const BYTES_PER_MEGABYTE = 1e6

/** Motores disponíveis, pelo `runtime` que atendem; o Pyodide e o nativo (gVisor) são opcionais. */
export interface EngineRegistry {
  python: Engine
  "python-dados"?: Engine
  "python-completo"?: Engine
}

/** Executa um job inteiro (todas as sondas) e devolve uma observação por sonda. */
export interface JobExecutor {
  execute(job: RunnerJob, signal?: AbortSignal): Promise<RunnerResult>
}

/** Espera estimada padrão acima da qual um job novo é recusado (503 "ocupado"). */
export const DEFAULT_MAX_QUEUE_WAIT_MS = 20_000
/**
 * Duração assumida de um lote antes da primeira medição quando o motor não informa a sua
 * (`EngineCost.initialBatchMs`). A média se ajusta nos primeiros jobs.
 */
const INITIAL_BATCH_ESTIMATE_MS = 150
/** Peso da medição mais recente na média móvel exponencial da duração dos lotes. */
const BATCH_ESTIMATE_WEIGHT = 0.2
const MIN_RETRY_AFTER_SECONDS = 2
const MAX_RETRY_AFTER_SECONDS = 60
/** Pedido usado para o custo dos lotes só de análise (`ast`), que sempre rodam no motor WASI. */
const ANALYSIS_REQUEST: EngineRequest = { runtime: "python", libraries: [] }

/** Opções do executor: contadores (opcionais), o teto da espera estimada na fila e o orçamento de memória. */
export interface ExecutorOptions {
  stats?: RunnerStats
  /**
   * Recusa o job (503) quando o tempo estimado até ele terminar passa disto. A estimativa usa
   * a média móvel da duração real dos lotes de cada classe, então uma fila de lotes rápidos
   * aceita uma turma inteira e uma fila de laços infinitos (10 s cada) recusa cedo. Também é o
   * prazo de um lote à espera de memória na fila: vencido, o job recebe 503.
   */
  maxQueueWaitMs?: number
  /**
   * Orçamento de memória (o mesmo entregue ao semáforo e aos motores). Ausente = ilimitado:
   * a admissão e a fila só olham as vagas de CPU, como antes do orçamento existir.
   */
  budget?: MemoryBudget
}

/** O que o executor acompanha de cada classe de custo (`EngineCost.key`). */
interface CostClass {
  /** Média móvel exponencial da duração de um lote da classe (ms); antes da primeira medição, o valor inicial do motor. */
  estimateMs: number
  /** Lotes da classe já medidos. */
  samples: number
  /** O motor informou a duração inicial (que já inclui o aquecimento). */
  hasEngineEstimate: boolean
  memoryMb: number
  /** Lotes da classe esperando na fila agora. */
  queued: number
  /** Lotes da classe rodando agora. */
  running: number
}

/** O que os lotes de um mesmo job dividem na fila. */
interface JobContext {
  /** Aborta quando o cliente desiste ou quando um lote do job falha. */
  signal: AbortSignal
  /** Cancela os lotes do job que ainda esperam na fila; `error` é o que derrubou o job. */
  cancelSiblings: (error: unknown) => void
  /** Instante em que cada lote começou (o primeiro define o tempo de fila do job). */
  batchStartTimes: number[]
}

/** Um lote do job com o motor que o roda e a classe de custo. */
interface PlannedBatch {
  probes: Probe[]
  engine: Engine
  cost: EngineCost
}

/**
 * Orquestra os lotes de um job respeitando o limite global de concorrência e o orçamento de
 * memória. A admissão é atômica: ou todos os lotes do job entram na fila, ou nenhum — um job
 * recusado pela metade deixaria lotes rodando sem ninguém para ler o resultado, justamente
 * com a fila cheia. Pelo mesmo motivo, se um lote falha (ou vence o prazo na fila), os outros
 * lotes do job que ainda esperam são cancelados.
 *
 * O motor vem do `runtime` do job (`python` = WASI, `python-dados` = Pyodide, `python-completo` =
 * CPython nativo em gVisor, desligado por padrão: sem ele o job recebe 501); os lotes só de
 * análise estrutural (`ast`) sempre vão ao WASI, que não executa o código do aluno e custa
 * ~130 ms em vez de um worker do Pyodide. Os dois motores dividem o mesmo semáforo.
 *
 * Memória: um lote com custo só começa com a memória (ou o worker) reservada — pelo `reserve`
 * do motor, ou direto no orçamento quando o motor não tem pool. Sem memória ele espera na
 * fila; a admissão recusa (503 com `Retry-After`) quando a espera estimada passa do teto.
 */
export class Executor implements JobExecutor {
  private readonly classes = new Map<string, CostClass>()
  private readonly stats: RunnerStats | undefined
  private readonly maxQueueWaitMs: number
  private readonly budget: MemoryBudget

  constructor(
    private readonly engines: EngineRegistry,
    private readonly semaphore: Semaphore,
    options: ExecutorOptions = {},
  ) {
    this.stats = options.stats
    this.maxQueueWaitMs = options.maxQueueWaitMs ?? DEFAULT_MAX_QUEUE_WAIT_MS
    this.budget = options.budget ?? new MemoryBudget()
  }

  /** Duração média estimada de um lote do motor WASI (a classe da maioria dos jobs). */
  get estimatedBatchMs(): number {
    return this.estimatedBatchMsOf(this.engines.python.cost(ANALYSIS_REQUEST).key)
  }

  /** Duração média estimada de um lote da classe de custo `key` (média móvel exponencial das medições). */
  estimatedBatchMsOf(key: string): number {
    return this.classes.get(key)?.estimateMs ?? INITIAL_BATCH_ESTIMATE_MS
  }

  /**
   * Tempo estimado até um job terminar se entrasse agora, com `costs` sendo a classe de cada
   * lote dele. É o maior entre:
   * - CPU: a duração somada dos lotes na fila e dos lotes do job, dividida pelas vagas;
   * - memória (só com orçamento limitado): para cada classe com custo, os lotes na fila ou
   *   rodando mais os do job, divididos pelas vagas de memória da classe (orçamento ÷ peso),
   *   vezes a duração média da classe;
   * mais `warmupMs` (o aquecimento de um worker quando o motor não tem instância pronta) só
   * enquanto a duração da classe não o inclui: a duração medida de um lote já conta o
   * aquecimento que ele pagou, e a inicial informada pelo motor também.
   */
  estimateWaitMs(costs: readonly EngineCost[], warmupMs = 0): number {
    const own = new Map<string, number>()
    for (const cost of costs) {
      this.classOf(cost)
      own.set(cost.key, (own.get(cost.key) ?? 0) + 1)
    }
    let cpuWorkMs = 0
    let memoryWaitMs = 0
    for (const [key, costClass] of this.classes) {
      const ownCount = own.get(key) ?? 0
      cpuWorkMs += (costClass.queued + ownCount) * costClass.estimateMs
      const slots = this.budget.slotsFor(costClass.memoryMb)
      if (Number.isFinite(slots) && slots > 0) memoryWaitMs += ((costClass.queued + costClass.running + ownCount) / slots) * costClass.estimateMs
    }
    const includesWarmup = costs.every((cost) => {
      const costClass = this.classOf(cost)
      return costClass.samples > 0 || costClass.hasEngineEstimate
    })
    return Math.max(cpuWorkMs / this.semaphore.capacity, memoryWaitMs) + (includesWarmup ? 0 : warmupMs)
  }

  /**
   * Motor que atende o `runtime` pedido.
   *
   * @throws RuntimeUnavailableError (501) quando o motor não está habilitado.
   */
  engineFor(runtime: PythonRuntime): Engine {
    const engine = this.engines[runtime]
    if (!engine) throw new RuntimeUnavailableError(runtime)
    return engine
  }

  private classOf(cost: EngineCost): CostClass {
    let costClass = this.classes.get(cost.key)
    if (!costClass) {
      costClass = { estimateMs: INITIAL_BATCH_ESTIMATE_MS, samples: 0, hasEngineEstimate: false, memoryMb: cost.memoryMb, queued: 0, running: 0 }
      this.classes.set(cost.key, costClass)
    }
    costClass.memoryMb = cost.memoryMb
    // Sem medição, vale a estimativa atual do motor (muda com o pool: worker pronto ou a aquecer).
    if (costClass.samples === 0 && cost.initialBatchMs !== undefined) {
      costClass.estimateMs = cost.initialBatchMs
      costClass.hasEngineEstimate = true
    }
    return costClass
  }

  /** Memória (MB) que os lotes com custo na fila ou rodando ocupam ou vão ocupar. */
  private committedMemoryMb(): number {
    let total = 0
    for (const costClass of this.classes.values()) total += (costClass.queued + costClass.running) * costClass.memoryMb
    return total
  }

  private retryAfterSeconds(waitMs: number): number {
    return Math.min(MAX_RETRY_AFTER_SECONDS, Math.max(MIN_RETRY_AFTER_SECONDS, Math.ceil(waitMs / 1000)))
  }

  /**
   * Decide se o job entra. Sem fila (vaga de CPU e memória livres para todos os lotes), sempre
   * aceita — mesmo que o motor precise aquecer um worker: recusar não encurtaria essa espera.
   *
   * @throws InsufficientMemoryError se um lote pesa mais que o orçamento inteiro (nunca rodaria).
   * @throws QueueFullError (com a espera sugerida) se o job não cabe na fila ou se a espera
   *         estimada (por CPU ou por memória) passa do teto.
   */
  private admit(costs: readonly EngineCost[], warmupMs: number): void {
    let ownMemoryMb = 0
    for (const cost of costs) {
      if (cost.memoryMb > this.budget.limitMb) throw new InsufficientMemoryError(cost.key, cost.memoryMb, this.budget.limitMb)
      ownMemoryMb += cost.memoryMb
    }
    const queued = this.semaphore.queuedIfAdmitted(costs.length)
    const waitsForMemory = ownMemoryMb > 0 && this.committedMemoryMb() + ownMemoryMb > this.budget.limitMb
    if (queued === 0 && !waitsForMemory) return
    const waitMs = this.estimateWaitMs(costs, warmupMs)
    if (queued > this.semaphore.maxQueue || waitMs > this.maxQueueWaitMs) throw new QueueFullError(this.retryAfterSeconds(waitMs))
  }

  private recordBatch(costClass: CostClass, durationMs: number): void {
    // A primeira medição substitui o palpite inicial; as seguintes entram na média móvel.
    costClass.estimateMs = costClass.samples === 0 ? durationMs : costClass.estimateMs + BATCH_ESTIMATE_WEIGHT * (durationMs - costClass.estimateMs)
    costClass.samples++
  }

  async execute(job: RunnerJob, signal?: AbortSignal): Promise<RunnerResult> {
    const startedAt = performance.now()
    const batchStartTimes: number[] = []
    const request: EngineRequest = { runtime: job.runtime ?? DEFAULT_PYTHON_RUNTIME, libraries: job.libraries ?? [], probeKinds: job.probes.map((probe) => probe.kind) }
    const engine = this.engineFor(request.runtime)
    engine.accept(request)
    const batches: PlannedBatch[] = planBatches(job.probes).map((probes) =>
      isAnalysisOnly(probes) ? { probes, engine: this.engines.python, cost: this.engines.python.cost(ANALYSIS_REQUEST) } : { probes, engine, cost: engine.cost(request) },
    )
    const needsEngine = batches.some((batch) => batch.engine === engine)
    this.admit(batches.map((batch) => batch.cost), needsEngine ? engine.warmupMs(request) : 0)
    // Um lote que falha ou vence o prazo na fila cancela os irmãos que ainda não começaram.
    const jobAbort = new AbortController()
    const jobSignal = signal ? AbortSignal.any([signal, jobAbort.signal]) : jobAbort.signal
    // O erro que derrubou o job: os irmãos cancelados rejeitam com `CancelledError`, às vezes
    // antes de o erro original chegar ao `Promise.all`, e é o original que o cliente precisa ver.
    const failures: unknown[] = []
    const cancelSiblings = (error: unknown): void => {
      failures.push(error)
      jobAbort.abort()
    }
    const pendingBatches = batches.map((batch) =>
      this.enqueue(batch, { files: job.files, entry: job.entry, probes: batch.probes, limits: job.limits, libraries: request.libraries }, { signal: jobSignal, cancelSiblings, batchStartTimes }).catch((error: unknown) => {
        // Rede de segurança (ex.: fila no teto ao entrar): os caminhos comuns já cancelaram antes.
        cancelSiblings(error)
        throw error
      }),
    )
    // Os lotes entram na fila de forma síncrona (dentro do map): aqui a fila já tem todos.
    this.stats?.observeQueue()
    const batchResults = await Promise.all(pendingBatches).catch((error: unknown) => {
      throw failures.length > 0 ? failures[0] : error
    })
    const finishedAt = performance.now()
    const queueMs = (batchStartTimes[0] ?? finishedAt) - startedAt
    this.stats?.recordCompleted({ at: Date.now(), queueMs: Math.round(queueMs), execMs: Math.round(finishedAt - startedAt - queueMs), batches: batches.length })
    const observationById = new Map(batchResults.flat().map((observation) => [observation.id, observation]))
    return {
      observations: job.probes.map((probe) => observationById.get(probe.id) ?? { id: probe.id, ok: false, error: "Sem observação" }),
      engine: { ...engine.versions },
      durationMs: Math.round(finishedAt - startedAt),
    }
  }

  /**
   * Põe um lote na fila do semáforo com a reserva que a classe dele exige: o `reserve` do
   * motor (worker + memória), ou o peso direto no orçamento quando o motor não tem pool, ou
   * nada (custo zero: só a vaga de CPU).
   */
  private async enqueue(planned: PlannedBatch, batch: EngineBatch, job: JobContext): Promise<ProbeObservation[]> {
    const { engine, cost } = planned
    const { signal, cancelSiblings, batchStartTimes } = job
    const costClass = this.classOf(cost)
    // O que o `claim` reservou para o lote e se ele chegou a começar (mudam dentro da fila).
    const held: { lease: EngineLease | undefined; reservedMb: number; hasStarted: boolean } = { lease: undefined, reservedMb: 0, hasStarted: false }
    const options: SemaphoreRunOptions = { signal }
    const reserve = engine.reserve?.bind(engine)
    if (reserve) {
      options.claim = (): boolean => {
        held.lease = reserve(batch)
        return held.lease !== undefined
      }
    } else if (cost.memoryMb > 0 && this.budget.isLimited) {
      options.claim = (): boolean => {
        if (!this.budget.tryReserve(cost.memoryMb)) return false
        held.reservedMb = cost.memoryMb
        return true
      }
    }
    // Sem orçamento não há espera por memória: a fila só tem o teto de sempre (admissão).
    if (this.budget.isLimited) options.deadline = { ms: this.maxQueueWaitMs, retryAfterSeconds: () => this.retryAfterSeconds(this.estimateWaitMs([cost])), onExpire: cancelSiblings }
    costClass.queued++
    try {
      return await this.semaphore.run(async () => {
        held.hasStarted = true
        costClass.queued--
        costClass.running++
        const batchStartedAt = performance.now()
        batchStartTimes.push(batchStartedAt)
        try {
          return await engine.run(batch, held.lease)
        } catch (error) {
          // Antes de a vaga ser devolvida: senão o semáforo iniciaria um irmão que ninguém vai ler.
          cancelSiblings(error)
          throw error
        } finally {
          this.recordBatch(costClass, performance.now() - batchStartedAt)
          costClass.running--
          this.budget.release(held.reservedMb)
        }
      }, options)
    } finally {
      if (!held.hasStarted) costClass.queued--
    }
  }
}

/** Lote só de regras de estrutura: não executa o código do aluno, então qualquer motor serve. */
function isAnalysisOnly(probes: Probe[]): boolean {
  return probes.every((probe) => probe.kind === "ast")
}

/** Capacidade da máquina, registrada no log de inicialização para dimensionar a concorrência. */
export interface HostInfo {
  cpus: number
  memoryMb: number
}

/** Lê a capacidade da máquina atual (CPUs disponíveis e memória total). */
export const hostInfo = (): HostInfo => ({ cpus: os.availableParallelism(), memoryMb: Math.round(os.totalmem() / BYTES_PER_MEGABYTE) })
