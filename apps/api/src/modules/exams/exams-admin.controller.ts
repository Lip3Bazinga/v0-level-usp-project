import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { examQuestionInputSchema, examQuestionUpdateSchema, type ExamQuestionInput, type ExamQuestionUpdateInput, type AdminExamSummary, type AdminExamQuestion } from "@levelusp/contracts"
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
  listExams(): Promise<AdminExamSummary[]> {
    return this.admin.listExams()
  }

  @Get("exams/:examId/questions")
  listQuestions(@Param("examId", UuidPipe) examId: string): Promise<AdminExamQuestion[]> {
    return this.admin.listQuestions(examId)
  }

  @Post("exams/:examId/questions")
  createQuestion(@CurrentUser() user: AuthUser, @Param("examId", UuidPipe) examId: string, @Body(new ZodPipe(examQuestionInputSchema)) body: ExamQuestionInput): Promise<AdminExamQuestion> {
    return this.admin.createQuestion(user, examId, body)
  }

  @Patch("exam-questions/:id")
  updateQuestion(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(examQuestionUpdateSchema)) body: ExamQuestionUpdateInput): Promise<AdminExamQuestion> {
    return this.admin.updateQuestion(user, id, body)
  }
}
