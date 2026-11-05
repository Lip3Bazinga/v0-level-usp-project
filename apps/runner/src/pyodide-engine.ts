import { readFileSync } from "node:fs"
import { DEFAULT_RUNNER_LIMITS, type ProbeObservation } from "@levelusp/contracts"
import { version as pyodidePackageVersion } from "pyodide"
import type { Engine, EngineBatch, EngineReadiness, EngineRequest, EngineStats, EngineVersions } from "./engine.js"
import type { Logger } from "./logger.js"
import { collectObservations, parseObservations, prepareGuestJob } from "./observations.js"
import { PYODIDE_PROFILE_NAMES, PYODIDE_PROFILES, resolveProfile, type PyodideProfileName } from "./pyodide-profiles.js"
import type { PyodidePolicy } from "./pyodide-protocol.js"
import { PyodideWorker } from "./pyodide-worker-handle.js"

const BYTES_PER_MIB = 1024 * 1024
/** Peso da medição mais recente na média móvel do tempo de aquecimento por perfil. */
const BOOT_ESTIMATE_WEIGHT = 0.3
/** Quanto do diagnóstico do worker vai para o log. */
const LOGGED_ERROR_CHARS = 2_000

/** Configuração do motor Pyodide (ver as variáveis `RUNNER_PYODIDE_*` em `config.ts`). */
export interface PyodideEngineOptions {
  pyodideDir: string
  harnessPath: string
  workerPath: string
  policy: PyodidePolicy
  /** Workers aquecidos mantidos por perfil. */
  warm: Record<PyodideProfileName, number>
  /** Política `reuse`: lotes atendidos por um worker antes de ser reciclado. */
  recycleAfter: number
  /** Política `reuse`: worker cujo heap wasm passa disto depois do lote é reciclado (MB). */
  recycleHeapMb: number
  /** Teto da memória linear do wasm por worker (MB). */
  maxHeapMb: number
  /** Teto do heap de JS do worker (MB). */
  jsHeapMb: number
  maxJobDiskBytes: number
  maxJobEntries: number
  bootTimeoutMs: number
  log?: Logger
}

/** Prontidão do motor Pyodide, servida em `/healthz` (`pyodide: {...}`). */
export interface PyodideReadiness extends EngineReadiness {
  policy: PyodidePolicy
  profiles: PyodideProfileName[]
  /** Workers aquecidos e ociosos agora, por perfil. */
  warm: Record<PyodideProfileName, number>
}

/** Lote à espera de um worker do pool que ainda está aquecendo. */
interface Waiter {
  resolve: (worker: PyodideWorker) => void
  reject: (error: Error) => void
}

/** Worker em uso por um lote, com o que decide seu destino depois. */
interface Lease {
  worker: PyodideWorker
  /** Fora do pool (lote estrito na política `reuse`): sempre descartado. */
  dedicated: boolean
}

/**
 * Motor `python-dados`: Pyodide (CPython 3.14 em wasm, com numpy, pandas, scikit-learn...)
 * em `worker_threads`, um lote por worker (`fresh`) com um pool aquecido por perfil, ou
 * workers reaproveitados com restauração entre lotes (`reuse`). O harness é o mesmo do
 * motor WASI; o protocolo (lote pelo stdin, observações com nonce pelo stdout) também.
 */
export class PyodideEngine implements Engine {
  readonly name = "pyodide"
  readonly versions: EngineVersions = { python: "3.14 (Pyodide)", runtime: `pyodide ${pyodidePackageVersion}` }
  readonly readiness: PyodideReadiness
  private readonly harnessSource: string
  private readonly idle = new Map<PyodideProfileName, PyodideWorker[]>()
  private readonly booting = new Map<PyodideProfileName, number>()
  /** Lotes esperando um worker que já está aquecendo (em vez de aquecer outro). */
  private readonly waiters = new Map<PyodideProfileName, Waiter[]>()
  private readonly bootEstimateMs = new Map<PyodideProfileName, number>()
  private readonly counters = { batches: 0, timedOut: 0, overflowed: 0, fatal: 0, booted: 0, bootFailures: 0, recycled: 0, resetFailures: 0 }
  private isShuttingDown = false

  constructor(private readonly options: PyodideEngineOptions) {
    this.harnessSource = readFileSync(options.harnessPath, "utf8")
    this.readiness = { ready: false, reason: "autoteste pendente", policy: options.policy, profiles: [...PYODIDE_PROFILE_NAMES], warm: { dados: 0, ml: 0 } }
    for (const profile of PYODIDE_PROFILE_NAMES) {
      this.idle.set(profile, [])
      this.booting.set(profile, 0)
      this.waiters.set(profile, [])
      this.bootEstimateMs.set(profile, PYODIDE_PROFILES[profile].initialBootMs)
    }
  }

  /**
   * Confere o pedido antes da admissão: só o catálogo de bibliotecas dos perfis.
   *
   * @throws EngineRequestError para uma biblioteca fora do catálogo.
   */
  accept(request: EngineRequest): void {
    resolveProfile(request.libraries)
  }

  /** Tempo estimado de aquecimento quando não há worker ocioso do perfil (0 se houver). */
  warmupMs(request: EngineRequest): number {
    const profile = resolveProfile(request.libraries)
    if ((this.idle.get(profile)?.length ?? 0) > 0) return 0
    return this.bootEstimateMs.get(profile) ?? PYODIDE_PROFILES[profile].initialBootMs
  }

  stats(): EngineStats {
    const warm: Record<string, number> = {}
    const bootMs: Record<string, number> = {}
    for (const profile of PYODIDE_PROFILE_NAMES) {
      warm[profile] = this.idle.get(profile)?.length ?? 0
      bootMs[profile] = Math.round(this.bootEstimateMs.get(profile) ?? 0)
    }
    return { ...this.counters, policy: this.options.policy, warm, bootMs }
  }

  /**
   * Aquece os pools (`warm` por perfil) e roda um lote trivial com numpy: se falhar,
   * `readiness.ready` fica falso com o motivo (o motor é opcional: `/healthz` continua 200).
   */
  async start(): Promise<void> {
    for (const profile of PYODIDE_PROFILE_NAMES) this.refill(profile)
    try {
      const observations = await this.run({
        files: [{ path: "main.py", content: "import numpy\nresultado = float(numpy.mean([1, 2, 3]))\n" }],
        entry: "main.py",
        probes: [{ id: "autoteste", kind: "globals", names: ["resultado"] }],
        limits: { ...DEFAULT_RUNNER_LIMITS },
        libraries: ["numpy"],
      })
      const observation = observations[0]
      const isHealthy = observation?.ok === true && observation.values?.resultado === 2
      this.readiness.ready = isHealthy
      this.readiness.reason = isHealthy ? "" : (observation?.error ?? "sem observação")
    } catch (error) {
      this.readiness.ready = false
      this.readiness.reason = error instanceof Error ? error.message : String(error)
    }
  }

  /** Encerra todos os workers (parada do executor e fim dos testes). */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true
    const workers = [...this.idle.values()].flat()
    for (const list of this.idle.values()) list.length = 0
    await Promise.all(workers.map((worker) => worker.terminate()))
    this.updateWarmGauge()
  }

  async run(batch: EngineBatch): Promise<ProbeObservation[]> {
    const profile = resolveProfile(batch.libraries)
    const guestJob = prepareGuestJob(batch.probes, batch.entry)
    // Lote estrito instala o audit hook do harness, que persistiria num worker reaproveitado.
    const lease = await this.acquire(profile, guestJob.strict && this.options.policy === "reuse")
    const run = await lease.worker.run({ files: batch.files, job: guestJob, limits: batch.limits })
    this.counters.batches++
    if (run.timedOut) this.counters.timedOut++
    if (run.overflowed) this.counters.overflowed++
    if (run.fatal) this.counters.fatal++
    const observed = parseObservations(run.stdout, guestJob.nonce)
    if (observed.size === 0 && batch.probes.length > 0) {
      this.options.log?.("error", "lote python-dados terminou sem nenhuma observação", {
        profile, timedOut: run.timedOut, overflowed: run.overflowed, fatal: run.fatal, error: run.error.slice(0, LOGGED_ERROR_CHARS), stderr: run.stderr.slice(0, LOGGED_ERROR_CHARS),
      })
    }
    void this.release(lease, run.fatal || run.timedOut || run.overflowed, run.heapBytes)
    return collectObservations(batch.probes, observed, { timedOut: run.timedOut, overflowed: run.overflowed, diskExceeded: false, stderr: `${run.error}\n${run.stderr}` })
  }

  /**
   * Pega um worker do pool; sem nenhum ocioso, espera um que já esteja aquecendo para o
   * pool (se houver) ou aquece um só para este lote. Lote dedicado nunca usa o pool.
   */
  private async acquire(profile: PyodideProfileName, dedicated: boolean): Promise<Lease> {
    if (!dedicated) {
      const pooled = this.idle.get(profile)?.shift()
      if (pooled !== undefined) {
        this.updateWarmGauge()
        this.refill(profile)
        return { worker: pooled, dedicated: false }
      }
      const waiters = this.waiters.get(profile) ?? []
      if ((this.booting.get(profile) ?? 0) > waiters.length) {
        const worker = await new Promise<PyodideWorker>((resolve, reject) => waiters.push({ resolve, reject }))
        this.refill(profile)
        return { worker, dedicated: false }
      }
    }
    const worker = await this.boot(profile, !dedicated && this.options.policy === "reuse")
    return { worker, dedicated }
  }

  /** Entrega um worker recém-aquecido a quem espera por ele ou o deixa ocioso no pool. */
  private offer(profile: PyodideProfileName, worker: PyodideWorker): void {
    const waiter = this.waiters.get(profile)?.shift()
    if (waiter) waiter.resolve(worker)
    else {
      this.idle.get(profile)?.push(worker)
      this.updateWarmGauge()
    }
  }

  /**
   * Destino do worker depois do lote: `fresh` descarta sempre; `reuse` restaura e confere o
   * canário, e recicla depois de `recycleAfter` lotes, com o heap acima do teto, após falha,
   * tempo excedido, saída excedida, lote dedicado ou canário reprovado.
   */
  private async release(lease: Lease, isTainted: boolean, heapBytes: number): Promise<void> {
    const { worker } = lease
    const profile = worker.profile
    const discard = async (reason: string): Promise<void> => {
      this.counters.recycled++
      this.options.log?.("debug", "worker python-dados descartado", { profile, reason, uses: worker.uses })
      await worker.terminate()
      this.refill(profile)
    }
    if (this.options.policy === "fresh" || lease.dedicated || isTainted || worker.isDead) return discard(isTainted ? "lote falhou ou estourou limite" : "política fresh")
    if (worker.uses >= this.options.recycleAfter) return discard(`${worker.uses} lotes atendidos`)
    if (heapBytes > this.options.recycleHeapMb * BYTES_PER_MIB) return discard(`heap de ${Math.round(heapBytes / BYTES_PER_MIB)} MB`)
    const reset = await worker.reset()
    if (!reset.ok) {
      this.counters.resetFailures++
      this.options.log?.("warn", "restauração do worker python-dados falhou: reciclando", { profile, reason: reset.reason })
      return discard("restauração falhou")
    }
    if (reset.heapBytes > this.options.recycleHeapMb * BYTES_PER_MIB) return discard(`heap de ${Math.round(reset.heapBytes / BYTES_PER_MIB)} MB após restauração`)
    if (this.isShuttingDown) return discard("encerrando")
    this.offer(profile, worker)
  }

  /** Mantém `warm[profile]` workers ociosos ou aquecendo. */
  private refill(profile: PyodideProfileName): void {
    if (this.isShuttingDown) return
    const target = this.options.warm[profile]
    const idle = this.idle.get(profile)?.length ?? 0
    const booting = this.booting.get(profile) ?? 0
    for (let missing = target - idle - booting; missing > 0; missing--) {
      void this.boot(profile, this.options.policy === "reuse")
        .then((worker) => {
          if (this.isShuttingDown) return worker.terminate()
          this.offer(profile, worker)
          return undefined
        })
        .catch((error: unknown) => {
          // Quem esperava este aquecimento recebe a falha (o lote responde erro em vez de esperar para sempre).
          const failure = error instanceof Error ? error : new Error(String(error))
          this.waiters.get(profile)?.shift()?.reject(failure)
          this.options.log?.("warn", "pool python-dados sem worker aquecido", { profile, error: failure.message })
        })
    }
  }

  /** Cria e aquece um worker; registra o tempo na média do perfil. */
  private async boot(profile: PyodideProfileName, reusable: boolean): Promise<PyodideWorker> {
    this.booting.set(profile, (this.booting.get(profile) ?? 0) + 1)
    const startedAt = performance.now()
    const worker = new PyodideWorker({
      workerPath: this.options.workerPath,
      jsHeapMb: this.options.jsHeapMb,
      bootTimeoutMs: this.options.bootTimeoutMs,
      bootData: {
        pyodideDir: this.options.pyodideDir,
        profile,
        harnessSource: this.harnessSource,
        maxHeapMb: this.options.maxHeapMb,
        maxJobDiskBytes: this.options.maxJobDiskBytes,
        maxJobEntries: this.options.maxJobEntries,
        reusable,
      },
    })
    try {
      const ready = await worker.boot()
      this.versions.python = `${ready.pythonVersion} (Pyodide)`
      this.counters.booted++
      const bootMs = performance.now() - startedAt
      const estimate = this.bootEstimateMs.get(profile) ?? bootMs
      this.bootEstimateMs.set(profile, estimate + BOOT_ESTIMATE_WEIGHT * (bootMs - estimate))
      this.options.log?.("info", "worker python-dados aquecido", { profile, reusable, bootMs: Math.round(bootMs), heapMb: Math.round(ready.heapBytes / BYTES_PER_MIB) })
      return worker
    } catch (error) {
      this.counters.bootFailures++
      const message = error instanceof Error ? error.message : String(error)
      this.options.log?.("error", "aquecimento do worker python-dados falhou", { profile, error: message.slice(0, LOGGED_ERROR_CHARS) })
      await worker.terminate()
      throw new Error(`Motor python-dados: aquecimento do perfil ${profile} falhou: ${message}`)
    } finally {
      this.booting.set(profile, (this.booting.get(profile) ?? 1) - 1)
    }
  }

  private updateWarmGauge(): void {
    for (const profile of PYODIDE_PROFILE_NAMES) this.readiness.warm[profile] = this.idle.get(profile)?.length ?? 0
  }
}
