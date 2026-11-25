import { Worker } from "node:worker_threads"
import type { ProjectFile, RunnerLimits } from "@levelusp/contracts"
import type { GuestJob } from "./observations.js"
import type { PyodideProfileName } from "./pyodide-profiles.js"
import { INTERRUPT_SIGNAL, type PyodideDoneEvent, type PyodideReadyEvent, type PyodideResetDoneEvent, type PyodideWorkerBootData, type PyodideWorkerCommand, type PyodideWorkerEvent } from "./pyodide-protocol.js"

/** Folga entre a interrupção suave (KeyboardInterrupt) e o `terminate()` do worker. */
const HOST_KILL_GRACE_MS = 2_000
/**
 * O harness roda o `main.py` de novo a cada sonda: uma única interrupção mataria só o
 * laço da sonda corrente. O sinal é rearmado até o lote terminar, então cada sonda
 * seguinte cai de imediato e o worker devolve o controle em milissegundos.
 */
const INTERRUPT_REARM_MS = 20
const MAX_STDOUT_BYTES = 8 * 1024 * 1024
const MAX_STDERR_CHARS = 256 * 1024

/** Dados do worker que a thread principal controla. */
export interface PyodideWorkerOptions {
  /** Caminho do script compilado do worker (`pyodide-worker.js`). */
  workerPath: string
  bootData: Omit<PyodideWorkerBootData, "interruptBuffer" | "maxStdoutBytes" | "maxStderrChars">
  /** `resourceLimits.maxOldGenerationSizeMb` do worker (heap de JS do Pyodide). */
  jsHeapMb: number
  /** Prazo do aquecimento (carregar o Pyodide e os pacotes do perfil). */
  bootTimeoutMs: number
}

/** O que a thread principal sabe de um lote depois de rodá-lo no worker. */
export interface PyodideBatchRun {
  stdout: string
  stderr: string
  timedOut: boolean
  overflowed: boolean
  /** O worker morreu ou o interpretador ficou inutilizável: nunca reaproveitar. */
  fatal: boolean
  /** Diagnóstico (erro de JS, saída do worker) para o log. */
  error: string
  heapBytes: number
  durationMs: number
}

/** O que `reset()` devolve na política `reuse`. */
export interface PyodideResetResult {
  ok: boolean
  reason: string
  heapBytes: number
  durationMs: number
}

/** Lote entregue ao worker: projeto, lote como o harness lê e o orçamento de tempo. */
export interface PyodideWorkerBatch {
  files: ProjectFile[]
  job: GuestJob
  limits: RunnerLimits
}

interface Pending<T> {
  resolve: (value: T) => void
}

/**
 * Um worker do Pyodide visto da thread principal: aquecimento com prazo, execução de um
 * lote com interrupção suave (buffer compartilhado → `KeyboardInterrupt`) e morte dura
 * (`terminate()`), saída acumulada com teto e reciclagem. Uma instância = uma thread.
 */
export class PyodideWorker {
  readonly profile: PyodideProfileName
  readonly reusable: boolean
  /** Lotes já atendidos (a política `reuse` recicla depois de N). */
  uses = 0
  /** Heap wasm logo depois do aquecimento (0 até aquecer): no log, mostra quanto os lotes fizeram o worker crescer. */
  bootHeapBytes = 0
  private termination: Promise<void> | null = null
  private readonly worker: Worker
  private readonly interrupt: Int32Array
  private ready: Promise<PyodideReadyEvent>
  private exited = false
  private exitError = ""
  private stdoutChunks: Uint8Array[] = []
  private stdoutBytes = 0
  private stderr = ""
  private isCollecting = false
  private pendingDone: Pending<PyodideDoneEvent> | null = null
  private pendingReset: Pending<PyodideResetDoneEvent> | null = null

  constructor(options: PyodideWorkerOptions) {
    this.profile = options.bootData.profile
    this.reusable = options.bootData.reusable
    const interruptBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)
    this.interrupt = new Int32Array(interruptBuffer)
    const bootData: PyodideWorkerBootData = { ...options.bootData, interruptBuffer, maxStdoutBytes: MAX_STDOUT_BYTES, maxStderrChars: MAX_STDERR_CHARS }
    // Ambiente vazio e sem stdio herdado: nada do processo do executor chega ao worker.
    this.worker = new Worker(options.workerPath, {
      workerData: bootData,
      env: {},
      stdin: false,
      stdout: true,
      stderr: true,
      resourceLimits: { maxOldGenerationSizeMb: options.jsHeapMb },
    })
    this.worker.stdout.on("data", () => undefined)
    this.worker.stderr.on("data", () => undefined)
    this.ready = new Promise<PyodideReadyEvent>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`aquecimento do worker ${this.profile} passou de ${options.bootTimeoutMs} ms`)), options.bootTimeoutMs)
      const settle = (outcome: { ready: PyodideReadyEvent } | { error: Error }): void => {
        clearTimeout(timer)
        if ("ready" in outcome) {
          this.bootHeapBytes = outcome.ready.heapBytes
          resolve(outcome.ready)
        } else reject(outcome.error)
      }
      this.worker.on("message", (event: PyodideWorkerEvent) => {
        if (event.type === "ready") settle({ ready: event })
        else if (event.type === "boot-error") settle({ error: new Error(event.message) })
        else this.handleEvent(event)
      })
      this.worker.on("error", (error) => {
        this.markExited(error.message)
        settle({ error })
      })
      this.worker.on("exit", (code) => {
        this.markExited(`worker terminou com código ${code}`)
        settle({ error: new Error(this.exitError) })
      })
    })
    // Falhas de aquecimento são tratadas por quem chama `boot()`; sem isto o Node acusa rejeição não tratada.
    this.ready.catch(() => undefined)
  }

  /** Resolve quando o worker está aquecido; rejeita se o aquecimento falhar ou estourar o prazo. */
  boot(): Promise<PyodideReadyEvent> {
    return this.ready
  }

  /** O worker morreu (erro, falta de memória de JS, `terminate`). */
  get isDead(): boolean {
    return this.exited
  }

  /**
   * Roda um lote: ao estourar `limits.timeoutMs`, levanta e rearma a interrupção; se o
   * worker não devolver o controle em `HOST_KILL_GRACE_MS`, é morto. Observações
   * emitidas depois do prazo são descartadas (o prazo é o prazo, como no WASI).
   */
  async run(batch: PyodideWorkerBatch): Promise<PyodideBatchRun> {
    if (this.exited) return this.deadRun()
    this.uses++
    this.stdoutChunks = []
    this.stdoutBytes = 0
    this.stderr = ""
    this.isCollecting = true
    let timedOut = false
    const timers: { rearm?: NodeJS.Timeout } = {}
    const softTimer = setTimeout(() => {
      timedOut = true
      this.isCollecting = false
      Atomics.store(this.interrupt, 0, INTERRUPT_SIGNAL)
      timers.rearm = setInterval(() => Atomics.store(this.interrupt, 0, INTERRUPT_SIGNAL), INTERRUPT_REARM_MS)
    }, batch.limits.timeoutMs)
    const hardTimer = setTimeout(() => void this.terminate(), batch.limits.timeoutMs + HOST_KILL_GRACE_MS)
    const done = await new Promise<PyodideDoneEvent>((resolve) => {
      this.pendingDone = { resolve }
      this.post({ type: "run", files: batch.files, job: batch.job })
    })
    clearTimeout(softTimer)
    clearTimeout(hardTimer)
    if (timers.rearm) clearInterval(timers.rearm)
    Atomics.store(this.interrupt, 0, 0)
    this.pendingDone = null
    this.isCollecting = false
    return {
      stdout: Buffer.concat(this.stdoutChunks).toString("utf8"),
      stderr: this.stderr,
      timedOut,
      overflowed: done.overflowed,
      fatal: done.fatal || this.exited,
      error: done.error ?? this.exitError,
      heapBytes: done.heapBytes,
      durationMs: done.durationMs,
    }
  }

  /** Restaura o interpretador e roda o canário (política `reuse`). */
  async reset(): Promise<PyodideResetResult> {
    if (this.exited) return { ok: false, reason: this.exitError, heapBytes: 0, durationMs: 0 }
    const result = await new Promise<PyodideResetDoneEvent>((resolve) => {
      this.pendingReset = { resolve }
      this.post({ type: "reset" })
    })
    this.pendingReset = null
    return { ok: result.ok, reason: result.reason, heapBytes: result.heapBytes, durationMs: result.durationMs }
  }

  /**
   * Mata a thread (sem esperar o Python): lotes em andamento recebem falha. Toda chamada
   * devolve a mesma promessa, que só resolve com a thread encerrada de fato — é quando a
   * memória do worker pode ser devolvida ao orçamento (mesmo se o worker já tinha morrido
   * sozinho ou sido morto pelo prazo do lote).
   */
  terminate(): Promise<void> {
    this.termination ??= this.stopThread()
    return this.termination
  }

  private async stopThread(): Promise<void> {
    this.markExited("worker encerrado pelo executor")
    await this.worker.terminate()
  }

  private post(command: PyodideWorkerCommand): void {
    this.worker.postMessage(command)
  }

  private handleEvent(event: PyodideWorkerEvent): void {
    switch (event.type) {
      case "stdout":
        if (!this.isCollecting || this.stdoutBytes + event.chunk.length > MAX_STDOUT_BYTES) return
        this.stdoutBytes += event.chunk.length
        this.stdoutChunks.push(event.chunk)
        return
      case "stderr":
        if (this.stderr.length < MAX_STDERR_CHARS) this.stderr += event.text
        return
      case "done":
        this.pendingDone?.resolve(event)
        return
      case "reset-done":
        this.pendingReset?.resolve(event)
        return
      case "ready":
      case "boot-error":
        return
    }
  }

  private markExited(reason: string): void {
    if (this.exited) return
    this.exited = true
    this.exitError = reason
    this.pendingDone?.resolve({ type: "done", durationMs: 0, heapBytes: 0, overflowed: false, fatal: true, error: reason })
    this.pendingReset?.resolve({ type: "reset-done", ok: false, reason, heapBytes: 0, durationMs: 0 })
  }

  private deadRun(): PyodideBatchRun {
    return { stdout: "", stderr: "", timedOut: false, overflowed: false, fatal: true, error: this.exitError, heapBytes: 0, durationMs: 0 }
  }
}
