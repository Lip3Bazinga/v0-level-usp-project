import { Global, Module } from "@nestjs/common"
import { EventsRepository } from "./events.repository"
import { EventsService } from "./events.service"
import { ExperimentController } from "./experiment.controller"

/** Experimento de gamificação: log de eventos append-only, exportação e grupo do participante. Global: qualquer módulo registra eventos. */
@Global()
@Module({ controllers: [ExperimentController], providers: [EventsRepository, EventsService], exports: [EventsService] })
export class ExperimentModule {}
