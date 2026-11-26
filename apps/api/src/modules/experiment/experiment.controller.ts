import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { eventsBatchSchema, setExperimentConditionSchema, type EventsBatchInput, type SetExperimentConditionInput } from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { EventsService } from "./events.service"

@ApiTags("experiment")
@Controller()
export class ExperimentController {
  constructor(private readonly events: EventsService) {}

  /** Lote de eventos de uso do cliente; só os tipos de `CLIENT_EVENT_TYPES` (os que o servidor decide dão 400), sempre em nome da sessão. */
  @HttpCode(204)
  @Post("me/events")
  async createMyEvents(@CurrentUser() user: AuthUser, @Body(new ZodPipe(eventsBatchSchema)) body: EventsBatchInput): Promise<void> {
    await this.events.createMyEvents(user, body.events)
  }

  @Roles("admin")
  @Get("admin/experiment/export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="levelusp-eventos.csv"')
  @Header("Cache-Control", "no-store")
  exportCsv(@CurrentUser() actor: AuthUser): Promise<string> {
    return this.events.exportCsv(actor)
  }

  @Roles("admin")
  @HttpCode(204)
  @Patch("admin/users/:id/experiment-condition")
  async setCondition(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(setExperimentConditionSchema)) body: SetExperimentConditionInput): Promise<void> {
    await this.events.setCondition(actor, id, body.experiment_condition)
  }
}
