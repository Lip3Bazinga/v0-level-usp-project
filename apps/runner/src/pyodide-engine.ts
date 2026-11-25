import { readFileSync } from "node:fs"
import { DEFAULT_RUNNER_LIMITS, type ProbeObservation } from "@levelusp/contracts"
import { version as pyodidePackageVersion } from "pyodide"
import { InsufficientMemoryError, type Engine, type EngineBatch, type EngineCost, type EngineLease, type EngineReadiness, type EngineRequest, type EngineStats, type EngineVersions } from "./engine.js"
import type { Logger } from "./logger.js"
import { DEFAULT_BATCH_MEMORY_MB, MemoryBudget } from "./memory-budget.js"
import { collectObservations, isStrictBatch, parseObservations, prepareGuestJob } from "./observations.js"
import { PYODIDE_PROFILE_NAMES, PYODIDE_PROFILES, resolveProfile, type PyodideProfileName } from "./pyodide-profiles.js"
import type { PyodidePolicies, PyodidePolicy } from "./pyodide-protocol.js"
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
  /** Política de todos os perfis ou de cada um (`{ dados: "fresh", ml: "reuse" }`). */
  policy: PyodidePolicy | PyodidePolicies
  /** Workers aquecidos mantidos por perfil. */
  warm: Record<PyodideProfileName, number>
  /** Política `reuse`: lotes atendidos por um worker antes de ser reciclado. */
  recycleAfter: number
  /**
   * Política `reuse`: worker cujo heap wasm passa disto depois do lote é reciclado (MB). É um
   * teto ABSOLUTO: a memória linear do wasm nunca encolhe, então é ele que limita o quanto um
   * worker reaproveitado retém além do peso contado no orçamento. Medido na imagem de testes
   * (Pyodide 314.0.7): o heap pós-aquecimento é de 75 MB no perfil `dados` e 187 MB no `ml`, e
   * fica igual depois de um lote pequeno — com o padrão de 256 MB o worker `ml` NÃO é reciclado
   * a cada lote. A folga do `ml` é de 69 MB: um lote médio (regressão logística + KMeans em
   * 20 000 × 30, DataFrame e um gráfico) leva o heap a 269 MB e recicla o worker depois dele.
   */
  recycleHeapMb: number
  /** Teto da memória linear do wasm por worker (MB). */
  maxHeapMb: number
  /** Teto do heap de JS do worker (MB). */
  jsHeapMb: number
  maxJobDiskBytes: number
  maxJobEntries: number
  bootTimeoutMs: number
  /**
   * Orçamento de memória dividido com o resto do executor. Ausente = ilimitado (todo lote
   * recebe um worker na hora, como antes do orçamento existir).
   */
  budget?: MemoryBudget
  /** Peso de um worker vivo de cada perfil no orçamento, em MB (padrão: `DEFAULT_BATCH_MEMORY_MB`). */
  memoryMb?: Record<PyodideProfileName, number>
  log?: Logger
}

/** Prontidão do motor Pyodide, servida em `/healthz` (`pyodide: {...}`). */
export interface PyodideReadiness extends EngineReadiness {
  /** Política de cada perfil. */
  policy: PyodidePolicies
  profiles: PyodideProfileName[]
  /** Workers aquecidos e ociosos agora, por perfil. */
  warm: Record<PyodideProfileName, number>
}

/** Lote à espera de um worker do pool que ainda está aquecendo ou sendo restaurado. */
interface Waiter {
  resolve: (worker: PyodideWorker) => void
  reject: (error: Error) => void
}

/** Reserva de um lote: o worker (pronto ou a caminho) com a memória já contada no orçamento. */
class PyodideLease implements EngineLease {
  constructor(
    readonly key: string,
    readonly memoryMb: number,
    readonly worker: Promise<PyodideWorker>,
    /** Fora do pool (lote estrito na política `reuse`): sempre descartado. */
    readonly dedicated: boolean,
  ) {}
}

const costKey = (profile: PyodideProfileName): string => `pyodide:${profile}`

/**
 * Motor `python-dados`: Pyodide (CPython 3.14 em wasm, com numpy, pandas, scikit-learn...)
 * em `worker_threads`, um lote por worker (`fresh`) com um pool aquecido por perfil, ou
 * workers reaproveitados com restauração entre lotes (`reuse`), política escolhida por
 * perfil. O harness é o mesmo do motor WASI; o protocolo (lote pelo stdin, observações com
 * nonce pelo stdout) também.
 *
 * Memória: TODO worker vivo (aquecendo, ocioso, ocupado, em restauração ou dedicado) segura
 * o peso do seu perfil no `MemoryBudget`, da criação até o `terminate()` resolver. Worker
 * ocioso é cache: quando falta memória para um lote, os ociosos são despejados. O pool
 * aquecido é especulativo: só é reabastecido com memória sobrando e sem lote à espera.
 */
export class PyodideEngine implements Engine {
  readonly name = "pyodide"
  readonly versions: EngineVersions = { python: "3.14 (Pyodide)", runtime: `pyodide ${pyodidePackageVersion}` }
  readonly readiness: PyodideReadiness
  private readonly harnessSource: string
  private readonly policy: PyodidePolicies
  private readonly budget: MemoryBudget
  private readonly memoryMb: Record<PyodideProfileName, number>
  private readonly idle = new Map<PyodideProfileName, PyodideWorker[]>()
  /** Workers aquecendo PARA O POOL (os de lote dedicado não entram: nunca são oferecidos a quem espera). */
  private readonly booting = new Map<PyodideProfileName, number>()
  /** Política `reuse`: workers em restauração depois de um lote, que voltam ao pool em dezenas de ms. */
  private readonly restoring = new Map<PyodideProfileName, number>()
  /** Workers do pool rodando um lote agora (na política `reuse` continuam contando como vivos do pool). */
  private readonly busy = new Map<PyodideProfileName, number>()
  /** Todos os workers vivos (com memória reservada), por perfil. */
  private readonly live = new Map<PyodideProfileName, number>()
  /** Lotes esperando o próximo worker do pool (aquecido ou restaurado), por ordem de chegada. */
  private readonly waiters = new Map<PyodideProfileName, Waiter[]>()
  private readonly bootEstimateMs = new Map<PyodideProfileName, number>()
  private readonly counters = { batches: 0, timedOut: 0, overflowed: 0, fatal: 0, booted: 0, bootFailures: 0, recycled: 0, resetFailures: 0, evicted: 0, peakLive: 0 }
  /** Workers já entregues a `dispose` (a memória de cada um é devolvida uma única vez). */
  private readonly disposed = new WeakSet<PyodideWorker>()
  private readonly disposals = new Set<Promise<void>>()
  /** Memória de workers em encerramento: volta ao orçamento em instantes, então não precisa de outro despejo. */
  private releasingMb = 0
  private readonly unsubscribe: () => void
  private isShuttingDown = false

  constructor(private readonly options: PyodideEngineOptions) {
    this.harnessSource = readFileSync(options.harnessPath, "utf8")
    this.policy = typeof options.policy === "string" ? { dados: options.policy, ml: options.policy } : { ...options.policy }
    this.budget = options.budget ?? new MemoryBudget()
    this.memoryMb = options.memoryMb ?? { dados: DEFAULT_BATCH_MEMORY_MB.dados, ml: DEFAULT_BATCH_MEMORY_MB.ml }
    this.readiness = { ready: false, reason: "autoteste pendente", policy: { ...this.policy }, profiles: [...PYODIDE_PROFILE_NAMES], warm: { dados: 0, ml: 0 } }
    for (const profile of PYODIDE_PROFILE_NAMES) {
      this.idle.set(profile, [])
      this.booting.set(profile, 0)
      this.restoring.set(profile, 0)
      this.busy.set(profile, 0)
      this.live.set(profile, 0)
      this.waiters.set(profile, [])
      this.bootEstimateMs.set(profile, PYODIDE_PROFILES[profile].initialBootMs)
    }
    // Memória liberada (ou fila de memória esvaziada): o pool aquecido pode voltar a ser reabastecido.
    this.unsubscribe = this.budget.onChange(() => {
      for (const profile of PYODIDE_PROFILE_NAMES) this.refill(profile)
    })
  }

  /**
   * Confere o pedido antes da admissão: o catálogo de bibliotecas dos perfis e se um worker
   * do perfil cabe no orçamento de memória.
   *
   * @throws EngineRequestError para uma biblioteca fora do catálogo.
   * @throws InsufficientMemoryError quando o peso do perfil passa do orçamento inteiro.
   */
  accept(request: EngineRequest): void {
    const profile = resolveProfile(request.libraries)
    const weight = this.memoryMb[profile]
    if (weight > this.budget.limitMb) throw new InsufficientMemoryError(costKey(profile), weight, this.budget.limitMb)
  }

  /**
   * Classe de custo do pedido: `pyodide:<perfil>` e o peso de um worker do perfil.
   *
   * @throws EngineRequestError para uma biblioteca fora do catálogo.
   */
  cost(request: EngineRequest): EngineCost {
    const profile = resolveProfile(request.libraries)
    return { key: costKey(profile), memoryMb: this.memoryMb[profile] }
  }

  /** Tempo estimado de aquecimento quando não há worker ocioso do perfil (0 se houver). */
  warmupMs(request: EngineRequest): number {
    const profile = resolveProfile(request.libraries)
    if (this.idleOf(profile).length > 0) return 0
    return this.bootEstimateMs.get(profile) ?? PYODIDE_PROFILES[profile].initialBootMs
  }

  stats(): EngineStats {
    const warm: Record<string, number> = {}
    const live: Record<string, number> = {}
    const bootMs: Record<string, number> = {}
    for (const profile of PYODIDE_PROFILE_NAMES) {
      warm[profile] = this.idleOf(profile).length
      live[profile] = this.live.get(profile) ?? 0
      bootMs[profile] = Math.round(this.bootEstimateMs.get(profile) ?? 0)
    }
    return { ...this.counters, policy: { ...this.policy }, warm, live, bootMs }
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
    this.unsubscribe()
    for (const waiters of this.waiters.values()) {
      for (const waiter of waiters.splice(0)) waiter.reject(new Error("Motor python-dados: executor encerrando"))
    }
    const workers = [...this.idle.values()].flat()
    for (const list of this.idle.values()) list.length = 0
    for (const worker of workers) void this.dispose(worker)
    this.updateWarmGauge()
    // Acorda os lotes que esperavam memória dentro do motor: eles veem o encerramento e falham.
    this.budget.notify()
    await Promise.all(this.disposals)
  }

  /**
   * Reserva o worker do lote sem esperar: um ocioso do perfil; senão um que já está a caminho
   * do pool sem dono; senão reserva a memória e começa a aquecer um. Lote estrito na política
   * `reuse` sempre aquece um worker dedicado.
   *
   * @returns `undefined` quando não há memória agora: os ociosos (de qualquer perfil) que
   *          bastarem já começaram a ser encerrados e o orçamento avisa quando liberar.
   * @throws EngineRequestError para uma biblioteca fora do catálogo.
   * @throws Error com o motor encerrando.
   */
  reserve(batch: EngineBatch): PyodideLease | undefined {
    if (this.isShuttingDown) throw new Error("O executor está encerrando.")
    const profile = resolveProfile(batch.libraries)
    // Lote estrito instala o audit hook do harness, que persistiria num worker reaproveitado.
    const dedicated = isStrictBatch(batch.probes) && this.policy[profile] === "reuse"
    const worker = dedicated ? this.reserveDedicated(profile) : this.reservePooled(profile)
    if (worker === undefined) {
      this.evictIdle(this.memoryMb[profile])
      return undefined
    }
    // Uma falha de aquecimento é entregue a `run`; sem isto o Node acusaria rejeição não tratada.
    worker.catch(() => undefined)
    return new PyodideLease(costKey(profile), this.memoryMb[profile], worker, dedicated)
  }

  async run(batch: EngineBatch, lease?: EngineLease): Promise<ProbeObservation[]> {
    const held = lease === undefined ? await this.reserveWhenPossible(batch) : this.ownLease(lease)
    const profile = resolveProfile(batch.libraries)
    const guestJob = prepareGuestJob(batch.probes, batch.entry)
    const worker = await held.worker
    const run = await worker.run({ files: batch.files, job: guestJob, limits: batch.limits }).catch((error: unknown) => {
      void this.release(held, worker, true, 0)
      throw error
    })
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
    void this.release(held, worker, run.fatal || run.timedOut || run.overflowed, run.heapBytes)
    return collectObservations(batch.probes, observed, { timedOut: run.timedOut, overflowed: run.overflowed, diskExceeded: false, stderr: `${run.error}\n${run.stderr}` })
  }

  private ownLease(lease: EngineLease): PyodideLease {
    if (!(lease instanceof PyodideLease)) throw new Error("Motor python-dados: reserva de outro motor")
    return lease
  }

  /**
   * Caminho de quem chama `run` sem reserva (autoteste da partida, testes): tenta reservar e,
   * sem memória, espera o orçamento mudar. Enquanto espera, conta como lote bloqueado, para o
   * pool aquecido não disputar a memória com ele.
   */
  private async reserveWhenPossible(batch: EngineBatch): Promise<PyodideLease> {
    const immediate = this.reserve(batch)
    if (immediate) return immediate
    this.budget.addBlocked(1)
    try {
      for (;;) {
        await new Promise<void>((resolve) => {
          const unsubscribe = this.budget.onChange(() => {
            unsubscribe()
            resolve()
          })
        })
        const lease = this.reserve(batch)
        if (lease) return lease
      }
    } finally {
      this.budget.addBlocked(-1)
    }
  }

  /** Worker fora do pool, só para um lote: precisa da memória de um worker inteiro. */
  private reserveDedicated(profile: PyodideProfileName): Promise<PyodideWorker> | undefined {
    if (!this.budget.tryReserve(this.memoryMb[profile])) return undefined
    return this.boot(profile, false)
  }

  /**
   * Worker do pool: o ocioso; senão entra na fila do perfil e recebe o próximo que ficar
   * pronto — aquecido ou, na política `reuse`, restaurado depois de outro lote. Só entra na
   * fila com um worker a caminho para ele: um sem dono, ou um novo, se houver memória.
   */
  private reservePooled(profile: PyodideProfileName): Promise<PyodideWorker> | undefined {
    const pooled = this.idleOf(profile).shift()
    if (pooled !== undefined) {
      this.count(this.busy, profile, 1)
      this.updateWarmGauge()
      this.refill(profile)
      return Promise.resolve(pooled)
    }
    const hasUnownedIncoming = this.incoming(profile) > this.waitersOf(profile).length
    if (!hasUnownedIncoming && !this.budget.tryReserve(this.memoryMb[profile])) return undefined
    const worker = new Promise<PyodideWorker>((resolve, reject) => this.waitersOf(profile).push({ resolve, reject }))
    if (!hasUnownedIncoming) this.startPoolBoot(profile)
    this.refill(profile)
    return worker
  }

  /** Entrega um worker recém-aquecido (ou restaurado) a quem espera por ele ou o deixa ocioso no pool. */
  private offer(profile: PyodideProfileName, worker: PyodideWorker): void {
    const waiter = this.waitersOf(profile).shift()
    if (waiter) {
      this.count(this.busy, profile, 1)
      waiter.resolve(worker)
      return
    }
    this.idleOf(profile).push(worker)
    this.updateWarmGauge()
    // Um lote bloqueado por memória pode usar este ocioso (ou pedir o despejo dele).
    this.budget.notify()
  }

  /**
   * Destino do worker depois do lote: `fresh` descarta sempre; `reuse` restaura e confere o
   * canário, e recicla depois de `recycleAfter` lotes, com o heap acima do teto, após
   * falha, tempo excedido, saída excedida, lote dedicado ou canário reprovado.
   */
  private async release(lease: PyodideLease, worker: PyodideWorker, isTainted: boolean, heapBytes: number): Promise<void> {
    const profile = worker.profile
    if (!lease.dedicated) this.count(this.busy, profile, -1)
    const discard = async (reason: string): Promise<void> => {
      this.counters.recycled++
      this.options.log?.("debug", "worker python-dados descartado", { profile, reason, uses: worker.uses })
      await this.dispose(worker)
      this.refill(profile)
    }
    if (this.policy[profile] === "fresh" || lease.dedicated || isTainted || worker.isDead) return discard(isTainted ? "lote falhou ou estourou limite" : "política fresh")
    if (worker.uses >= this.options.recycleAfter) return discard(`${worker.uses} lotes atendidos`)
    if (heapBytes > this.options.recycleHeapMb * BYTES_PER_MIB) return discard(`heap de ${Math.round(heapBytes / BYTES_PER_MIB)} MB`)
    // Conta como worker a caminho: um lote que chega durante a restauração espera por ela
    // (dezenas de ms) em vez de aquecer outro worker (segundos).
    this.count(this.restoring, profile, 1)
    const reset = await worker.reset().finally(() => this.count(this.restoring, profile, -1))
    if (!reset.ok) {
      this.counters.resetFailures++
      this.options.log?.("warn", "restauração do worker python-dados falhou: reciclando", { profile, reason: reset.reason })
      return discard("restauração falhou")
    }
    if (reset.heapBytes > this.options.recycleHeapMb * BYTES_PER_MIB) return discard(`heap de ${Math.round(reset.heapBytes / BYTES_PER_MIB)} MB após restauração`)
    if (this.isShuttingDown) return discard("encerrando")
    this.options.log?.("debug", "worker python-dados restaurado", {
      profile,
      uses: worker.uses,
      bootHeapMb: Math.round(worker.bootHeapBytes / BYTES_PER_MIB),
      batchHeapMb: Math.round(heapBytes / BYTES_PER_MIB),
      heapMb: Math.round(reset.heapBytes / BYTES_PER_MIB),
    })
    this.offer(profile, worker)
  }

  /**
   * Mantém `warm[profile]` workers ociosos ou a caminho (aquecendo ou em restauração) ALÉM
   * dos que os lotes na fila do perfil vão consumir. Sem contar a fila, um lote ficava à
   * espera de um worker que já tinha dono — para sempre, com `warm` igual a 0. Na política
   * `reuse` os workers ocupados voltam ao pool, então também contam (alvo: vivos do pool ≥
   * `warm`): emprestar um worker não aquece um substituto.
   *
   * O que passa da fila é especulativo: só aquece com memória livre e sem nenhum lote
   * bloqueado por memória. O que não couber agora é tentado de novo a cada mudança do orçamento.
   */
  private refill(profile: PyodideProfileName): void {
    if (this.isShuttingDown) return
    const weight = this.memoryMb[profile]
    const waiting = this.waitersOf(profile).length
    const returning = this.policy[profile] === "reuse" ? (this.busy.get(profile) ?? 0) : 0
    const available = this.idleOf(profile).length + this.incoming(profile)
    let covered = available
    for (let missing = this.options.warm[profile] + waiting - available - returning; missing > 0; missing--) {
      const isSpeculative = covered >= waiting
      if (isSpeculative && this.budget.blocked > 0) return
      if (!this.budget.tryReserve(weight)) {
        if (!isSpeculative) this.evictIdle(weight)
        return
      }
      this.startPoolBoot(profile)
      covered++
    }
  }

  /** Aquece um worker para o pool. A memória dele já foi reservada por quem chama. */
  private startPoolBoot(profile: PyodideProfileName): void {
    this.count(this.booting, profile, 1)
    void this.boot(profile, this.policy[profile] === "reuse")
      .finally(() => this.count(this.booting, profile, -1))
      .then((worker) => {
        if (this.isShuttingDown) return this.dispose(worker)
        this.offer(profile, worker)
        return undefined
      })
      .catch((error: unknown) => {
        // Quem esperava este aquecimento recebe a falha (o lote responde erro em vez de esperar para sempre).
        const failure = error instanceof Error ? error : new Error(String(error))
        this.waitersOf(profile).shift()?.reject(failure)
        this.options.log?.("warn", "pool python-dados sem worker aquecido", { profile, error: failure.message })
      })
  }

  /**
   * Cria e aquece um worker; registra o tempo na média do perfil. Quem chama já reservou a
   * memória do worker no orçamento (antes de a thread existir); se o aquecimento falhar, ela
   * é devolvida por `dispose`.
   */
  private async boot(profile: PyodideProfileName, reusable: boolean): Promise<PyodideWorker> {
    const startedAt = performance.now()
    let worker: PyodideWorker
    try {
      worker = new PyodideWorker({
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
    } catch (error) {
      this.counters.bootFailures++
      this.budget.release(this.memoryMb[profile])
      throw error
    }
    this.count(this.live, profile, 1)
    this.counters.peakLive = Math.max(this.counters.peakLive, this.liveTotal())
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
      await this.dispose(worker)
      throw new Error(`Motor python-dados: aquecimento do perfil ${profile} falhou: ${message}`)
    }
  }

  /**
   * Único caminho de morte de um worker: encerra a thread e, só depois de ela terminar de
   * fato, devolve a memória ao orçamento (uma vez por worker). Se um lote do mesmo perfil
   * ficou na fila sem worker a caminho (o que ele esperava foi descartado na restauração), a
   * reserva passa direto para o substituto dele, sem dar chance de outro lote tomá-la.
   */
  private dispose(worker: PyodideWorker): Promise<void> {
    if (this.disposed.has(worker)) return Promise.resolve()
    this.disposed.add(worker)
    const profile = worker.profile
    const weight = this.memoryMb[profile]
    this.releasingMb += weight
    const disposal = worker
      .terminate()
      .catch((error: unknown) => this.options.log?.("warn", "encerramento do worker python-dados falhou", { profile, error: String(error) }))
      .then(() => {
        this.releasingMb -= weight
        this.count(this.live, profile, -1)
        this.disposals.delete(disposal)
        if (!this.isShuttingDown && this.waitersOf(profile).length > this.incoming(profile)) {
          this.startPoolBoot(profile)
          this.budget.notify()
        } else this.budget.release(weight)
      })
    this.disposals.add(disposal)
    return disposal
  }

  /**
   * Worker ocioso é cache: encerra ociosos, de qualquer perfil, até a memória livre mais a que
   * já está sendo liberada cobrirem `neededMb`. Não espera: o orçamento avisa quando liberar.
   */
  private evictIdle(neededMb: number): void {
    let missing = neededMb - this.budget.freeMb - this.releasingMb
    for (const profile of PYODIDE_PROFILE_NAMES) {
      const weight = this.memoryMb[profile]
      const idle = this.idleOf(profile)
      while (missing > 0 && weight > 0 && idle.length > 0) {
        const worker = idle.shift()
        if (worker === undefined) break
        missing -= weight
        this.counters.evicted++
        this.options.log?.("debug", "worker python-dados ocioso despejado por falta de memória", { profile, neededMb })
        void this.dispose(worker)
      }
    }
    this.updateWarmGauge()
  }

  private idleOf(profile: PyodideProfileName): PyodideWorker[] {
    return this.idle.get(profile) ?? []
  }

  private waitersOf(profile: PyodideProfileName): Waiter[] {
    return this.waiters.get(profile) ?? []
  }

  /** Workers a caminho do pool: aquecendo ou em restauração. */
  private incoming(profile: PyodideProfileName): number {
    return (this.booting.get(profile) ?? 0) + (this.restoring.get(profile) ?? 0)
  }

  private liveTotal(): number {
    let total = 0
    for (const count of this.live.values()) total += count
    return total
  }

  private count(counter: Map<PyodideProfileName, number>, profile: PyodideProfileName, delta: number): void {
    counter.set(profile, (counter.get(profile) ?? 0) + delta)
  }

  private updateWarmGauge(): void {
    for (const profile of PYODIDE_PROFILE_NAMES) this.readiness.warm[profile] = this.idleOf(profile).length
  }
}
