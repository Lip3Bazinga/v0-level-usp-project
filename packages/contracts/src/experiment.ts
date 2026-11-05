import { z } from "zod"
import { jsonSchema, type Json } from "./grading"

/**
 * Experimento de gamificação (pedido da auditoria): cada participante recebe um
 * grupo e o cliente registra eventos de uso num log append-only (`events`), que
 * o admin exporta em CSV. Não existe rota de alteração ou exclusão de evento.
 */

export const EXPERIMENT_CONDITIONS = ["gamificada", "controle"] as const
export const experimentConditionSchema = z.enum(EXPERIMENT_CONDITIONS)
/** Grupo do experimento: `controle` usa a plataforma sem XP, nível, sequência, badges e ranking na UI. */
export type ExperimentCondition = z.infer<typeof experimentConditionSchema>

export const setExperimentConditionSchema = z.object({ experiment_condition: experimentConditionSchema.nullable() })
/** Corpo de `PATCH /admin/users/:id/experiment-condition` (null tira o usuário do experimento). */
export type SetExperimentConditionInput = z.infer<typeof setExperimentConditionSchema>

/** Tipos de evento aceitos por `POST /me/events` (lista fechada: qualquer outro é recusado). */
export const EVENT_TYPES = [
  "lesson_viewed", "step_submitted", "step_completed", "hint_revealed", "solution_viewed", "lesson_completed",
  "quiz_answered", "exam_started", "exam_submitted", "certificate_issued", "login",
] as const
export const eventTypeSchema = z.enum(EVENT_TYPES)
/** Tipo de um evento do experimento. */
export type EventType = z.infer<typeof eventTypeSchema>

/** Tamanho máximo do `payload` serializado em JSON (UTF-8). */
export const MAX_EVENT_PAYLOAD_BYTES = 4096
/** Eventos por lote em `POST /me/events`. */
export const MAX_EVENTS_PER_BATCH = 50

/** Bytes de um texto em UTF-8 (o limite do payload é medido como o Postgres o guarda). */
function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export const eventPayloadSchema = z
  .record(z.string().max(64), jsonSchema)
  .refine((payload) => utf8ByteLength(JSON.stringify(payload)) <= MAX_EVENT_PAYLOAD_BYTES, `payload maior que ${MAX_EVENT_PAYLOAD_BYTES} bytes`)
/** Dados livres do evento (ids da lição/passo, nota…), limitados a {@link MAX_EVENT_PAYLOAD_BYTES}. */
export type EventPayload = z.infer<typeof eventPayloadSchema>

export const eventInputSchema = z.object({
  type: eventTypeSchema,
  payload: eventPayloadSchema.default({}),
})
/** Um evento enviado pelo cliente; o servidor acrescenta o usuário da sessão e o instante. */
export type EventInput = z.infer<typeof eventInputSchema>

export const eventsBatchSchema = z.object({
  events: z.array(eventInputSchema).min(1).max(MAX_EVENTS_PER_BATCH),
})
/** Corpo de `POST /me/events`: lote de até {@link MAX_EVENTS_PER_BATCH} eventos. */
export type EventsBatchInput = z.infer<typeof eventsBatchSchema>

/** Evento gravado, como sai na exportação do admin; `user_id` é null quando a conta foi apagada. */
export interface ExperimentEvent {
  id: number
  user_id: string | null
  type: EventType
  payload: Record<string, Json>
  created_at: string
}
