import { Body, Controller, Get, HttpCode, Param, Post, Put } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { saveSnapshotSchema, submitCodeSchema, type SaveSnapshotInput, type SubmitCodeInput, type LessonCompletion, type LessonProgress, type LessonSnapshot, type SubmissionResult } from "@levelusp/contracts"
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
  listMyProgress(@CurrentUser() user: AuthUser): Promise<LessonProgress[]> {
    return this.learning.listMyProgress(user.id)
  }

  @Get("me/progress/completed")
  listMyCompletedLessonIds(@CurrentUser() user: AuthUser): Promise<string[]> {
    return this.learning.listMyCompletedLessonIds(user.id)
  }

  @Get("lessons/:id/snapshot")
  getSnapshot(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string): Promise<LessonSnapshot> {
    return this.learning.getSnapshot(user, id)
  }

  @HttpCode(204)
  @Put("lessons/:id/snapshot")
  async updateSnapshot(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(saveSnapshotSchema)) body: SaveSnapshotInput): Promise<void> {
    await this.learning.updateSnapshot(user, id, body.files)
  }

  @HttpCode(200)
  @Post("lessons/:id/submissions")
  submit(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(submitCodeSchema)) body: SubmitCodeInput): Promise<SubmissionResult> {
    return this.learning.submit(user, id, body.files)
  }

  @HttpCode(200)
  @Post("lessons/:id/complete")
  completeTheory(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string): Promise<LessonCompletion> {
    return this.learning.completeTheory(user, id)
  }
}
