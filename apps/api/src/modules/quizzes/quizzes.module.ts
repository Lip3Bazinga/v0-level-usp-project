import { Module } from "@nestjs/common"
import { QuizzesController } from "./quizzes.controller"
import { QuizzesRepository } from "./quizzes.repository"
import { QuizzesService } from "./quizzes.service"

/** Quiz de lição: aluno responde sem ver o gabarito; correção e XP no servidor. */
@Module({
  controllers: [QuizzesController],
  providers: [QuizzesRepository, QuizzesService],
})
export class QuizzesModule {}
