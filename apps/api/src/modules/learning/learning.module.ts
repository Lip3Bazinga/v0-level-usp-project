import { Module } from "@nestjs/common"
import { CatalogModule } from "../catalog/catalog.module"
import { GradingModule } from "../grading/grading.module"
import { LearningController } from "./learning.controller"
import { LearningRepository } from "./learning.repository"
import { LearningService } from "./learning.service"
import { StepsController } from "./steps.controller"
import { StepsRepository } from "./steps.repository"
import { StepsService } from "./steps.service"
import { SubmissionGrader } from "./submission-grader"

@Module({
  imports: [GradingModule, CatalogModule],
  controllers: [LearningController, StepsController],
  providers: [LearningRepository, LearningService, StepsRepository, StepsService, SubmissionGrader],
})
export class LearningModule {}
