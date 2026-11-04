import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { InjectDb, type Database } from "@/infra/database/database.module"
import { RUNNER_HEALTH, type RunnerHealthProbe } from "@/infra/runner/code-runner"

/** Resposta do liveness: o processo está de pé (não verifica dependências). */
export interface Liveness {
  status: "ok"
}

/** Resposta do readiness: `degraded` quando o banco ou o executor não respondem. */
export interface Readiness {
  status: "ok" | "degraded"
  env: Env["APP_ENV"]
  version: string
  checks: { db: boolean; runner: boolean }
}

/** Verificações de saúde para o orquestrador (Docker/Compose). */
@Injectable()
export class HealthService {
  constructor(
    @InjectDb() private readonly db: Database,
    @Inject(RUNNER_HEALTH) private readonly runner: RunnerHealthProbe,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Testa o banco (`select 1`) e o executor; nunca lança, só reporta. */
  async getReadiness(): Promise<Readiness> {
    const isDatabaseUp = await this.db.execute(sql`select 1`).then(() => true, () => false)
    const isRunnerUp = await this.runner.healthy()
    return {
      status: isDatabaseUp && isRunnerUp ? "ok" : "degraded",
      env: this.env.APP_ENV,
      version: process.env.APP_VERSION ?? "dev",
      checks: { db: isDatabaseUp, runner: isRunnerUp },
    }
  }
}
