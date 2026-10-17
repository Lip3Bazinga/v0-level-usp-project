import { Inject, Injectable, Logger } from "@nestjs/common"
import type { RunnerJob, RunnerResult } from "@levelusp/contracts"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { AppError, ServiceUnavailable } from "@/common/errors/app-error"
import type { CodeRunner, RunnerHealthProbe } from "./code-runner"

/**
 * Prazo da requisição: os lotes de um job podem rodar em sequência e esperar
 * na fila do executor, então a API espera bem mais que o timeout de um lote.
 */
const REQUEST_TIMEOUT_FACTOR = 3
const REQUEST_TIMEOUT_SLACK_MS = 10_000
const HEALTHCHECK_TIMEOUT_MS = 2_000
const MAX_LOGGED_BODY_CHARS = 500

const UNAVAILABLE_MESSAGE = "O corretor está indisponível no momento."

/** Formato mínimo da resposta; o executor é interno, mas a fronteira continua tipada. */
function isRunnerResult(value: unknown): value is RunnerResult {
  if (typeof value !== "object" || value === null) return false
  return (
    "observations" in value && Array.isArray(value.observations) &&
    "durationMs" in value && typeof value.durationMs === "number" &&
    "engine" in value && typeof value.engine === "object" && value.engine !== null
  )
}

/** Cliente HTTP do executor (rede interna do Docker). */
@Injectable()
export class RunnerClient implements CodeRunner, RunnerHealthProbe {
  private readonly logger = new Logger(RunnerClient.name)

  constructor(@Inject(ENV) private readonly env: Env) {}

  async run(job: RunnerJob): Promise<RunnerResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), job.limits.timeoutMs * REQUEST_TIMEOUT_FACTOR + REQUEST_TIMEOUT_SLACK_MS)
    try {
      const response = await fetch(new URL("/v1/run", this.env.RUNNER_URL), {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.env.RUNNER_TOKEN}` },
        body: JSON.stringify(job),
        signal: controller.signal,
      })
      return await this.readResult(response)
    } catch (error) {
      if (error instanceof AppError) throw error
      this.logger.error({ err: error }, "falha ao contatar o executor")
      throw ServiceUnavailable(UNAVAILABLE_MESSAGE, "RUNNER_UNREACHABLE")
    } finally {
      clearTimeout(timer)
    }
  }

  async healthy(): Promise<boolean> {
    try {
      const response = await fetch(new URL("/healthz", this.env.RUNNER_URL), { signal: AbortSignal.timeout(HEALTHCHECK_TIMEOUT_MS) })
      return response.ok
    } catch {
      return false
    }
  }

  private async readResult(response: Response): Promise<RunnerResult> {
    if (response.status === 503) throw ServiceUnavailable("O corretor está ocupado. Tente de novo em alguns segundos.", "RUNNER_BUSY")
    if (!response.ok) {
      this.logger.error({ status: response.status, body: (await response.text()).slice(0, MAX_LOGGED_BODY_CHARS) }, "executor respondeu erro")
      throw ServiceUnavailable(UNAVAILABLE_MESSAGE, "RUNNER_ERROR")
    }
    const result: unknown = await response.json()
    if (!isRunnerResult(result)) {
      this.logger.error({ status: response.status }, "resposta do executor fora do formato esperado")
      throw ServiceUnavailable(UNAVAILABLE_MESSAGE, "RUNNER_ERROR")
    }
    return result
  }
}
