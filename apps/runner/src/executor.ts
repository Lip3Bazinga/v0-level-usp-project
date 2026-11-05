import os from "node:os"
import { DEFAULT_PYTHON_RUNTIME, type Probe, type PythonRuntime, type RunnerJob, type RunnerResult } from "@levelusp/contracts"
import { RuntimeUnavailableError, type Engine, type EngineRequest } from "./engine.js"
import { planBatches } from "./plan.js"
import { QueueFullError, type Semaphore } from "./semaphore.js"
import type { RunnerStats } from "./stats.js"

const BYTES_PER_MEGABYTE = 1e6

/** Motores disponíveis, pelo `runtime` que atendem; o Pyodide é opcional. */
export interface EngineRegistry {
  python: Engine
  "python-dados"?: Engine
}

/** Executa um job inteiro (todas as sondas) e devolve uma observação por sonda. */
export interface JobExecutor {
  execute(job: RunnerJob, signal?: AbortSignal): Promise<RunnerResult>
}

/** Espera estimada padrão acima da qual um job novo é recusado (503 "ocupado"). */
export const DEFAULT_MAX_QUEUE_WAIT_MS = 20_000
/**
 * Duração assumida de um lote antes da primeira medição, um pouco acima do medido numa máquina
 * de 2 vCPU (~120–130 ms por instância nas lições do seed). A média se ajusta nos primeiros jobs.
 */
const INITIAL_BATCH_ESTIMATE_MS = 150
/** Peso da medição mais recente na média móvel exponencial da duração dos lotes. */
const BATCH_ESTIMATE_WEIGHT = 0.2
const MIN_RETRY_AFTER_SECONDS = 2
const MAX_RETRY_AFTER_SECONDS = 60

/** Opções do executor: contadores (opcionais) e o teto da espera estimada na fila. */
export interface ExecutorOptions {
  stats?: RunnerStats
  /**
   * Recusa o job (503) quando o tempo estimado até ele terminar passa disto. A estimativa usa
   * a média móvel da duração real dos lotes, então uma fila de lotes rápidos aceita uma turma
   * inteira e uma fila de laços infinitos (10 s cada) recusa cedo.
   */
  maxQueueWaitMs?: number
}

/**
 * Orquestra os lotes de um job respeitando o limite global de concorrência. A admissão é
 * atômica: ou todos os lotes do job entram na fila, ou nenhum — um job recusado pela metade
 * deixaria lotes rodando sem ninguém para ler o resultado, justamente com a fila cheia.
 *
 * O motor vem do `runtime` do job (`python` = WASI, `python-dados` = Pyodide); os lotes só de
 * análise estrutural (`ast`) sempre vão ao WASI, que não executa o código do aluno e custa
 * ~130 ms em vez de um worker do Pyodide. Os dois motores dividem o mesmo semáforo.
 */
export class Executor implements JobExecutor {
  private batchEstimateMs = INITIAL_BATCH_ESTIMATE_MS
  private readonly stats: RunnerStats | undefined
  private readonly maxQueueWaitMs: number

  constructor(
    private readonly engines: EngineRegistry,
    private readonly semaphore: Semaphore,
    options: ExecutorOptions = {},
  ) {
    this.stats = options.stats
    this.maxQueueWaitMs = options.maxQueueWaitMs ?? DEFAULT_MAX_QUEUE_WAIT_MS
  }

  /** Duração média estimada de um lote (média móvel exponencial das medições, todos os motores). */
  get estimatedBatchMs(): number {
    return this.batchEstimateMs
  }

  /**
   * Tempo estimado até um job de `batchCount` lotes terminar se entrasse agora: a fila à frente
   * mais os próprios lotes, divididos pelas vagas, vezes a duração média de um lote, mais o
   * aquecimento de um worker quando o motor não tem instância pronta.
   */
  estimateWaitMs(batchCount: number, warmupMs = 0): number {
    return ((this.semaphore.pending + batchCount) / this.semaphore.capacity) * this.batchEstimateMs + warmupMs
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

  /**
   * Decide se o job entra. Sem fila (vaga livre para todos os lotes), sempre aceita — mesmo
   * que o motor precise aquecer um worker: recusar não encurtaria essa espera.
   *
   * @throws QueueFullError (com a espera sugerida) se o job não cabe na fila ou se a espera
   *         estimada passa do teto.
   */
  private admit(batchCount: number, warmupMs: number): void {
    const queued = this.semaphore.queuedIfAdmitted(batchCount)
    if (queued === 0) return
    const waitMs = this.estimateWaitMs(batchCount, warmupMs)
    if (queued > this.semaphore.maxQueue || waitMs > this.maxQueueWaitMs) {
      throw new QueueFullError(Math.min(MAX_RETRY_AFTER_SECONDS, Math.max(MIN_RETRY_AFTER_SECONDS, Math.ceil(waitMs / 1000))))
    }
  }

  private recordBatch(durationMs: number): void {
    this.batchEstimateMs += BATCH_ESTIMATE_WEIGHT * (durationMs - this.batchEstimateMs)
  }

  async execute(job: RunnerJob, signal?: AbortSignal): Promise<RunnerResult> {
    const startedAt = performance.now()
    const batchStartTimes: number[] = []
    const request: EngineRequest = { runtime: job.runtime ?? DEFAULT_PYTHON_RUNTIME, libraries: job.libraries ?? [] }
    const engine = this.engineFor(request.runtime)
    engine.accept(request)
    const batches = planBatches(job.probes)
    const needsEngine = batches.some((probes) => !isAnalysisOnly(probes))
    this.admit(batches.length, needsEngine ? engine.warmupMs(request) : 0)
    const pendingBatches = batches.map((probes) =>
      this.semaphore.run(async () => {
        const batchStartedAt = performance.now()
        batchStartTimes.push(batchStartedAt)
        const batchEngine = isAnalysisOnly(probes) ? this.engines.python : engine
        try {
          return await batchEngine.run({ files: job.files, entry: job.entry, probes, limits: job.limits, libraries: request.libraries })
        } finally {
          this.recordBatch(performance.now() - batchStartedAt)
        }
      }, signal),
    )
    // Os lotes entram na fila de forma síncrona (dentro do map): aqui a fila já tem todos.
    this.stats?.observeQueue()
    const batchResults = await Promise.all(pendingBatches)
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
