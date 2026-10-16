import { Module } from "@nestjs/common"
import { GradingModule } from "../grading/grading.module"
import { LearningController } from "./learning.controller"
import { LearningRepository } from "./learning.repository"
import { LearningService } from "./learning.service"

@Module({
  imports: [GradingModule],
  controllers: [LearningController],
  providers: [LearningRepository, LearningService],
})
export class LearningModule {}
