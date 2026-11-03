import { Body, Controller, Get, HttpCode, Param, Post, Put } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { quizSubmitSchema, replaceQuizSchema, type QuizSubmitInput, type ReplaceQuizInput, type QuizQuestionPublic, type QuizQuestionFull, type QuizResult } from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { QuizzesService } from "./quizzes.service"

@ApiTags("quizzes")
@Controller("lessons/:id/quiz")
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @Get()
  listForStudent(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string): Promise<QuizQuestionPublic[]> {
    return this.quizzes.listForStudent(user, id)
  }

  @Roles("teacher", "admin")
  @Get("authoring")
  listForAuthoring(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string): Promise<QuizQuestionFull[]> {
    return this.quizzes.listForAuthoring(user, id)
  }

  @Roles("teacher", "admin")
  @Put()
  replace(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(replaceQuizSchema)) body: ReplaceQuizInput): Promise<QuizQuestionFull[]> {
    return this.quizzes.replace(user, id, body.questions)
  }

  @HttpCode(200)
  @Post("submissions")
  submit(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(quizSubmitSchema)) body: QuizSubmitInput): Promise<QuizResult> {
    return this.quizzes.submit(user, id, body.answers)
  }
}
