import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { libraryCatalog, libraryRequests, profiles } from "@levelusp/db"
import type { LibraryCatalog, LibraryCategory, LibraryRequest } from "@levelusp/contracts"
import { InjectDb, type Database, type DbOrTx, type Tx } from "@/infra/database/database.module"

type CatalogRow = typeof libraryCatalog.$inferSelect
type RequestRow = typeof libraryRequests.$inferSelect

export function toCatalog(r: CatalogRow): LibraryCatalog {
  return {
    id: r.id, name: r.name, display_name: r.displayName, description: r.description, category: r.category as LibraryCategory,
    pyodide_native: r.pyodideNative, active: r.active, added_by: r.addedBy, created_at: r.createdAt,
  }
}

export function toLibraryRequest(r: RequestRow, requesterName?: string | null): LibraryRequest {
  return {
    id: r.id, requested_by: r.requestedBy, library_name: r.libraryName, display_name: r.displayName, description: r.description,
    use_case: r.useCase, status: r.status, reviewed_by: r.reviewedBy, review_notes: r.reviewNotes, created_at: r.createdAt,
    reviewed_at: r.reviewedAt, ...(requesterName !== undefined ? { requester_name: requesterName ?? "Desconhecido" } : {}),
  }
}

@Injectable()
export class LibraryRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  catalog(onlyActive: boolean) {
    return this.db
      .select()
      .from(libraryCatalog)
      .where(onlyActive ? eq(libraryCatalog.active, true) : undefined)
      .orderBy(asc(libraryCatalog.category), asc(libraryCatalog.displayName))
  }

  async setActive(id: string, active: boolean) {
    const [row] = await this.db.update(libraryCatalog).set({ active }).where(eq(libraryCatalog.id, id)).returning()
    return row
  }

  /** Insere (ou reativa/atualiza) a biblioteca no catálogo pelo nome do pacote. */
  upsertCatalog(tx: DbOrTx, v: typeof libraryCatalog.$inferInsert) {
    return tx
      .insert(libraryCatalog)
      .values(v)
      .onConflictDoUpdate({
        target: libraryCatalog.name,
        set: { displayName: v.displayName, description: v.description, category: v.category, pyodideNative: v.pyodideNative, active: true },
      })
  }

  async insertRequest(v: typeof libraryRequests.$inferInsert) {
    const [row] = await this.db.insert(libraryRequests).values(v).returning()
    return row!
  }

  pendingRequestFor(userId: string, libraryName: string) {
    return this.db.query.libraryRequests.findFirst({
      where: and(
        eq(libraryRequests.requestedBy, userId),
        eq(libraryRequests.status, "pending"),
        sql`lower(${libraryRequests.libraryName}) = ${libraryName.toLowerCase()}`,
      ),
      columns: { id: true },
    })
  }

  requestsBy(userId: string) {
    return this.db.select().from(libraryRequests).where(eq(libraryRequests.requestedBy, userId)).orderBy(desc(libraryRequests.createdAt))
  }

  allRequests() {
    return this.db
      .select({ request: libraryRequests, requesterName: profiles.fullName })
      .from(libraryRequests)
      .leftJoin(profiles, eq(profiles.id, libraryRequests.requestedBy))
      .orderBy(desc(libraryRequests.createdAt))
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn)
  }

  async lockRequest(tx: DbOrTx, id: string) {
    const [row] = await tx.select().from(libraryRequests).where(eq(libraryRequests.id, id)).for("update")
    return row
  }

  async review(tx: DbOrTx, id: string, patch: { status: "approved" | "rejected"; reviewedBy: string; reviewNotes: string | null }) {
    const [row] = await tx
      .update(libraryRequests)
      .set({ ...patch, reviewedAt: sql`now()` })
      .where(eq(libraryRequests.id, id))
      .returning()
    return row!
  }
}
