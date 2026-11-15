import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import {
  stepPredictSchema, stepQuizSubmitSchema, stepSubmitSchema,
  type HintReveal, type LessonStepsProgress, type SolutionReveal, type StepCompleteResult, type StepPredictInput, type StepPredictResult,
  type StepQuizResult, type StepQuizSubmitInput, type StepSubmitInput, type StepSubmitResult,
} from "@levelusp/contracts"
import { CurrentUser } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { StepsService } from "./steps.service"

@ApiTags("learning")
@Controller("me/lessons/:id")
export class StepsController {
  constructor(private readonly steps: StepsService) {}

  @Get("progress")
  getMyProgress(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string): Promise<LessonStepsProgress> {
    return this.steps.getMyProgress(user, id)
  }

  @HttpCode(200)
  @Post("steps/:stepId/submit")
  submit(
    @CurrentUser() user: AuthUser,
    @Param("id", UuidPipe) id: string,
    @Param("stepId", UuidPipe) stepId: string,
    @Body(new ZodPipe(stepSubmitSchema)) body: StepSubmitInput,
  ): Promise<StepSubmitResult> {
    return this.steps.submit(user, id, stepId, body)
  }

  @HttpCode(200)
  @Post("steps/:stepId/predict")
  predict(
    @CurrentUser() user: AuthUser,
    @Param("id", UuidPipe) id: string,
    @Param("stepId", UuidPipe) stepId: string,
    @Body(new ZodPipe(stepPredictSchema)) body: StepPredictInput,
  ): Promise<StepPredictResult> {
    return this.steps.predict(user, id, stepId, body.output)
  }

  @HttpCode(200)
  @Post("steps/:stepId/hint")
  revealHint(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Param("stepId", UuidPipe) stepId: string): Promise<HintReveal> {
    return this.steps.revealHint(user, id, stepId)
  }

  @Get("steps/:stepId/hints")
  listRevealedHints(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Param("stepId", UuidPipe) stepId: string): Promise<HintReveal[]> {
    return this.steps.listRevealedHints(user, id, stepId)
  }

  @HttpCode(200)
  @Post("steps/:stepId/solution")
  revealSolution(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Param("stepId", UuidPipe) stepId: string): Promise<SolutionReveal> {
    return this.steps.revealSolution(user, id, stepId)
  }

  @HttpCode(200)
  @Post("steps/:stepId/complete")
  complete(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Param("stepId", UuidPipe) stepId: string): Promise<StepCompleteResult> {
    return this.steps.complete(user, id, stepId)
  }

  @HttpCode(200)
  @Post("steps/:stepId/quiz")
  submitQuiz(
    @CurrentUser() user: AuthUser,
    @Param("id", UuidPipe) id: string,
    @Param("stepId", UuidPipe) stepId: string,
    @Body(new ZodPipe(stepQuizSubmitSchema)) body: StepQuizSubmitInput,
  ): Promise<StepQuizResult> {
    return this.steps.submitQuiz(user, id, stepId, body.answers)
  }
}
