import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from "@nestjs/common"
import { createDb, type Database, type DbHandle, type DbTransaction } from "@levelusp/db"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"

/** Token do {@link DbHandle} (pool + Drizzle); só o módulo o usa para fechar o pool. */
export const DB_HANDLE = Symbol("DB_HANDLE")
/** Token da instância {@link Database} injetada nos repositórios. */
export const DB = Symbol("DB")

/** Injeta o Drizzle: `constructor(@InjectDb() private readonly db: Database)`. */
export const InjectDb = (): ParameterDecorator => Inject(DB)

export type { Database, DbExecutor, DbTransaction } from "@levelusp/db"

/**
 * Abre transações para services que coordenam vários repositórios: cada
 * repositório recebe o `tx` e a regra de negócio fica fora da camada de SQL.
 */
@Injectable()
export class TransactionRunner {
  constructor(@InjectDb() private readonly db: Database) {}

  /**
   * Executa `work` numa transação: confirma quando a promessa resolve e desfaz
   * tudo (e repassa o erro) quando ela rejeita.
   */
  run<T>(work: (tx: DbTransaction) => Promise<T>): Promise<T> {
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

  async onApplicationShutdown(): Promise<void> {
    await this.handle.close()
  }
}
