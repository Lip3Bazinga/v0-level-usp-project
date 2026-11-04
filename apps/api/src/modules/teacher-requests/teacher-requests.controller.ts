import { Body, Controller, Get, HttpCode, Param, Post, Query, Res } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import type { Response } from "express"
import {
  optionalBodySchema, reviewTeacherSchema, teacherApprovalStatusQuerySchema, teacherRequestSchema,
  type ReviewTeacherInput, type TeacherApprovalStatusQuery, type TeacherRequestInput,
} from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { TeacherRequestsService } from "./teacher-requests.service"

const reviewBody = optionalBodySchema(reviewTeacherSchema)

@ApiTags("teacher-requests")
@Controller()
export class TeacherRequestsController {
  constructor(private readonly requests: TeacherRequestsService) {}

  @Post("me/teacher-request")
  submit(@CurrentUser() user: AuthUser, @Body(new ZodPipe(teacherRequestSchema)) body: TeacherRequestInput) {
    return this.requests.submit(user, body)
  }

  /** Responde JSON `null` (e não corpo vazio) quando não há solicitação. */
  @Get("me/teacher-request")
  async findMyRequest(@CurrentUser() user: AuthUser, @Res() response: Response): Promise<void> {
    response.status(200).json(await this.requests.findMyRequest(user))
  }

  @Roles("admin")
  @Get("admin/teacher-approvals")
  list(@Query(new ZodPipe(teacherApprovalStatusQuerySchema)) query: TeacherApprovalStatusQuery) {
    return this.requests.list(query.status)
  }

  @Roles("admin")
  @HttpCode(204)
  @Post("admin/teacher-approvals/:id/approve")
  async approve(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(reviewBody)) body: ReviewTeacherInput): Promise<void> {
    await this.requests.approve(user, id, body.note || undefined)
  }

  @Roles("admin")
  @HttpCode(204)
  @Post("admin/teacher-approvals/:id/reject")
  async reject(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(reviewBody)) body: ReviewTeacherInput): Promise<void> {
    await this.requests.reject(user, id, body.note || undefined)
  }
}
