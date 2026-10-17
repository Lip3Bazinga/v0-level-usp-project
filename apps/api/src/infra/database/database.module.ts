import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from "@nestjs/common"
import { createDb, type Database, type DbHandle } from "@levelusp/db"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"

export const DB_HANDLE = Symbol("DB_HANDLE")
export const DB = Symbol("DB")

/** Injeta o Drizzle: `constructor(@InjectDb() private readonly db: Database)`. */
export const InjectDb = () => Inject(DB)

export type { Database }
/** Transação Drizzle (mesma interface de consulta do `db`). */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]
/** Executor de consultas: o banco ou uma transação em andamento. */
export type DbOrTx = Database | Tx

/**
 * Abre transações para services que coordenam vários repositórios: cada
 * repositório recebe o `tx` e a regra de negócio fica fora da camada de SQL.
 */
@Injectable()
export class TransactionRunner {
  constructor(@InjectDb() private readonly db: Database) {}

  run<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(work)
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DB_HANDLE,
      inject: [ENV],
      useFactory: (env: Env): DbHandle => createDb(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX, applicationName: `levelusp-api-${env.APP_ENV}` }),
    },
    { provide: DB, inject: [DB_HANDLE], useFactory: (handle: DbHandle): Database => handle.db },
    TransactionRunner,
  ],
  exports: [DB, DB_HANDLE, TransactionRunner],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB_HANDLE) private readonly handle: DbHandle) {}

  async onApplicationShutdown() {
    await this.handle.close()
  }
}
