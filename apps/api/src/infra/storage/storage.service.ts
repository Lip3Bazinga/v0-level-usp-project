import { Inject, Injectable } from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { BadRequest, NotFound } from "@/common/errors/app-error"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const NAME = /^[0-9a-f-]{36}\.(png|jpg|webp)$/

/** Assinaturas binárias: não confiamos no Content-Type enviado pelo cliente. */
function sniffImage(buf: Buffer): "png" | "jpg" | "webp" | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png"
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg"
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp"
  return null
}

export const IMAGE_MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" }

/**
 * Armazenamento de imagens (capas de curso, avatares) em disco local — um
 * volume Docker no notebook. A interface permite trocar por S3 depois.
 */
@Injectable()
export class StorageService {
  private readonly dir: string

  constructor(@Inject(ENV) env: Env) {
    this.dir = path.resolve(env.UPLOAD_DIR)
  }

  /** Salva uma imagem validada e devolve a URL pública relativa (/api/files/...). */
  async saveImage(buf: Buffer): Promise<string> {
    if (buf.length > MAX_IMAGE_BYTES) throw BadRequest("A imagem pode ter no máximo 2 MB.", "FILE_TOO_LARGE")
    const ext = sniffImage(buf)
    if (!ext) throw BadRequest("Envie uma imagem PNG, JPEG ou WebP.", "INVALID_IMAGE")
    await mkdir(this.dir, { recursive: true })
    const name = `${randomUUID()}.${ext}`
    await writeFile(path.join(this.dir, name), buf, { mode: 0o640 })
    return `/api/files/${name}`
  }

  async read(name: string): Promise<{ data: Buffer; mime: string }> {
    if (!NAME.test(name)) throw NotFound("Arquivo")
    try {
      const data = await readFile(path.join(this.dir, name))
      return { data, mime: IMAGE_MIME[name.split(".").pop()!]! }
    } catch {
      throw NotFound("Arquivo")
    }
  }

  async remove(url: string | null | undefined): Promise<void> {
    const name = url?.split("/").pop()
    if (name && NAME.test(name)) await unlink(path.join(this.dir, name)).catch(() => undefined)
  }
}
