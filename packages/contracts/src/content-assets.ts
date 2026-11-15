import { z } from "zod"

/**
 * Imagens do conteúdo (`content/cursos/<curso>/<módulo>/assets/`): viajam no pacote
 * compilado em base64, são gravadas no banco pela importação e servidas pela rota
 * pública `GET /api/content/assets/:course/:module/:file`. Só imagens; SVG com
 * script, atributo de evento ou URL `javascript:` é recusado (ver {@link isSafeSvg}).
 */

/** Tipos de imagem aceitos, pela extensão do arquivo. */
export const CONTENT_ASSET_TYPES = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
} as const
/** Extensão de arquivo aceita num asset do conteúdo. */
export type ContentAssetExtension = keyof typeof CONTENT_ASSET_TYPES
/** Content-Type de um asset do conteúdo. */
export type ContentAssetType = (typeof CONTENT_ASSET_TYPES)[ContentAssetExtension]

/** Tamanho máximo de um asset, em bytes (antes do base64). */
export const MAX_CONTENT_ASSET_BYTES = 512 * 1024
/** Assets por pacote. */
export const MAX_CONTENT_ASSETS = 500
/** Soma dos assets de um pacote, em bytes (o corpo da importação aceita 20 MB). */
export const MAX_CONTENT_ASSETS_TOTAL_BYTES = 10 * 1024 * 1024
/** Prefixo (com o prefixo global da API) da rota pública que serve os assets. */
export const CONTENT_ASSETS_URL_PREFIX = "/api/content/assets"

const SLUG_SEGMENT = "[a-z0-9]+(?:-[a-z0-9]+)*"
const FILE_NAME = "[A-Za-z0-9][A-Za-z0-9_-]*(?:\\.[A-Za-z0-9_-]+)*\\.(?:svg|png|jpg|jpeg|webp|gif)"

/** Nome de arquivo de um asset: letras, dígitos, `-`, `_` e pontos internos, com extensão de imagem aceita. */
export const CONTENT_ASSET_FILE_PATTERN = new RegExp(`^${FILE_NAME}$`)
/** Um segmento de slug (curso ou módulo) no caminho de um asset. */
export const CONTENT_ASSET_SLUG_PATTERN = new RegExp(`^${SLUG_SEGMENT}$`)
/** Caminho de um asset no pacote e no banco: `<slug do curso>/<slug do módulo>/<arquivo>`. */
export const CONTENT_ASSET_PATH_PATTERN = new RegExp(`^${SLUG_SEGMENT}/${SLUG_SEGMENT}/${FILE_NAME}$`)

/** Content-Type pelo nome do arquivo; `undefined` quando a extensão não é aceita. */
export function contentAssetTypeOf(fileName: string): ContentAssetType | undefined {
  const extension = /\.([A-Za-z0-9]+)$/.exec(fileName)?.[1]?.toLowerCase()
  return extension !== undefined && isAssetExtension(extension) ? CONTENT_ASSET_TYPES[extension] : undefined
}

function isAssetExtension(extension: string): extension is ContentAssetExtension {
  return Object.hasOwn(CONTENT_ASSET_TYPES, extension)
}

/** Chave do asset: curso, módulo e arquivo, como no pacote e na URL pública. */
export function contentAssetPath(courseSlug: string, moduleSlug: string, fileName: string): string {
  return `${courseSlug}/${moduleSlug}/${fileName}`
}

/** URL pública do asset; `version` (trecho do hash do conteúdo) permite cache longo no navegador. */
export function contentAssetUrl(assetPath: string, version?: string): string {
  return `${CONTENT_ASSETS_URL_PREFIX}/${assetPath}${version === undefined ? "" : `?v=${version}`}`
}

/** Decodifica base64 padrão; null quando o texto não é base64 válido. */
export function decodeBase64(base64: string): Uint8Array | null {
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) return null
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

const ACTIVE_SVG_PATTERNS: readonly { pattern: RegExp; reason: string }[] = [
  { pattern: /<\s*(?:[A-Za-z0-9_-]+:)?script[\s>/]/i, reason: "elemento <script>" },
  { pattern: /[\s"'/]on[a-z]+\s*=/i, reason: "atributo de evento (on…=)" },
  { pattern: /<\s*(?:[A-Za-z0-9_-]+:)?(?:foreignObject|iframe|embed|object)[\s>/]/i, reason: "elemento que embute outro documento (foreignObject, iframe, embed, object)" },
  { pattern: /<!ENTITY/i, reason: "declaração de entidade" },
]

/** Entidades numéricas e controles que disfarçam `javascript:` e nomes de atributo (`&#106;avascript`, `java\tscript`). */
function unmaskSvg(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);?/gi, (_match, hex: string) => String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff)))
    .replace(/&#([0-9]+);?/g, (_match, decimal: string) => String.fromCodePoint(Math.min(parseInt(decimal, 10), 0x10ffff)))
    .replace(/&(?:colon|Tab|NewLine);/g, (entity) => (entity === "&colon;" ? ":" : ""))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
}

/**
 * Motivo pelo qual um SVG não pode ser servido (conteúdo ativo), ou null quando é seguro:
 * precisa ser UTF-8 com um elemento `<svg`, sem `<script>`, sem atributos `on…=`, sem URL
 * `javascript:`, sem `foreignObject`/`iframe`/`embed`/`object` e sem `<!ENTITY`.
 */
export function describeUnsafeSvg(bytes: Uint8Array): string | null {
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return "o arquivo não é texto UTF-8"
  }
  if (!/<svg[\s>]/i.test(text)) return "o arquivo não tem um elemento <svg>"
  const unmasked = unmaskSvg(text)
  for (const { pattern, reason } of ACTIVE_SVG_PATTERNS) {
    if (pattern.test(unmasked)) return reason
  }
  // O navegador ignora espaços e quebras dentro do esquema da URL (`java\nscript:`).
  return /javascript:/i.test(unmasked.replace(/\s+/g, "")) ? "URL javascript:" : null
}

/** true quando o SVG não tem conteúdo ativo ({@link describeUnsafeSvg}). */
export function isSafeSvg(bytes: Uint8Array): boolean {
  return describeUnsafeSvg(bytes) === null
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

const MAGIC_CHECKS: Readonly<Record<Exclude<ContentAssetType, "image/svg+xml">, (bytes: Uint8Array) => boolean>> = {
  "image/png": (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  "image/gif": (bytes) => startsWith(bytes, [0x47, 0x49, 0x46, 0x38]),
  "image/webp": (bytes) => startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8),
}

/**
 * Por que os bytes não servem como asset do tipo declarado, ou null quando servem: tamanho
 * dentro do limite, assinatura do formato (PNG, JPEG, GIF, WebP) ou SVG sem conteúdo ativo.
 */
export function describeInvalidAsset(contentType: ContentAssetType, bytes: Uint8Array): string | null {
  if (bytes.length === 0) return "arquivo vazio"
  if (bytes.length > MAX_CONTENT_ASSET_BYTES) return `arquivo com ${bytes.length} bytes (máximo ${MAX_CONTENT_ASSET_BYTES})`
  if (contentType === "image/svg+xml") {
    const reason = describeUnsafeSvg(bytes)
    return reason === null ? null : `SVG recusado: ${reason}`
  }
  return MAGIC_CHECKS[contentType](bytes) ? null : `o conteúdo não é ${contentType} (a extensão não corresponde aos bytes do arquivo)`
}

export const bundleAssetSchema = z.object({
  content_type: z.enum(["image/svg+xml", "image/png", "image/jpeg", "image/webp", "image/gif"]),
  /** Conteúdo do arquivo em base64 padrão. */
  base64: z.string().min(1).max(Math.ceil(MAX_CONTENT_ASSET_BYTES / 3) * 4),
})
/** Um asset no pacote: tipo e conteúdo em base64. */
export type BundleAsset = z.infer<typeof bundleAssetSchema>

/** Mapa `caminho → asset` do pacote, com cada arquivo conferido (caminho, tipo pela extensão, bytes e SVG seguro). */
export const bundleAssetsSchema = z.record(z.string().max(300), bundleAssetSchema).superRefine((assets, ctx) => {
  const entries = Object.entries(assets)
  if (entries.length > MAX_CONTENT_ASSETS) ctx.addIssue({ code: "custom", message: `assets demais no pacote (${entries.length}; máximo ${MAX_CONTENT_ASSETS})` })
  let totalBytes = 0
  for (const [assetPath, asset] of entries) {
    if (!CONTENT_ASSET_PATH_PATTERN.test(assetPath)) {
      ctx.addIssue({ code: "custom", path: [assetPath], message: "caminho de asset inválido (use <curso>/<módulo>/<arquivo>.svg|png|jpg|jpeg|webp|gif)" })
      continue
    }
    if (contentAssetTypeOf(assetPath) !== asset.content_type) {
      ctx.addIssue({ code: "custom", path: [assetPath, "content_type"], message: "content_type não corresponde à extensão do arquivo" })
      continue
    }
    const bytes = decodeBase64(asset.base64)
    if (bytes === null) {
      ctx.addIssue({ code: "custom", path: [assetPath, "base64"], message: "base64 inválido" })
      continue
    }
    totalBytes += bytes.length
    const problem = describeInvalidAsset(asset.content_type, bytes)
    if (problem !== null) ctx.addIssue({ code: "custom", path: [assetPath], message: problem })
  }
  if (totalBytes > MAX_CONTENT_ASSETS_TOTAL_BYTES) ctx.addIssue({ code: "custom", message: `assets grandes demais no total (${totalBytes} bytes; máximo ${MAX_CONTENT_ASSETS_TOTAL_BYTES})` })
})
/** Assets do pacote, validados. */
export type BundleAssets = z.infer<typeof bundleAssetsSchema>
