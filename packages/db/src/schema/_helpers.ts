import { sql, type SQL } from "drizzle-orm"
import type { HasDefault, IsPrimaryKey, NotNull } from "drizzle-orm"
import { timestamp, uuid, type AnyPgColumn, type PgTimestampStringBuilderInitial, type PgUUIDBuilderInitial } from "drizzle-orm/pg-core"

/** Chave primária UUID gerada pelo banco (`gen_random_uuid()`). */
type UuidPrimaryKeyColumn = HasDefault<IsPrimaryKey<NotNull<PgUUIDBuilderInitial<"id">>>>
/** `timestamptz` lido como texto ISO: a API repassa o valor sem converter para Date. */
type TimestampColumn<TName extends string> = PgTimestampStringBuilderInitial<TName>
/** `timestamptz not null default now()`. */
type AuditTimestampColumn<TName extends string> = HasDefault<NotNull<TimestampColumn<TName>>>

/** Coluna `id` padrão das tabelas. */
export const id = (): UuidPrimaryKeyColumn => uuid("id").primaryKey().defaultRandom()
/** Data e hora com fuso, em modo string (ver {@link TimestampColumn}). */
export const timestampTz = <TName extends string>(name: TName): TimestampColumn<TName> => timestamp(name, { withTimezone: true, mode: "string" })
/** Momento da criação da linha. */
export const createdAt = (): AuditTimestampColumn<"created_at"> => timestampTz("created_at").notNull().defaultNow()
/** Momento da última alteração (o valor inicial é o da criação; quem atualiza grava `now()`). */
export const updatedAt = (): AuditTimestampColumn<"updated_at"> => timestampTz("updated_at").notNull().defaultNow()

/** CHECK `coluna in ('a','b',…)` gerado a partir da lista de valores do contrato. */
export function isOneOf(column: AnyPgColumn, values: readonly string[]): SQL {
  return sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(","))})`
}
