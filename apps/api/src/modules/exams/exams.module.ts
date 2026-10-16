import { Module } from "@nestjs/common"
import { ExamsAdminService } from "./exams-admin.service"
import { ExamsAdminController, ExamsController } from "./exams.controller"
import { ExamsRepository } from "./exams.repository"
import { ExamsService } from "./exams.service"

@Module({
  controllers: [ExamsController, ExamsAdminController],
  providers: [ExamsRepository, ExamsService, ExamsAdminService],
  exports: [ExamsService],
})
export class ExamsModule {}
