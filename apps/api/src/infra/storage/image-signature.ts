export const IMAGE_EXTENSIONS = ["png", "jpg", "webp"] as const
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number]

export const IMAGE_MIME: Record<ImageExtension, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" }

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff])

/** Assinaturas binárias: não confiamos no Content-Type enviado pelo cliente. */
export function sniffImage(bytes: Buffer): ImageExtension | null {
  if (bytes.length > PNG_SIGNATURE.length && bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return "png"
  if (bytes.length > JPEG_SIGNATURE.length && bytes.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) return "jpg"
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp"
  return null
}

export function isImageExtension(value: string): value is ImageExtension {
  return IMAGE_EXTENSIONS.some((extension) => extension === value)
}
