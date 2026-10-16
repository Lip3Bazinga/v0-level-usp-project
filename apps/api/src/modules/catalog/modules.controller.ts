import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { moduleInputSchema, moduleUpdateSchema, type ModuleInput, type ModuleUpdateInput } from "@levelusp/contracts"
import { CurrentUser, Public, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { ModulesService } from "./modules.service"

@ApiTags("catalog")
@Controller("modules")
export class ModulesController {
  constructor(private readonly modules: ModulesService) {}

  @Public()
  @Get()
  list() {
    return this.modules.list()
  }

  @Public()
  @Get("lesson-counts")
  lessonCounts() {
    return this.modules.lessonCounts()
  }

  @Roles("admin")
  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(moduleInputSchema)) body: ModuleInput) {
    return this.modules.create(user, body)
  }

  @Roles("admin")
  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(moduleUpdateSchema)) body: ModuleUpdateInput) {
    return this.modules.update(user, id, body)
  }

  @Roles("admin")
  @HttpCode(204)
  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    await this.modules.remove(user, id)
  }
}
