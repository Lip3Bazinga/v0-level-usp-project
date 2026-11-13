import { Controller, Get, Res } from "@nestjs/common"
import type { Response } from "express"
import { ApiTags } from "@nestjs/swagger"
import { Public } from "@/common/decorators/auth.decorators"
import { HealthService, type Liveness, type Readiness } from "./health.service"

const SERVICE_UNAVAILABLE_STATUS = 503

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: o processo responde. */
  @Public()
  @Get("live")
  live(): Liveness {
    return { status: "ok" }
  }

  /**
   * Readiness: banco e executor acessíveis. 503 quando algum falha — é o status que o
   * orquestrador e o monitor olham. Rota pública: o corpo só diz `ok`/`degraded` e qual
   * verificação falhou (booleans), sem mensagem de erro, host ou versão de dependência.
   */
  @Public()
  @Get("ready")
  async getReadiness(@Res({ passthrough: true }) response: Response): Promise<Readiness> {
    const readiness = await this.health.getReadiness()
    if (readiness.status !== "ok") response.status(SERVICE_UNAVAILABLE_STATUS)
    return readiness
  }
}
