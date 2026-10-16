import { Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { z } from "zod"
import { CurrentUser } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { NotificationsService } from "./notifications.service"

const limitSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(30) })

@ApiTags("notifications")
@Controller("me/notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query(new ZodPipe(limitSchema)) q: { limit: number }) {
    return this.notifications.list(user.id, q.limit)
  }

  @HttpCode(204)
  @Post("read-all")
  async readAll(@CurrentUser() user: AuthUser): Promise<void> {
    await this.notifications.markAllRead(user.id)
  }

  @HttpCode(204)
  @Post(":id/read")
  async read(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string): Promise<void> {
    await this.notifications.markRead(user.id, id)
  }
}
