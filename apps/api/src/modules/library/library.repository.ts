import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { libraryCatalog, libraryRequests, profiles, type LibraryCatalogInsert, type LibraryRequestInsert } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { DbTransaction, DbExecutor, LibraryCatalogRow, LibraryRequestRow } from "@levelusp/db"

/** Decisão do admin sobre um pedido de biblioteca. */
export interface LibraryReview {
  status: "approved" | "rejected"
  reviewedBy: string
  reviewNotes: string | null
}

/** Pedido de biblioteca com o nome de quem pediu (null se o perfil foi apagado). */
export interface LibraryRequestWithRequesterRow {
  request: LibraryRequestRow
  requesterName: string | null
}

/** Catálogo de bibliotecas e pedidos dos professores. */
@Injectable()
export class LibraryRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Catálogo por categoria e nome; `onlyActive` esconde as desativadas. */
  listCatalog(onlyActive: boolean): Promise<LibraryCatalogRow[]> {
    return this.db
      .select()
      .from(libraryCatalog)
      .where(onlyActive ? eq(libraryCatalog.active, true) : undefined)
      .orderBy(asc(libraryCatalog.category), asc(libraryCatalog.displayName))
  }

  /** Ativa ou desativa uma biblioteca; `undefined` quando não existe. */
  async setCatalogActive(id: string, active: boolean): Promise<LibraryCatalogRow | undefined> {
    const [library] = await this.db.update(libraryCatalog).set({ active }).where(eq(libraryCatalog.id, id)).returning()
    return library
  }

  /** Insere (ou reativa/atualiza) a biblioteca no catálogo pelo nome do pacote. */
  async upsertCatalog(library: LibraryCatalogInsert, executor: DbExecutor): Promise<void> {
    await executor
      .insert(libraryCatalog)
      .values(library)
      .onConflictDoUpdate({
        target: libraryCatalog.name,
        set: { displayName: library.displayName, description: library.description, category: library.category, pyodideNative: library.pyodideNative, active: true },
      })
  }

  /** Grava um pedido de biblioteca. */
  async createRequest(request: LibraryRequestInsert): Promise<LibraryRequestRow> {
    return requireRow(await this.db.insert(libraryRequests).values(request).returning(), "library_requests")
  }

  /** Pedido pendente do mesmo professor para a mesma biblioteca (nome sem diferenciar maiúsculas). */
  findPendingRequest(userId: string, libraryName: string): Promise<Pick<LibraryRequestRow, "id"> | undefined> {
    return this.db.query.libraryRequests.findFirst({
      where: and(
        eq(libraryRequests.requestedBy, userId),
        eq(libraryRequests.status, "pending"),
        sql`lower(${libraryRequests.libraryName}) = ${libraryName.toLowerCase()}`,
      ),
      columns: { id: true },
    })
  }

  /** Pedidos do professor, mais recentes primeiro. */
  listRequestsByUser(userId: string): Promise<LibraryRequestRow[]> {
    return this.db.select().from(libraryRequests).where(eq(libraryRequests.requestedBy, userId)).orderBy(desc(libraryRequests.createdAt))
  }

  /** Todos os pedidos com o nome de quem pediu, mais recentes primeiro. */
  listRequests(): Promise<LibraryRequestWithRequesterRow[]> {
    return this.db
      .select({ request: libraryRequests, requesterName: profiles.fullName })
      .from(libraryRequests)
      .leftJoin(profiles, eq(profiles.id, libraryRequests.requestedBy))
      .orderBy(desc(libraryRequests.createdAt))
  }

  /** Lê o pedido com `FOR UPDATE`, travando-o até o fim da transação da revisão. */
  async lockRequest(id: string, tx: DbTransaction): Promise<LibraryRequestRow | undefined> {
    const [request] = await tx.select().from(libraryRequests).where(eq(libraryRequests.id, id)).for("update")
    return request
  }

  /** Grava a decisão e a data da revisão. */
  async reviewRequest(id: string, review: LibraryReview, executor: DbExecutor): Promise<LibraryRequestRow> {
    return requireRow(
      await executor.update(libraryRequests).set({ ...review, reviewedAt: sql`now()` }).where(eq(libraryRequests.id, id)).returning(),
      "library_requests",
    )
  }
}
