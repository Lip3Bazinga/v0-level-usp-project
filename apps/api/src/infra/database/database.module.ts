import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common"
import { createDb, type Database, type DbHandle } from "@levelusp/db"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"

export const DB_HANDLE = Symbol("DB_HANDLE")
export const DB = Symbol("DB")

/** Injeta o Drizzle: `constructor(@InjectDb() private readonly db: Database)`. */
export const InjectDb = () => Inject(DB)

@Global()
@Module({
  providers: [
    {
      provide: DB_HANDLE,
      inject: [ENV],
      useFactory: (env: Env): DbHandle => createDb(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX, applicationName: `levelusp-api-${env.APP_ENV}` }),
    },
    { provide: DB, inject: [DB_HANDLE], useFactory: (h: DbHandle): Database => h.db },
  ],
  exports: [DB, DB_HANDLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB_HANDLE) private readonly handle: DbHandle) {}

  async onApplicationShutdown() {
    await this.handle.close()
  }
}

export type { Database }
/** Transação Drizzle (mesma interface de consulta do `db`). */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]
/** Executor de consultas: o banco ou uma transação em andamento. */
export type DbOrTx = Database | Tx
