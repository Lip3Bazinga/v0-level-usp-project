import { Controller, Get, Inject } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { sql } from "drizzle-orm"
import { Public } from "@/common/decorators/auth.decorators"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { InjectDb, type Database } from "@/infra/database/database.module"
import { RunnerClient } from "@/infra/runner/runner.client"

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly runner: RunnerClient,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Liveness: o processo responde. */
  @Public()
  @Get("live")
  live() {
    return { status: "ok" }
  }

  /** Readiness: banco e executor acessíveis. */
  @Public()
  @Get("ready")
  async ready() {
    const db = await this.db.execute(sql`select 1`).then(() => true, () => false)
    const runner = await this.runner.healthy()
    return { status: db && runner ? "ok" : "degraded", env: this.env.APP_ENV, version: process.env.APP_VERSION ?? "dev", checks: { db, runner } }
  }
}
