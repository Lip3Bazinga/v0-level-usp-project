import { Module } from "@nestjs/common"
import { TeacherRequestsController } from "./teacher-requests.controller"
import { TeacherRequestsRepository } from "./teacher-requests.repository"
import { TeacherRequestsService } from "./teacher-requests.service"

@Module({
  controllers: [TeacherRequestsController],
  providers: [TeacherRequestsRepository, TeacherRequestsService],
})
export class TeacherRequestsModule {}
