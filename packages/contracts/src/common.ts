import { z } from "zod"

/** UUID v4/v7 genérico (validação de parâmetros de rota e corpo). */
export const uuidSchema = z.uuid()
export type Uuid = z.infer<typeof uuidSchema>

export interface ValidationIssue {
  path: string
  message: string
}

/** Erro padronizado devolvido pela API (RFC 7807 simplificado). */
export interface ApiErrorBody {
  statusCode: number
  /** Código estável para o cliente decidir o que fazer (ex.: "RATE_LIMITED"). */
  code: string
  /** Mensagem em pt-BR, segura para exibir ao usuário. */
  message: string
  /** Detalhes de validação por campo, quando aplicável. */
  issues?: ValidationIssue[]
  requestId?: string
}

/**
 * O texto, ou `undefined` quando ele é vazio ou ausente. Deixa explícito que "" conta
 * como "não informado": `nonEmpty(note.title) ?? "Sem título"` (em vez de `||`, que
 * esconde essa decisão e também engoliria outros valores falsy).
 */
export function nonEmpty(text: string | null | undefined): string | undefined {
  return text === null || text === undefined || text === "" ? undefined : text
}

/** Imagem enviada (`POST /uploads/images`): URL pública servida pela própria API. */
export interface UploadedImage {
  url: string
}

export interface LimitQueryOptions {
  defaultLimit: number
  maxLimit: number
}

/** Query string `?limit=` das listagens (o valor chega como texto e é convertido). */
export function limitQuerySchema({ defaultLimit, maxLimit }: LimitQueryOptions) {
  return z.object({ limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit) })
}
export type LimitQuery = z.infer<ReturnType<typeof limitQuerySchema>>

export const DIFFICULTIES = ["iniciante", "intermediario", "avancado"] as const
export const difficultySchema = z.enum(DIFFICULTIES)
export type Difficulty = z.infer<typeof difficultySchema>
