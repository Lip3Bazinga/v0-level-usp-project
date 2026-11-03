import type {} from "multer"
import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiTags } from "@nestjs/swagger"
import type { Response } from "express"
import type { UploadedImage } from "@levelusp/contracts"
import { CurrentUser, Public } from "@/common/decorators/auth.decorators"
import { BadRequest } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { MAX_IMAGE_BYTES, StorageService } from "./storage.service"

/**
 * Limites do multipart: um arquivo e nenhum campo de texto. Sem `fields`/`parts`, o multer
 * aceitaria campos sem limite de quantidade (1 MB cada) e os guardaria em memória.
 */
const UPLOAD_LIMITS = { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 1, fieldSize: 0 } as const

/** Os nomes são UUIDs: o conteúdo de um nome nunca muda. */
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable"

@ApiTags("files")
@Controller()
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Upload de imagem (capa/avatar). Qualquer usuário logado; 2 MB; tipo verificado pelos bytes. */
  @Post("uploads/images")
  @UseInterceptors(FileInterceptor("file", { limits: UPLOAD_LIMITS }))
  async uploadImage(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File): Promise<UploadedImage> {
    if (!file) throw BadRequest("Nenhum arquivo enviado.")
    this.rateLimit.consume(RATE_LIMITS.imageUpload, user.id)
    return { url: await this.storage.storeImage(file.buffer, user.id) }
  }

  @Public()
  @Get("files/:name")
  async readFile(@Param("name") name: string, @Res() response: Response): Promise<void> {
    const { data, mime } = await this.storage.read(name)
    response.setHeader("Content-Type", mime)
    response.setHeader("Cache-Control", IMMUTABLE_CACHE)
    response.setHeader("X-Content-Type-Options", "nosniff")
    response.setHeader("Content-Security-Policy", "default-src 'none'")
    response.send(data)
  }
}
