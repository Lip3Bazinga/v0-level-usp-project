import type {} from "multer"
import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiTags } from "@nestjs/swagger"
import type { Response } from "express"
import { Public } from "@/common/decorators/auth.decorators"
import { BadRequest } from "@/common/errors/app-error"
import { StorageService } from "./storage.service"

@ApiTags("files")
@Controller()
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /** Upload de imagem (capa/avatar). Qualquer usuário logado; 2 MB; tipo verificado pelos bytes. */
  @Post("uploads/images")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async upload(@UploadedFile() file?: Express.Multer.File): Promise<{ url: string }> {
    if (!file) throw BadRequest("Nenhum arquivo enviado.")
    return { url: await this.storage.saveImage(file.buffer) }
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
