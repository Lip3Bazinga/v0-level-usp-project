import { Body, Controller, Delete, HttpCode, Param, Patch, Post, type PipeTransform } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { badgeInputSchema, badgeUpdateSchema, type BadgeInput, type BadgeUpdateInput } from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import { NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { AdminService } from "./admin.service"

/** Ids de badge são slugs (não UUID); formato inválido responde 404, como o UuidPipe. */
class BadgeIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== "string" || !/^[a-z0-9_-]{2,40}$/.test(value)) throw NotFound("Badge")
    return value
  }
}

@ApiTags("admin")
@Roles("admin")
@Controller("admin/badges")
export class AdminBadgesController {
  constructor(private readonly admin: AdminService) {}

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(badgeInputSchema)) body: BadgeInput) {
    return this.admin.createBadge(actor, body)
  }

  @Patch(":id")
  update(@CurrentUser() actor: AuthUser, @Param("id", BadgeIdPipe) id: string, @Body(new ZodPipe(badgeUpdateSchema)) body: BadgeUpdateInput) {
    return this.admin.updateBadge(actor, id, body)
  }

  @HttpCode(204)
  @Delete(":id")
  async remove(@CurrentUser() actor: AuthUser, @Param("id", BadgeIdPipe) id: string): Promise<void> {
    await this.admin.deleteBadge(actor, id)
  }
}
