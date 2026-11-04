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

  // Rotas fixas antes de "lessons/:id": o Express casa na ordem de declaração.
  @Public()
  @Get("lessons/summaries")
  listSummaries() {
    return this.lessons.listSummaries()
  }

  @Public()
  @Get("lessons")
  listPublished() {
    return this.lessons.listPublished()
  }

  @Roles("teacher", "admin")
  @Get("teacher/lessons")
  listOwned(@CurrentUser() user: AuthUser) {
    return this.lessons.listOwned(user)
  }

  @Roles("teacher", "admin")
  @Get("teacher/metrics")
  listMetrics(@CurrentUser() user: AuthUser) {
    return this.lessons.listMetrics(user)
  }

  @Public()
  @OptionalAuth()
  @Get("lessons/:id")
  get(@CurrentUser() user: AuthUser | undefined, @Param("id", UuidPipe) id: string) {
    return this.lessons.get(user, id)
  }

  @Roles("teacher", "admin")
  @Get("lessons/:id/authoring")
  getForAuthoring(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    return this.lessons.getForAuthoring(user, id)
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
  async delete(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    await this.lessons.delete(user, id)
  }

  @Roles("teacher", "admin")
  @Patch("lessons/:id/publish")
  setPublished(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(publishSchema)) body: PublishInput) {
    return this.lessons.setPublished(user, id, body.published)
  }
}
