import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { z } from "zod"
import { updateMyProfileSchema, type UpdateMyProfileInput } from "@levelusp/contracts"
import { CurrentUser, Public } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { UsersService } from "./users.service"

const limitSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) })

@ApiTags("users")
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch("me/profile")
  updateMe(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateMyProfileSchema)) body: UpdateMyProfileInput) {
    return this.users.updateMe(user.id, body)
  }

  @Public()
  @Get("leaderboard")
  leaderboard(@Query(new ZodPipe(limitSchema)) q: { limit: number }) {
    return this.users.leaderboard(q.limit)
  }

  @Public()
  @Get("users/by-username/:username")
  byUsername(@Param("username") username: string) {
    return this.users.byUsername(username)
  }

  @Public()
  @Get("users/:id/activity")
  activity(@Param("id", UuidPipe) id: string) {
    return this.users.activity(id)
  }

  @Public()
  @Get("users/:id/badges")
  userBadges(@Param("id", UuidPipe) id: string) {
    return this.users.userBadges(id)
  }

  @Public()
  @Get("badges")
  badges() {
    return this.users.badges()
  }
}
