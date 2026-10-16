import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import {
  examQuestionInputSchema,
  examQuestionUpdateSchema,
  examSubmitSchema,
  type ExamQuestionInput,
  type ExamQuestionUpdateInput,
  type ExamSubmitInput,
} from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { ExamsAdminService } from "./exams-admin.service"
import { ExamsService } from "./exams.service"

@ApiTags("exams")
@Controller()
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get("courses/:id/exam")
  status(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) courseId: string) {
    return this.exams.status(user, courseId)
  }

  @HttpCode(200)
  @Post("courses/:id/exam/attempts")
  start(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) courseId: string) {
    return this.exams.start(user, courseId)
  }

  @HttpCode(200)
  @Post("courses/:id/exam/submit")
  submit(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) courseId: string, @Body(new ZodPipe(examSubmitSchema)) body: ExamSubmitInput) {
    return this.exams.submit(user, courseId, body)
  }
}

@ApiTags("admin")
@Roles("admin")
@Controller("admin")
export class ExamsAdminController {
  constructor(private readonly admin: ExamsAdminService) {}

  @Get("exams")
  list() {
    return this.admin.listExams()
  }

  @Get("exams/:examId/questions")
  questions(@Param("examId", UuidPipe) examId: string) {
    return this.admin.questions(examId)
  }

  @Post("exams/:examId/questions")
  create(@CurrentUser() user: AuthUser, @Param("examId", UuidPipe) examId: string, @Body(new ZodPipe(examQuestionInputSchema)) body: ExamQuestionInput) {
    return this.admin.createQuestion(user, examId, body)
  }

  @Patch("exam-questions/:id")
  update(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(examQuestionUpdateSchema)) body: ExamQuestionUpdateInput) {
    return this.admin.updateQuestion(user, id, body)
  }
}
