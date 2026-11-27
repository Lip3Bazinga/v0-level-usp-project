import { bigserial, check, index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { EVENT_TYPES, type Json } from "@levelusp/contracts"
import { profiles } from "./profiles"
import { createdAt, isOneOf } from "./_helpers"

/**
 * Log de eventos do experimento de gamificação: só inserção. Nenhuma rota altera ou
 * apaga, e o gatilho `events_append_only` (migração 0006) recusa DELETE e UPDATE no
 * banco. A única alteração aceita é a anonimização: quando a conta é apagada, a FK
 * põe `user_id` em null e o resto da linha fica igual, preservando a série do estudo
 * sem dado pessoal. Só a ação referencial da FK passa (`pg_trigger_depth() > 1`): um
 * `UPDATE ... SET user_id = NULL` direto da sessão é recusado. Limite conhecido:
 * TRUNCATE não passa pelo gatilho (é o que os testes e2e usam para zerar o banco).
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
