import { Controller, Get, Param, Query, Req, Res } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import type { Request, Response } from "express"
import { Public } from "@/common/decorators/auth.decorators"
import { ContentAssetsService } from "./content-assets.service"

/** A URL com `?v=<hash>` certo nunca muda de conteúdo: o navegador pode guardar por um ano. */
const VERSIONED_CACHE = "public, max-age=31536000, immutable"
/** Sem versão (ou com versão antiga) o conteúdo pode mudar numa reimportação: cache curto com revalidação por ETag. */
const UNVERSIONED_CACHE = "public, max-age=300, must-revalidate"
/** Menor trecho do hash aceito como versão. */
const MIN_VERSION_LENGTH = 8
/**
 * Um SVG aberto direto na aba é um documento: sem script, sem rede, sem formulário e em sandbox.
 * `style-src 'unsafe-inline'` deixa os estilos internos do próprio desenho funcionarem.
 */
const ASSET_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox"

@ApiTags("files")
@Controller("content/assets")
export class ContentAssetsController {
  constructor(private readonly assets: ContentAssetsService) {}

  /** Imagem do conteúdo (pública: as narrativas das lições publicadas a citam). */
  @Public()
  @Get(":course/:module/:file")
  async get(
    @Param("course") course: string,
    @Param("module") module: string,
    @Param("file") file: string,
    @Query("v") version: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const asset = await this.assets.get(course, module, file)
    const etag = `"${asset.sha256}"`
    const isCurrentVersion = typeof version === "string" && version.length >= MIN_VERSION_LENGTH && asset.sha256.startsWith(version)
    response.setHeader("Content-Type", asset.contentType)
    response.setHeader("X-Content-Type-Options", "nosniff")
    response.setHeader("Content-Security-Policy", ASSET_CSP)
    response.setHeader("Content-Disposition", "inline")
    response.setHeader("Cache-Control", isCurrentVersion ? VERSIONED_CACHE : UNVERSIONED_CACHE)
    response.setHeader("ETag", etag)
    if (request.headers["if-none-match"] === etag) {
      response.status(304).end()
      return
    }
    response.send(asset.data)
  }
}
