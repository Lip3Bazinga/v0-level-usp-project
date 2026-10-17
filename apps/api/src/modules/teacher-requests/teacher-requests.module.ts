import { Module } from "@nestjs/common"
import { NotificationsModule } from "../notifications/notifications.module"
import { TeacherRequestsController } from "./teacher-requests.controller"
import { TeacherRequestsRepository } from "./teacher-requests.repository"
import { TeacherRequestsService } from "./teacher-requests.service"

@Module({
  imports: [NotificationsModule],
  controllers: [TeacherRequestsController],
  providers: [TeacherRequestsRepository, TeacherRequestsService],
})
export class TeacherRequestsModule {}
