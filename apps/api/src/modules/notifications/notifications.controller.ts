import { Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { limitQuerySchema, type LimitQuery } from "@levelusp/contracts"
import { CurrentUser } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { NotificationsService } from "./notifications.service"

const notificationsQuery = limitQuerySchema({ defaultLimit: 30, maxLimit: 100 })

@ApiTags("notifications")
@Controller("me/notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query(new ZodPipe(notificationsQuery)) query: LimitQuery) {
    return this.notifications.list(user.id, query.limit)
  }

  @HttpCode(204)
  @Post("read-all")
  async markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    await this.notifications.markAllRead(user.id)
  }

  @HttpCode(204)
  @Post(":id/read")
  async markRead(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string): Promise<void> {
    await this.notifications.markRead(user.id, id)
  }
}
