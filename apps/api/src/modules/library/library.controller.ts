import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import {
  libraryCatalogToggleSchema, libraryRequestInputSchema, reviewLibraryRequestSchema,
  type LibraryCatalogToggleInput, type LibraryRequestInput, type ReviewLibraryRequestInput, type LibraryCatalog, type LibraryRequest } from "@levelusp/contracts"
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
  listCatalog(): Promise<LibraryCatalog[]> {
    return this.library.listCatalog(true)
  }

  @Roles("teacher", "admin")
  @Post("library/requests")
  createRequest(@CurrentUser() user: AuthUser, @Body(new ZodPipe(libraryRequestInputSchema)) body: LibraryRequestInput): Promise<LibraryRequest> {
    return this.library.createRequest(user, body)
  }

  @Roles("teacher", "admin")
  @Get("me/library/requests")
  listMyRequests(@CurrentUser() user: AuthUser): Promise<LibraryRequest[]> {
    return this.library.listMyRequests(user)
  }

  @Roles("admin")
  @Get("admin/library")
  listFullCatalog(): Promise<LibraryCatalog[]> {
    return this.library.listCatalog(false)
  }

  @Roles("admin")
  @HttpCode(204)
  @Patch("admin/library/:id")
  async setCatalogActive(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(libraryCatalogToggleSchema)) body: LibraryCatalogToggleInput): Promise<void> {
    await this.library.setCatalogActive(user, id, body.active)
  }

  @Roles("admin")
  @Get("admin/library/requests")
  listRequests(): Promise<LibraryRequest[]> {
    return this.library.listRequests()
  }

  @Roles("admin")
  @HttpCode(200)
  @Post("admin/library/requests/:id/review")
  reviewRequest(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(reviewLibraryRequestSchema)) body: ReviewLibraryRequestInput): Promise<LibraryRequest> {
    return this.library.reviewRequest(user, id, body)
  }
}
