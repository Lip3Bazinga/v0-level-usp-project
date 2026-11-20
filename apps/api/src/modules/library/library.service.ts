import { Injectable } from "@nestjs/common"
import {
  findManifestLibrary, normalizeLibraryName,
  type LibraryCatalog, type LibraryManifestPending, type LibraryRequest, type LibraryRequestInput, type ReviewLibraryRequestInput,
} from "@levelusp/contracts"
import type { DbTransaction } from "@levelusp/db"
import { Conflict, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { TransactionRunner } from "@/infra/database/database.module"
import { AuditService } from "../audit/audit.service"
import { NotificationsService } from "../notifications/notifications.service"
import { buildManifestSnippet, reviewNotification, snippetInput } from "./library.domain"
import { toLibraryCatalog, toLibraryRequest, UNKNOWN_REQUESTER } from "./library.mapper"
import { LibraryRepository } from "./library.repository"

/** Catálogo de bibliotecas Python e o fluxo de pedido (professor) e revisão (admin). */
@Injectable()
export class LibraryService {
  constructor(
    private readonly repo: LibraryRepository,
    private readonly transactions: TransactionRunner,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /**
   * Catálogo. Por padrão (visão do professor) só as bibliotecas ativas E presentes no manifesto — o que não está
   * nele não pode ser publicado; a visão do admin (`onlyActive = false`) mostra tudo o que o banco tem.
   */
  async listCatalog(onlyActive = true): Promise<LibraryCatalog[]> {
    const rows = await this.repo.listCatalog(onlyActive)
    return (onlyActive ? rows.filter((row) => findManifestLibrary(row.name)) : rows).map(toLibraryCatalog)
  }

  /**
   * Liga ou desliga uma biblioteca do catálogo (auditado).
   *
   * @throws AppError 404 biblioteca inexistente.
   */
  async setCatalogActive(actor: AuthUser, id: string, active: boolean): Promise<void> {
    const library = await this.repo.setCatalogActive(id, active)
    if (!library) throw NotFound("Biblioteca")
    await this.audit.log(actor, active ? "library.activate" : "library.deactivate", library.name, { id }, "info")
  }

  /**
   * Registra o pedido do professor.
   *
   * @throws AppError 409 `ALREADY_AVAILABLE` quando a biblioteca já está no manifesto, 409 `REQUEST_PENDING` quando
   * já há pedido pendente da mesma biblioteca, 429 pedidos demais.
   */
  async createRequest(user: AuthUser, input: LibraryRequestInput): Promise<LibraryRequest> {
    this.rateLimit.consume(RATE_LIMITS.libraryRequest, user.id)
    if (findManifestLibrary(input.library_name)) {
      throw Conflict("Esta biblioteca já está disponível: escolha-a no catálogo da lição.", "ALREADY_AVAILABLE")
    }
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

  /** Pedidos do próprio professor. */
  async listMyRequests(user: AuthUser): Promise<LibraryRequest[]> {
    return (await this.repo.listRequestsByUser(user.id)).map((request) => toLibraryRequest(request))
  }

  /** Todos os pedidos, com o nome de quem pediu (para o admin). */
  async listRequests(): Promise<LibraryRequest[]> {
    return (await this.repo.listRequests()).map(({ request, requesterName }) => toLibraryRequest(request, requesterName))
  }

  /**
   * Pedidos aprovados cuja biblioteca ainda não está no manifesto (uma linha por biblioteca, a aprovação mais
   * recente), cada um com o rascunho da entrada para o PR. Quando o PR entra no manifesto, o pedido some daqui.
   */
  async listManifestPending(): Promise<LibraryManifestPending[]> {
    const seen = new Set<string>()
    const pending: LibraryManifestPending[] = []
    for (const { request, requesterName } of await this.repo.listApprovedRequests()) {
      const key = normalizeLibraryName(request.libraryName)
      if (seen.has(key) || findManifestLibrary(request.libraryName)) continue
      seen.add(key)
      pending.push({
        request_id: request.id,
        library_name: request.libraryName,
        display_name: request.displayName,
        description: request.description,
        use_case: request.useCase,
        requester_name: requesterName ?? UNKNOWN_REQUESTER,
        reviewed_at: request.reviewedAt,
        manifest_snippet: buildManifestSnippet({
          libraryName: request.libraryName, displayName: request.displayName, description: request.description, category: "general", browser: true,
        }),
      })
    }
    return pending
  }

  /**
   * Aprova ou recusa o pedido. Aprovar NÃO mexe no catálogo de produção: a biblioteca só passa a existir quando
   * um PR a acrescenta ao manifesto (`library-manifest.ts`); a resposta traz o rascunho dessa entrada em
   * `manifest_snippet` (usando `catalog`, se enviado, para categoria e disponibilidade no navegador).
   *
   * @throws AppError 404 pedido inexistente; 409 `ALREADY_REVIEWED`.
   */
  async reviewRequest(actor: AuthUser, id: string, input: ReviewLibraryRequestInput): Promise<LibraryRequest> {
    const isApproved = input.status === "approved"
    const reviewed = await this.transactions.run(async (tx: DbTransaction) => {
      const pending = await this.repo.lockRequest(id, tx)
      if (!pending) throw NotFound("Solicitação")
      if (pending.status !== "pending") throw Conflict("Esta solicitação já foi revisada.", "ALREADY_REVIEWED")
      const updated = await this.repo.reviewRequest(id, { status: input.status, reviewedBy: actor.id, reviewNotes: input.review_notes ?? null }, tx)
      await this.notifications.notify(
        pending.requestedBy,
        {
          title: isApproved ? `Biblioteca ${pending.libraryName} aprovada` : `Biblioteca ${pending.libraryName} não aprovada`,
          body: input.review_notes ?? reviewNotification(isApproved, findManifestLibrary(pending.libraryName) !== undefined),
          kind: isApproved ? "success" : "warning",
        },
        tx,
      )
      return updated
    })
    const isInManifest = findManifestLibrary(reviewed.libraryName) !== undefined
    await this.audit.log(actor, isApproved ? "library.approve" : "library.reject", reviewed.libraryName, { request_id: id, in_manifest: isInManifest })
    const snippet = isApproved && !isInManifest ? buildManifestSnippet(snippetInput(reviewed, input.catalog)) : undefined
    return { ...toLibraryRequest(reviewed), ...(snippet === undefined ? {} : { manifest_snippet: snippet }) }
  }
}
