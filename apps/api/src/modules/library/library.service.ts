import { Injectable } from "@nestjs/common"
import type { LibraryCatalog, LibraryRequest, LibraryRequestInput, ReviewLibraryRequestInput } from "@levelusp/contracts"
import { Conflict, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { AuditService } from "../audit/audit.service"
import { NotificationsService } from "../notifications/notifications.service"
import { LibraryRepository, toCatalog, toLibraryRequest } from "./library.repository"

@Injectable()
export class LibraryService {
  constructor(
    private readonly repo: LibraryRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async catalog(onlyActive = true): Promise<LibraryCatalog[]> {
    return (await this.repo.catalog(onlyActive)).map(toCatalog)
  }

  async setActive(actor: AuthUser, id: string, active: boolean): Promise<void> {
    const row = await this.repo.setActive(id, active)
    if (!row) throw NotFound("Biblioteca")
    await this.audit.log(actor, active ? "library.activate" : "library.deactivate", row.name, { id }, "info")
  }

  async request(user: AuthUser, input: LibraryRequestInput): Promise<LibraryRequest> {
    this.rateLimit.consume(`library.request:${user.id}`, 20, 60 * 60_000, "Muitas solicitações seguidas. Tente mais tarde.")
    if (await this.repo.pendingRequestFor(user.id, input.library_name)) {
      throw Conflict("Você já tem uma solicitação pendente para esta biblioteca.", "REQUEST_PENDING")
    }
    const row = await this.repo.insertRequest({
      requestedBy: user.id,
      libraryName: input.library_name,
      displayName: input.display_name ?? null,
      description: input.description ?? null,
      useCase: input.use_case ?? null,
    })
    return toLibraryRequest(row)
  }

  async myRequests(user: AuthUser): Promise<LibraryRequest[]> {
    return (await this.repo.requestsBy(user.id)).map((r) => toLibraryRequest(r))
  }

  async allRequests(): Promise<LibraryRequest[]> {
    return (await this.repo.allRequests()).map((r) => toLibraryRequest(r.request, r.requesterName))
  }

  /** Aprova/rejeita; se aprovado com `catalog`, insere (ou reativa) a biblioteca no catálogo na mesma transação. */
  async review(actor: AuthUser, id: string, input: ReviewLibraryRequestInput): Promise<LibraryRequest> {
    const result = await this.repo.transaction(async (tx) => {
      const req = await this.repo.lockRequest(tx, id)
      if (!req) throw NotFound("Solicitação")
      if (req.status !== "pending") throw Conflict("Esta solicitação já foi revisada.", "ALREADY_REVIEWED")
      const updated = await this.repo.review(tx, id, { status: input.status, reviewedBy: actor.id, reviewNotes: input.review_notes ?? null })
      const addToCatalog = input.status === "approved" && input.catalog
      if (addToCatalog) {
        await this.repo.upsertCatalog(tx, {
          name: req.libraryName,
          displayName: input.catalog!.display_name,
          description: input.catalog!.description ?? null,
          category: input.catalog!.category,
          pyodideNative: input.catalog!.pyodide_native,
          addedBy: actor.id,
          active: true,
        })
      }
      const approved = input.status === "approved"
      await this.notifications.notify(
        req.requestedBy,
        {
          title: approved ? `Biblioteca ${req.libraryName} aprovada` : `Biblioteca ${req.libraryName} não aprovada`,
          body: input.review_notes ?? (approved ? "Sua solicitação foi aprovada." : "Sua solicitação foi recusada."),
          kind: approved ? "success" : "warning",
        },
        tx,
      )
      return { updated, addedToCatalog: Boolean(addToCatalog) }
    })
    await this.audit.log(actor, input.status === "approved" ? "library.approve" : "library.reject", result.updated.libraryName, {
      request_id: id,
      added_to_catalog: result.addedToCatalog,
    })
    return toLibraryRequest(result.updated)
  }
}
