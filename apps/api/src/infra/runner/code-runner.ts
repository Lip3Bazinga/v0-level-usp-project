import type { RunnerJob, RunnerResult } from "@levelusp/contracts"

/** O que a correção precisa do executor. */
export interface CodeRunner {
  run(job: RunnerJob): Promise<RunnerResult>
}

/** O que o healthcheck precisa do executor. */
export interface RunnerHealthProbe {
  healthy(): Promise<boolean>
}

export const CODE_RUNNER = Symbol("CODE_RUNNER")
export const RUNNER_HEALTH = Symbol("RUNNER_HEALTH")
