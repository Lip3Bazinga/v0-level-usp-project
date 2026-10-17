import { sql, type SQL } from "drizzle-orm"
import { timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core"

export const id = () => uuid("id").primaryKey().defaultRandom()
export const timestampTz = (name: string) => timestamp(name, { withTimezone: true, mode: "string" })
export const createdAt = () => timestampTz("created_at").notNull().defaultNow()
export const updatedAt = () => timestampTz("updated_at").notNull().defaultNow()

/** CHECK `coluna in ('a','b',…)` gerado a partir da lista de valores do contrato. */
export function isOneOf(column: AnyPgColumn, values: readonly string[]): SQL {
  return sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(","))})`
}
