import { Inject, Injectable, Logger } from "@nestjs/common"
import type { RunnerJob, RunnerResult } from "@levelusp/contracts"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { ServiceUnavailable } from "@/common/errors/app-error"

/** Cliente HTTP do executor (rede interna do Docker). */
@Injectable()
export class RunnerClient {
  private readonly logger = new Logger(RunnerClient.name)

  constructor(@Inject(ENV) private readonly env: Env) {}

  async run(job: RunnerJob): Promise<RunnerResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), job.limits.timeoutMs * 3 + 10_000)
    try {
      const res = await fetch(new URL("/v1/run", this.env.RUNNER_URL), {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.env.RUNNER_TOKEN}` },
        body: JSON.stringify(job),
        signal: controller.signal,
      })
      if (res.status === 503) throw ServiceUnavailable("O corretor está ocupado. Tente de novo em alguns segundos.", "RUNNER_BUSY")
      if (!res.ok) {
        this.logger.error({ status: res.status, body: (await res.text()).slice(0, 500) }, "executor respondeu erro")
        throw ServiceUnavailable("O corretor está indisponível no momento.", "RUNNER_ERROR")
      }
      return (await res.json()) as RunnerResult
    } catch (err) {
      if (err instanceof Error && err.name === "AppError") throw err
      this.logger.error({ err }, "falha ao contatar o executor")
      throw ServiceUnavailable("O corretor está indisponível no momento.", "RUNNER_UNREACHABLE")
    } finally {
      clearTimeout(timer)
    }
  }

  async healthy(): Promise<boolean> {
    try {
      const res = await fetch(new URL("/healthz", this.env.RUNNER_URL), { signal: AbortSignal.timeout(2_000) })
      return res.ok
    } catch {
      return false
    }
  }
}
