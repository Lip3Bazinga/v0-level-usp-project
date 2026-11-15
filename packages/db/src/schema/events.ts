import { bigserial, check, index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { EVENT_TYPES, type Json } from "@levelusp/contracts"
import { profiles } from "./profiles"
import { createdAt, isOneOf } from "./_helpers"

/**
 * Log de eventos do experimento de gamificação: só inserção (nenhuma rota altera ou
 * apaga). Quando a conta é apagada, o evento fica anônimo (`user_id` null) para
 * preservar a série do estudo sem dado pessoal.
 */
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    type: text("type", { enum: EVENT_TYPES }).notNull(),
    payload: jsonb("payload").$type<Record<string, Json>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    check("events_type_check", isOneOf(table.type, EVENT_TYPES)),
    index("events_user_created_idx").on(table.userId, table.createdAt),
    index("events_type_created_idx").on(table.type, table.createdAt),
  ],
)

/** Evento gravado (append-only). */
export type EventRow = typeof events.$inferSelect
/** Valores para registrar um evento. */
export type EventInsert = typeof events.$inferInsert
