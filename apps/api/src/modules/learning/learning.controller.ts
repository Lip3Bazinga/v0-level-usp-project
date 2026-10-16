import { Body, Controller, Get, HttpCode, Param, Post, Put } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { saveSnapshotSchema, submitCodeSchema, type SaveSnapshotInput, type SubmitCodeInput } from "@levelusp/contracts"
import { CurrentUser } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { LearningService } from "./learning.service"

@ApiTags("learning")
@Controller()
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get("me/progress")
  progress(@CurrentUser() user: AuthUser) {
    return this.learning.myProgress(user.id)
  }

  @Get("me/progress/completed")
  completed(@CurrentUser() user: AuthUser) {
    return this.learning.completedLessonIds(user.id)
  }

  @Get("lessons/:id/snapshot")
  snapshot(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    return this.learning.getSnapshot(user, id)
  }

  @HttpCode(204)
  @Put("lessons/:id/snapshot")
  async save(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(saveSnapshotSchema)) body: SaveSnapshotInput) {
    await this.learning.saveSnapshot(user, id, body.files)
  }

  @HttpCode(200)
  @Post("lessons/:id/submissions")
  submit(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(submitCodeSchema)) body: SubmitCodeInput) {
    return this.learning.submit(user, id, body.files)
  }

  @HttpCode(200)
  @Post("lessons/:id/complete")
  complete(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    return this.learning.completeTheory(user, id)
  }
}
