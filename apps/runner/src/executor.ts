import os from "node:os"
import type { RunnerJob, RunnerResult } from "@levelusp/contracts"
import { planBatches } from "./plan.js"
import type { WasmtimeSandbox } from "./sandbox.js"
import type { Semaphore } from "./semaphore.js"

export const ENGINE = { python: "3.14.0 (WASI)", runtime: "wasmtime 49" } as const

/** Orquestra os lotes de um job respeitando o limite global de concorrência. */
export class Executor {
  constructor(
    private readonly sandbox: WasmtimeSandbox,
    private readonly semaphore: Semaphore,
  ) {}

  async execute(job: RunnerJob, signal?: AbortSignal): Promise<RunnerResult> {
    const started = performance.now()
    const batches = planBatches(job.probes)
    const results = await Promise.all(
      batches.map((batch) => this.semaphore.run(() => this.sandbox.runBatch(job.files, job.entry, batch, job.limits), signal)),
    )
    const byId = new Map(results.flat().map((o) => [o.id, o]))
    return {
      observations: job.probes.map((p) => byId.get(p.id) ?? { id: p.id, ok: false, error: "Sem observação" }),
      engine: { ...ENGINE },
      durationMs: Math.round(performance.now() - started),
    }
  }
}

export const hostInfo = () => ({ cpus: os.availableParallelism(), memoryMb: Math.round(os.totalmem() / 1e6) })
