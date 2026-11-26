import { Module } from "@nestjs/common"
import { GradingModule } from "../grading/grading.module"
import { DraftStepsController } from "./draft-steps.controller"
import { DraftStepsService } from "./draft-steps.service"

/** Autoria: teste do gabarito e correção de passos do rascunho do editor (nada é gravado). */
@Module({
  imports: [GradingModule],
  controllers: [DraftStepsController],
  providers: [DraftStepsService],
})
export class AuthoringModule {}
