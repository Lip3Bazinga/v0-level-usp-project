import { Global, Module } from "@nestjs/common"
import { NotificationsController } from "./notifications.controller"
import { NotificationsRepository } from "./notifications.repository"
import { NotificationsService } from "./notifications.service"

/** Global: gamificação, provas, certificados e revisões notificam o aluno. */
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
