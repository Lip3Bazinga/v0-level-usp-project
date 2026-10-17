import type {} from "multer"
import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiTags } from "@nestjs/swagger"
import type { Response } from "express"
import { CurrentUser, Public } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { BadRequest } from "@/common/errors/app-error"
import { StorageService } from "./storage.service"

@ApiTags("files")
@Controller()
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Upload de imagem (capa/avatar). Qualquer usuário logado; 2 MB; tipo verificado pelos bytes. */
  @Post("uploads/images")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File): Promise<{ url: string }> {
    if (!file) throw BadRequest("Nenhum arquivo enviado.")
    this.rateLimit.consume(`upload:${user.id}`, 30, 3_600_000, "Limite de envios de imagem atingido. Tente mais tarde.")
    return { url: await this.storage.saveImage(file.buffer, user.id) }
  }

  @Public()
  @Get("files/:name")
  async file(@Param("name") name: string, @Res() res: Response) {
    const { data, mime } = await this.storage.read(name)
    res.setHeader("Content-Type", mime)
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Security-Policy", "default-src 'none'")
    res.send(data)
  }
}
