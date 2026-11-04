import { Inject, Injectable } from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { BadRequest, Forbidden, NotFound } from "@/common/errors/app-error"
import { IMAGE_MIME, isImageExtension, sniffImage } from "./image-signature"
import { UploadsRepository } from "./uploads.repository"

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const PUBLIC_FILES_PATH = "/api/files/"
const STORED_NAME_PATTERN = /^[0-9a-f-]{36}\.(png|jpg|webp)$/
const LOCAL_URL_PATTERN = /^\/api\/files\/([0-9a-f-]{36}\.(png|jpg|webp))$/
const IMAGE_FILE_MODE = 0o640

/** Arquivo lido do volume de uploads, com o tipo derivado da extensão gravada. */
export interface StoredFile {
  data: Buffer
  mime: string
}

/**
 * Armazenamento de imagens (capas de curso, avatares) em disco local — um
 * volume Docker no notebook. A interface permite trocar por S3 depois.
 */
@Injectable()
export class StorageService {
  private readonly directory: string

  constructor(
    @Inject(ENV) env: Env,
    private readonly uploads: UploadsRepository,
  ) {
    this.directory = path.resolve(env.UPLOAD_DIR)
  }

  /** Salva uma imagem validada e devolve a URL pública relativa (/api/files/...). */
  async storeImage(bytes: Buffer, ownerId: string): Promise<string> {
    if (bytes.length > MAX_IMAGE_BYTES) throw BadRequest("A imagem pode ter no máximo 2 MB.", "FILE_TOO_LARGE")
    const extension = sniffImage(bytes)
    if (!extension) throw BadRequest("Envie uma imagem PNG, JPEG ou WebP.", "INVALID_IMAGE")
    await mkdir(this.directory, { recursive: true })
    const name = `${randomUUID()}.${extension}`
    await writeFile(path.join(this.directory, name), bytes, { mode: IMAGE_FILE_MODE })
    await this.uploads.create(name, ownerId, bytes.length)
    return `${PUBLIC_FILES_PATH}${name}`
  }

  async read(name: string): Promise<StoredFile> {
    const extension = name.split(".").pop() ?? ""
    if (!STORED_NAME_PATTERN.test(name) || !isImageExtension(extension)) throw NotFound("Arquivo")
    try {
      return { data: await readFile(path.join(this.directory, name)), mime: IMAGE_MIME[extension] }
    } catch {
      throw NotFound("Arquivo")
    }
  }

  /**
   * URLs aceitas em capas/avatares: imagem enviada pelo próprio usuário
   * (/api/files/...) ou endereço https externo (dados legados do Supabase).
   * Impede apontar para o arquivo de outra pessoa e depois apagá-lo.
   */
  async assertUsableUrl(url: string | null | undefined, ownerId: string): Promise<void> {
    if (!url || url.startsWith("https://")) return
    const name = localFileName(url)
    if (!name) throw BadRequest("Endereço de imagem inválido.", "INVALID_IMAGE_URL")
    if (!(await this.uploads.isOwnedBy(name, ownerId))) throw Forbidden("Use uma imagem enviada por você.")
  }

  /**
   * Avatar: só imagem enviada pelo próprio usuário (ou nenhuma). URL externa fica de fora:
   * o avatar aparece no ranking público, e uma imagem num servidor do aluno registraria o
   * IP (dado pessoal) de cada visitante — rastreamento que a CSP `img-src https:` não impede.
   *
   * @throws AppError 400 `INVALID_IMAGE_URL` (externa ou malformada), 403 imagem de outra pessoa.
   */
  async assertOwnUpload(url: string | null | undefined, ownerId: string): Promise<void> {
    if (!url) return
    if (!localFileName(url)) throw BadRequest("Envie a imagem pelo LevelUSP (endereços externos não são aceitos).", "INVALID_IMAGE_URL")
    await this.assertUsableUrl(url, ownerId)
  }

  /** Apaga a imagem só se ela pertence a `ownerId` (nunca arquivos de terceiros). */
  async delete(url: string | null | undefined, ownerId: string | null): Promise<void> {
    const name = localFileName(url)
    if (!name || !ownerId) return
    if (await this.uploads.deleteOwned(name, ownerId)) await unlink(path.join(this.directory, name)).catch(() => undefined)
  }
}

function localFileName(url: string | null | undefined): string | null {
  return LOCAL_URL_PATTERN.exec(url ?? "")?.[1] ?? null
}
