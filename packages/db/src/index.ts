import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as schema from "./schema/index"

export * from "./schema/index"
export { schema }

export type Database = NodePgDatabase<typeof schema>

export interface DbHandle {
  db: Database
  pool: pg.Pool
  close: () => Promise<void>
}

export interface CreateDbOptions {
  max?: number
  applicationName?: string
}

const DEFAULT_POOL_SIZE = 10
const DEFAULT_APPLICATION_NAME = "levelusp"
const IDLE_CONNECTION_TIMEOUT_MS = 30_000

/** Cria o pool e a instância Drizzle. Um por processo. */
export function createDb(url: string, options: CreateDbOptions = {}): DbHandle {
  const pool = new pg.Pool({
    connectionString: url,
    max: options.max ?? DEFAULT_POOL_SIZE,
    application_name: options.applicationName ?? DEFAULT_APPLICATION_NAME,
    idleTimeoutMillis: IDLE_CONNECTION_TIMEOUT_MS,
  })
  const db = drizzle(pool, { schema, casing: "snake_case" })
  return { db, pool, close: () => pool.end() }
}
