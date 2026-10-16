import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import {
  libraryCatalogToggleSchema, libraryRequestInputSchema, reviewLibraryRequestSchema,
  type LibraryRequestInput, type ReviewLibraryRequestInput,
} from "@levelusp/contracts"
import { CurrentUser, Public, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { LibraryService } from "./library.service"

@ApiTags("library")
@Controller()
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Public()
  @Get("library")
  catalog() {
    return this.library.catalog(true)
  }

  @Roles("teacher", "admin")
  @Post("library/requests")
  request(@CurrentUser() user: AuthUser, @Body(new ZodPipe(libraryRequestInputSchema)) body: LibraryRequestInput) {
    return this.library.request(user, body)
  }

  @Roles("teacher", "admin")
  @Get("me/library/requests")
  myRequests(@CurrentUser() user: AuthUser) {
    return this.library.myRequests(user)
  }

  @Roles("admin")
  @Get("admin/library")
  fullCatalog() {
    return this.library.catalog(false)
  }

  @Roles("admin")
  @HttpCode(204)
  @Patch("admin/library/:id")
  async toggle(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(libraryCatalogToggleSchema)) body: { active: boolean }) {
    await this.library.setActive(user, id, body.active)
  }

  @Roles("admin")
  @Get("admin/library/requests")
  allRequests() {
    return this.library.allRequests()
  }

  @Roles("admin")
  @HttpCode(200)
  @Post("admin/library/requests/:id/review")
  review(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(reviewLibraryRequestSchema)) body: ReviewLibraryRequestInput) {
    return this.library.review(user, id, body)
  }
}
