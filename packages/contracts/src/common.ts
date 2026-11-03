import { z } from "zod"

/** UUID v4/v7 genérico (validação de parâmetros de rota e corpo). */
export const uuidSchema = z.uuid()
/** UUID já validado por {@link uuidSchema}. */
export type Uuid = z.infer<typeof uuidSchema>

/** Problema de validação de um campo; `path` usa pontos (`items.0.title`). */
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
 * Trechos presentes nos segredos de exemplo/dev/CI publicados no repositório.
 * Um segredo de homolog/prod que contenha algum deles é tratado como vazado.
 */
export const PUBLIC_SECRET_MARKERS = ["__gerar__", "runner-token", "0123456789", "changeme", "trocar"] as const

/** Diz se o segredo parece um valor de exemplo publicado (ver `PUBLIC_SECRET_MARKERS`). */
export function isPublishedSecret(value: string): boolean {
  const lowered = value.toLowerCase()
  return PUBLIC_SECRET_MARKERS.some((marker) => lowered.includes(marker))
}

/**
 * O texto, ou `undefined` quando ele é vazio ou ausente. Deixa explícito que "" conta
 * como "não informado": `nonEmpty(note.title) ?? "Sem título"` (em vez de `||`, que
 * esconde essa decisão e também engoliria outros valores falsy).
 */
export function nonEmpty(text: string | null | undefined): string | undefined {
  return text === null || text === undefined || text === "" ? undefined : text
}

/** Confirmação de uma ação sem dados de retorno (ex.: e-mail de redefinição enviado). */
export interface OkResponse {
  ok: true
}

/** Imagem enviada (`POST /uploads/images`): URL pública servida pela própria API. */
export interface UploadedImage {
  url: string
}

/** Limites de `?limit=` de uma listagem: valor usado quando ausente e teto aceito. */
export interface LimitQueryOptions {
  defaultLimit: number
  maxLimit: number
}

/** Schema de `?limit=`: inteiro entre 1 e o máximo da listagem, com padrão. */
export type LimitQuerySchema = z.ZodObject<{ limit: z.ZodDefault<z.ZodCoercedNumber> }>

/** Query string `?limit=` das listagens (o valor chega como texto e é convertido). */
export function limitQuerySchema({ defaultLimit, maxLimit }: LimitQueryOptions): LimitQuerySchema {
  return z.object({ limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit) })
}
/** Query `?limit=` já convertida para número e dentro dos limites. */
export type LimitQuery = z.infer<LimitQuerySchema>

export const DIFFICULTIES = ["iniciante", "intermediario", "avancado"] as const
export const difficultySchema = z.enum(DIFFICULTIES)
/** Nível de dificuldade de lições e cursos. */
export type Difficulty = z.infer<typeof difficultySchema>
