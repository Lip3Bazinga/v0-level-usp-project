import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { examSubmitSchema, type ExamSubmitInput, type ExamStatus, type ExamStart, type AnswerSheetResult } from "@levelusp/contracts"
import { CurrentUser } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { ExamsService } from "./exams.service"

@ApiTags("exams")
@Controller("courses/:id/exam")
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  getStatus(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) courseId: string): Promise<ExamStatus> {
    return this.exams.getStatus(user, courseId)
  }

  @HttpCode(200)
  @Post("attempts")
  start(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) courseId: string): Promise<ExamStart> {
    return this.exams.start(user, courseId)
  }

  @HttpCode(200)
  @Post("submit")
  submit(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) courseId: string, @Body(new ZodPipe(examSubmitSchema)) body: ExamSubmitInput): Promise<AnswerSheetResult> {
    return this.exams.submit(user, courseId, body)
  }
}
