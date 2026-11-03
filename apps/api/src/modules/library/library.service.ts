import { Injectable } from "@nestjs/common"
import type { LibraryCatalog, LibraryRequest, LibraryRequestInput, ReviewLibraryRequestInput } from "@levelusp/contracts"
import type { LibraryRequestRow, DbTransaction } from "@levelusp/db"
import { Conflict, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { TransactionRunner } from "@/infra/database/database.module"
import { AuditService } from "../audit/audit.service"
import { NotificationsService } from "../notifications/notifications.service"
import { toLibraryCatalog, toLibraryRequest } from "./library.mapper"
import { LibraryRepository } from "./library.repository"

type CatalogEntry = NonNullable<ReviewLibraryRequestInput["catalog"]>

@Injectable()
export class LibraryService {
  constructor(
    private readonly repo: LibraryRepository,
    private readonly transactions: TransactionRunner,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async listCatalog(onlyActive = true): Promise<LibraryCatalog[]> {
    return (await this.repo.listCatalog(onlyActive)).map(toLibraryCatalog)
  }

  async setCatalogActive(actor: AuthUser, id: string, active: boolean): Promise<void> {
    const library = await this.repo.setCatalogActive(id, active)
    if (!library) throw NotFound("Biblioteca")
    await this.audit.log(actor, active ? "library.activate" : "library.deactivate", library.name, { id }, "info")
  }

  async createRequest(user: AuthUser, input: LibraryRequestInput): Promise<LibraryRequest> {
    this.rateLimit.consume(RATE_LIMITS.libraryRequest, user.id)
    if (await this.repo.findPendingRequest(user.id, input.library_name)) {
      throw Conflict("Você já tem uma solicitação pendente para esta biblioteca.", "REQUEST_PENDING")
    }
    const request = await this.repo.createRequest({
      requestedBy: user.id,
      libraryName: input.library_name,
      displayName: input.display_name ?? null,
      description: input.description ?? null,
      useCase: input.use_case ?? null,
    })
    return toLibraryRequest(request)
  }

  async listMyRequests(user: AuthUser): Promise<LibraryRequest[]> {
    return (await this.repo.listRequestsByUser(user.id)).map((request) => toLibraryRequest(request))
  }

  async listRequests(): Promise<LibraryRequest[]> {
    return (await this.repo.listRequests()).map(({ request, requesterName }) => toLibraryRequest(request, requesterName))
  }

  /** Aprova/rejeita; se aprovado com `catalog`, insere (ou reativa) a biblioteca no catálogo na mesma transação. */
  async reviewRequest(actor: AuthUser, id: string, input: ReviewLibraryRequestInput): Promise<LibraryRequest> {
    const isApproved = input.status === "approved"
    const catalogEntry = isApproved ? input.catalog : undefined
    const reviewed = await this.transactions.run(async (tx: DbTransaction) => {
      const pending = await this.repo.lockRequest(id, tx)
      if (!pending) throw NotFound("Solicitação")
      if (pending.status !== "pending") throw Conflict("Esta solicitação já foi revisada.", "ALREADY_REVIEWED")
      const updated = await this.repo.reviewRequest(id, { status: input.status, reviewedBy: actor.id, reviewNotes: input.review_notes ?? null }, tx)
      if (catalogEntry) await this.addToCatalog(pending, catalogEntry, actor, tx)
      await this.notifications.notify(
        pending.requestedBy,
        {
          title: isApproved ? `Biblioteca ${pending.libraryName} aprovada` : `Biblioteca ${pending.libraryName} não aprovada`,
          body: input.review_notes ?? (isApproved ? "Sua solicitação foi aprovada." : "Sua solicitação foi recusada."),
          kind: isApproved ? "success" : "warning",
        },
        tx,
      )
      return updated
    })
    await this.audit.log(actor, isApproved ? "library.approve" : "library.reject", reviewed.libraryName, {
      request_id: id,
      added_to_catalog: Boolean(catalogEntry),
    })
    return toLibraryRequest(reviewed)
  }

  private addToCatalog(request: LibraryRequestRow, entry: CatalogEntry, actor: AuthUser, tx: DbTransaction): Promise<void> {
    return this.repo.upsertCatalog(
      {
        name: request.libraryName,
        displayName: entry.display_name,
        description: entry.description ?? null,
        category: entry.category,
        pyodideNative: entry.pyodide_native,
        addedBy: actor.id,
        active: true,
      },
      tx,
    )
  }
}
