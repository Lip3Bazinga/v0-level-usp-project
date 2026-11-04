import { Controller, Get } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { Public } from "@/common/decorators/auth.decorators"
import { HealthService, type Readiness } from "./health.service"

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: o processo responde. */
  @Public()
  @Get("live")
  live() {
    return { status: "ok" }
  }

  /** Readiness: banco e executor acessíveis. */
  @Public()
  @Get("ready")
  getReadiness(): Promise<Readiness> {
    return this.health.getReadiness()
  }
}
