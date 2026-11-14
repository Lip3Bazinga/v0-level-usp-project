import { Injectable, Logger } from "@nestjs/common"
import {
  CONTENT_ASSET_FILE_PATTERN, CONTENT_ASSET_SLUG_PATTERN, contentAssetPath, contentAssetTypeOf, decodeBase64, describeInvalidAsset, type ContentAssetType,
} from "@levelusp/contracts"
import { NotFound } from "@/common/errors/app-error"
import { ContentAssetsRepository } from "./content-assets.repository"

/** Uma imagem pronta para a resposta HTTP. */
export interface ServedAsset {
  data: Buffer
  contentType: ContentAssetType
  /** SHA-256 do conteúdo, em hex (ETag e versão da URL). */
  sha256: string
}

/**
 * Leitura pública das imagens do conteúdo. O caminho pedido só vira consulta quando cada
 * parte tem o formato esperado (slug, slug, nome de arquivo de imagem), e o conteúdo é
 * conferido de novo antes de sair: tipo pela extensão, assinatura dos bytes e SVG sem
 * conteúdo ativo — mesmo que alguém grave uma linha direto no banco.
 */
@Injectable()
export class ContentAssetsService {
  private readonly logger = new Logger(ContentAssetsService.name)

  constructor(private readonly repo: ContentAssetsRepository) {}

  /**
   * Imagem de `<curso>/<módulo>/<arquivo>`.
   *
   * @throws AppError 404 caminho fora do formato, asset inexistente ou conteúdo que não passa na conferência.
   */
  async get(courseSlug: string, moduleSlug: string, fileName: string): Promise<ServedAsset> {
    const expectedType = contentAssetTypeOf(fileName)
    if (!CONTENT_ASSET_SLUG_PATTERN.test(courseSlug) || !CONTENT_ASSET_SLUG_PATTERN.test(moduleSlug) || !CONTENT_ASSET_FILE_PATTERN.test(fileName) || !expectedType) {
      throw NotFound("Arquivo")
    }
    const assetPath = contentAssetPath(courseSlug, moduleSlug, fileName)
    const asset = await this.repo.findByPath(assetPath)
    if (!asset) throw NotFound("Arquivo")
    const bytes = decodeBase64(asset.dataBase64)
    const problem = bytes === null ? "base64 inválido" : asset.contentType !== expectedType ? "tipo diferente da extensão" : describeInvalidAsset(expectedType, bytes)
    if (bytes === null || problem !== null) {
      this.logger.warn({ assetPath, problem }, "asset de conteúdo recusado na leitura")
      throw NotFound("Arquivo")
    }
    return { data: Buffer.from(bytes), contentType: expectedType, sha256: asset.sha256 }
  }
}
