import { Body, Controller, HttpCode, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import {
  draftStepSubmitSchema, draftStepVerifySchema,
  type DraftStepSubmitInput, type DraftStepVerifyInput, type DraftStepVerifyResult, type StepSubmitResult,
} from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { DraftStepsService } from "./draft-steps.service"

@ApiTags("authoring")
@Controller("teacher/draft-steps")
export class DraftStepsController {
  constructor(private readonly draftSteps: DraftStepsService) {}

  @Roles("teacher", "admin")
  @HttpCode(200)
  @Post("verify")
  verify(@CurrentUser() user: AuthUser, @Body(new ZodPipe(draftStepVerifySchema)) body: DraftStepVerifyInput): Promise<DraftStepVerifyResult> {
    return this.draftSteps.verify(user, body)
  }

  @Roles("teacher", "admin")
  @HttpCode(200)
  @Post("submit")
  submit(@CurrentUser() user: AuthUser, @Body(new ZodPipe(draftStepSubmitSchema)) body: DraftStepSubmitInput): Promise<StepSubmitResult> {
    return this.draftSteps.submit(user, body)
  }
}
