import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { limitQuerySchema, updateMyProfileSchema, type LimitQuery, type UpdateMyProfileInput } from "@levelusp/contracts"
import { CurrentUser, Public } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { UsersService } from "./users.service"

const leaderboardQuery = limitQuerySchema({ defaultLimit: 50, maxLimit: 100 })

@ApiTags("users")
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch("me/profile")
  updateMyProfile(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateMyProfileSchema)) body: UpdateMyProfileInput) {
    return this.users.updateMyProfile(user.id, body)
  }

  @Public()
  @Get("leaderboard")
  listLeaderboard(@Query(new ZodPipe(leaderboardQuery)) query: LimitQuery) {
    return this.users.listLeaderboard(query.limit)
  }

  @Public()
  @Get("users/by-username/:username")
  getByUsername(@Param("username") username: string) {
    return this.users.getByUsername(username)
  }

  @Public()
  @Get("users/:id/activity")
  listActivity(@Param("id", UuidPipe) id: string) {
    return this.users.listActivity(id)
  }

  @Public()
  @Get("users/:id/badges")
  listUserBadges(@Param("id", UuidPipe) id: string) {
    return this.users.listUserBadges(id)
  }

  @Public()
  @Get("badges")
  listBadges() {
    return this.users.listBadges()
  }
}
