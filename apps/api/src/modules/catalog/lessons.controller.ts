import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import {
  lessonInputSchema, lessonUpdateSchema, publishSchema,
  type LessonInput, type LessonUpdateInput, type PublishInput,
} from "@levelusp/contracts"
import { CurrentUser, OptionalAuth, Public, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { LessonsService } from "./lessons.service"

@ApiTags("catalog")
@Controller()
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  // Rotas fixas antes de "lessons/:id".
  @Public()
  @Get("lessons/summaries")
  summaries() {
    return this.lessons.summaries()
  }

  @Public()
  @Get("lessons")
  list() {
    return this.lessons.listPublished()
  }

  @Roles("teacher", "admin")
  @Get("teacher/lessons")
  teacherLessons(@CurrentUser() user: AuthUser) {
    return this.lessons.teacherLessons(user)
  }

  @Roles("teacher", "admin")
  @Get("teacher/metrics")
  metrics(@CurrentUser() user: AuthUser) {
    return this.lessons.metrics(user)
  }

  @Public()
  @OptionalAuth()
  @Get("lessons/:id")
  get(@CurrentUser() user: AuthUser | undefined, @Param("id", UuidPipe) id: string) {
    return this.lessons.get(user, id)
  }

  @Roles("teacher", "admin")
  @Get("lessons/:id/authoring")
  authoring(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    return this.lessons.authoring(user, id)
  }

  @Roles("teacher", "admin")
  @Post("lessons")
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(lessonInputSchema)) body: LessonInput) {
    return this.lessons.create(user, body)
  }

  @Roles("teacher", "admin")
  @Patch("lessons/:id")
  update(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(lessonUpdateSchema)) body: LessonUpdateInput) {
    return this.lessons.update(user, id, body)
  }

  @Roles("teacher", "admin")
  @HttpCode(204)
  @Delete("lessons/:id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    await this.lessons.remove(user, id)
  }

  @Roles("teacher", "admin")
  @Patch("lessons/:id/publish")
  publish(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(publishSchema)) body: PublishInput) {
    return this.lessons.publish(user, id, body.published)
  }
}
