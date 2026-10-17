import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { examSubmitSchema, type ExamSubmitInput } from "@levelusp/contracts"
import { CurrentUser } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
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
