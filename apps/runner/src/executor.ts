import os from "node:os"
import type { ProbeObservation, RunnerJob, RunnerResult } from "@levelusp/contracts"
import { planBatches } from "./plan.js"
import type { SandboxBatch } from "./sandbox.js"
import type { Semaphore } from "./semaphore.js"

export const ENGINE = { python: "3.14.0 (WASI)", runtime: "wasmtime 49" } as const

const BYTES_PER_MEGABYTE = 1e6

/** O que o executor precisa do sandbox: rodar um lote numa instância isolada. */
export interface BatchRunner {
  runBatch(batch: SandboxBatch): Promise<ProbeObservation[]>
}

/** Executa um job inteiro (todas as sondas) e devolve uma observação por sonda. */
export interface JobExecutor {
  execute(job: RunnerJob, signal?: AbortSignal): Promise<RunnerResult>
}

/** Orquestra os lotes de um job respeitando o limite global de concorrência. */
export class Executor implements JobExecutor {
  constructor(
    private readonly sandbox: BatchRunner,
    private readonly semaphore: Semaphore,
  ) {}

  async execute(job: RunnerJob, signal?: AbortSignal): Promise<RunnerResult> {
    const startedAt = performance.now()
    const batches = planBatches(job.probes)
    const batchResults = await Promise.all(
      batches.map((probes) =>
        this.semaphore.run(() => this.sandbox.runBatch({ files: job.files, entry: job.entry, probes, limits: job.limits }), signal),
      ),
    )
    const observationById = new Map(batchResults.flat().map((observation) => [observation.id, observation]))
    return {
      observations: job.probes.map((probe) => observationById.get(probe.id) ?? { id: probe.id, ok: false, error: "Sem observação" }),
      engine: { ...ENGINE },
      durationMs: Math.round(performance.now() - startedAt),
    }
  }
}

/** Capacidade da máquina, registrada no log de inicialização para dimensionar a concorrência. */
export interface HostInfo {
  cpus: number
  memoryMb: number
}

/** Lê a capacidade da máquina atual (CPUs disponíveis e memória total). */
export const hostInfo = (): HostInfo => ({ cpus: os.availableParallelism(), memoryMb: Math.round(os.totalmem() / BYTES_PER_MEGABYTE) })
