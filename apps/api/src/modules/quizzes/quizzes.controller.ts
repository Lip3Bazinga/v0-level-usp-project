import { Body, Controller, Get, HttpCode, Param, Post, Put } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { z } from "zod"
import { quizSubmitSchema, replaceQuizSchema, type QuizSubmitInput } from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { QuizzesService } from "./quizzes.service"

type ReplaceQuizInput = z.infer<typeof replaceQuizSchema>

@ApiTags("quizzes")
@Controller("lessons/:id/quiz")
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @Get()
  forStudent(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    return this.quizzes.forStudent(user, id)
  }

  @Roles("teacher", "admin")
  @Get("authoring")
  forAuthoring(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    return this.quizzes.forAuthoring(user, id)
  }

  @Roles("teacher", "admin")
  @Put()
  replace(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(replaceQuizSchema)) body: ReplaceQuizInput) {
    return this.quizzes.replace(user, id, body.questions)
  }

  @HttpCode(200)
  @Post("submissions")
  submit(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(quizSubmitSchema)) body: QuizSubmitInput) {
    return this.quizzes.submit(user, id, body.answers)
  }
}
