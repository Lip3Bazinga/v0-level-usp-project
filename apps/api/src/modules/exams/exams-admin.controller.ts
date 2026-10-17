import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { examQuestionInputSchema, examQuestionUpdateSchema, type ExamQuestionInput, type ExamQuestionUpdateInput } from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { ExamsAdminService } from "./exams-admin.service"

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
