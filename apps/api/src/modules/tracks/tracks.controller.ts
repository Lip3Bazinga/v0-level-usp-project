import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import {
  slugSchema, trackInputSchema, trackUpdateSchema,
  type Track, type TrackCertificate, type TrackCertificateIssue, type TrackInput, type TrackUpdateInput, type TrackWithCourses,
} from "@levelusp/contracts"
import { CurrentUser, OptionalAuth, Public, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { TracksService } from "./tracks.service"

@ApiTags("tracks")
@Controller()
export class TracksController {
  constructor(private readonly tracks: TracksService) {}

  @Public()
  @Get("tracks")
  list(): Promise<Track[]> {
    return this.tracks.list()
  }

  @Public()
  @OptionalAuth()
  @Get("tracks/:slug")
  getBySlug(@CurrentUser() user: AuthUser | undefined, @Param("slug", new ZodPipe(slugSchema)) slug: string): Promise<TrackWithCourses> {
    return this.tracks.getBySlug(user, slug)
  }

  @Get("me/track-certificates")
  listMyCertificates(@CurrentUser() user: AuthUser): Promise<TrackCertificate[]> {
    return this.tracks.listMyCertificates(user)
  }

  /** Idempotente: 200 tanto na emissão quanto quando já existia (`already_issued`). */
  @HttpCode(200)
  @Post("me/tracks/:id/certificate")
  issueCertificate(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string): Promise<TrackCertificateIssue> {
    return this.tracks.issueCertificate(user, id)
  }

  @Roles("admin")
  @Get("admin/tracks")
  listAll(): Promise<Track[]> {
    return this.tracks.listAll()
  }

  @Roles("admin")
  @Post("admin/tracks")
  create(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(trackInputSchema)) body: TrackInput): Promise<TrackWithCourses> {
    return this.tracks.create(actor, body)
  }

  @Roles("admin")
  @Patch("admin/tracks/:id")
  update(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(trackUpdateSchema)) body: TrackUpdateInput): Promise<TrackWithCourses> {
    return this.tracks.update(actor, id, body)
  }

  @Roles("admin")
  @HttpCode(204)
  @Delete("admin/tracks/:id")
  async delete(@CurrentUser() actor: AuthUser, @Param("id", UuidPipe) id: string): Promise<void> {
    await this.tracks.delete(actor, id)
  }
}
