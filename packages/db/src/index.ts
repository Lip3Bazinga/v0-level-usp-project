import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as schema from "./schema/index"

export * from "./schema/index"
export { isLocalDatabaseUrl, MIN_DEMO_PASSWORD_LENGTH, PUBLIC_DEMO_PASSWORD, resolveDemoPassword } from "./seed-policy"
export { schema }

/** Instância Drizzle tipada com o schema completo (consultas relacionais em `db.query.*`). */
export type Database = NodePgDatabase<typeof schema>

/**
 * Transação aberta por `db.transaction(async (tx) => …)`. Aceita as mesmas consultas do
 * {@link Database}; tudo o que roda nela é desfeito se o callback lançar.
 */
export type DbTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0]

/**
 * Onde uma consulta pode rodar: o banco (autocommit) ou uma transação em andamento.
 * Métodos de repositório que participam de transações recebem um `DbExecutor`
 * (padrão: o próprio banco), para o service decidir a fronteira transacional.
 */
export type DbExecutor = Database | DbTransaction

/** Conexão de um processo: o Drizzle, o pool subjacente e o encerramento ordenado. */
export interface DbHandle {
  db: Database
  pool: pg.Pool
  /** Fecha o pool; chamar uma vez, no desligamento do processo. */
  close: () => Promise<void>
}

/** Ajustes do pool de conexões; os padrões servem para a API em produção. */
export interface CreateDbOptions {
  /** Conexões simultâneas no pool (padrão: 10). */
  max?: number
  /** Nome exibido em `pg_stat_activity`, para identificar o processo no Postgres. */
  applicationName?: string
}

const DEFAULT_POOL_SIZE = 10
const DEFAULT_APPLICATION_NAME = "levelusp"
const IDLE_CONNECTION_TIMEOUT_MS = 30_000

/**
 * Cria o pool e a instância Drizzle (colunas em snake_case). Um por processo: cada
 * chamada abre um pool novo, que precisa ser fechado com `close()`.
 *
 * @param url URL de conexão PostgreSQL (`postgres://…`).
 */
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
