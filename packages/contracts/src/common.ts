import { z } from "zod"

/** UUID v4/v7 genérico (validação de parâmetros de rota e corpo). */
export const uuidSchema = z.uuid()
export type Uuid = z.infer<typeof uuidSchema>

/** Erro padronizado devolvido pela API (RFC 7807 simplificado). */
export interface ApiErrorBody {
  statusCode: number
  /** Código estável para o cliente decidir o que fazer (ex.: "RATE_LIMITED"). */
  code: string
  /** Mensagem em pt-BR, segura para exibir ao usuário. */
  message: string
  /** Detalhes de validação por campo, quando aplicável. */
  issues?: { path: string; message: string }[]
  requestId?: string
}

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type Pagination = z.infer<typeof paginationSchema>

export type Difficulty = "iniciante" | "intermediario" | "avancado"
export const difficultySchema = z.enum(["iniciante", "intermediario", "avancado"])
