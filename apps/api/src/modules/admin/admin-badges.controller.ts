import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, type PipeTransform } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { BADGE_ID_PATTERN, badgeInputSchema, badgeUpdateSchema, type BadgeInput, type BadgeUpdateInput, type Badge } from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import { NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { UsersService } from "../users/users.service"
import { AdminService } from "./admin.service"

/** Ids de badge são slugs (não UUID); formato inválido responde 404, como o UuidPipe. */
class BadgeIdPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== "string" || !BADGE_ID_PATTERN.test(value)) throw NotFound("Badge")
    return value
  }
}

@ApiTags("admin")
@Roles("admin")
@Controller("admin/badges")
export class AdminBadgesController {
  constructor(
    private readonly admin: AdminService,
    private readonly users: UsersService,
  ) {}

  /** Todas as badges, inclusive inativas (a rota pública /badges mostra só as ativas). */
  @Get()
  listBadges(): Promise<Badge[]> {
    return this.users.listBadges(true)
  }

  @Post()
  createBadge(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(badgeInputSchema)) body: BadgeInput): Promise<Badge> {
    return this.admin.createBadge(actor, body)
  }

  @Patch(":id")
  updateBadge(@CurrentUser() actor: AuthUser, @Param("id", BadgeIdPipe) id: string, @Body(new ZodPipe(badgeUpdateSchema)) body: BadgeUpdateInput): Promise<Badge> {
    return this.admin.updateBadge(actor, id, body)
  }

  @HttpCode(204)
  @Delete(":id")
  async deleteBadge(@CurrentUser() actor: AuthUser, @Param("id", BadgeIdPipe) id: string): Promise<void> {
    await this.admin.deleteBadge(actor, id)
  }
}
