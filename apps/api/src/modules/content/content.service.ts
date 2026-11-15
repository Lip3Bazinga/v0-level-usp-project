import { Injectable, Logger } from "@nestjs/common"
import type { ContentBundle, ContentImportSummary } from "@levelusp/contracts"
import { ContentBundleError, importContentBundle, type DbTransaction } from "@levelusp/db"
import { Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { TransactionRunner } from "@/infra/database/database.module"
import { AuditService } from "../audit/audit.service"

/**
 * Importação do pacote de conteúdo compilado (`pnpm content:build`): a mesma função do seed
 * (`importContentBundle`), com upsert por slug, numa transação (tudo ou nada).
 */
@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name)

  constructor(
    private readonly transactions: TransactionRunner,
    private readonly rateLimit: RateLimitService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Grava o pacote inteiro; idempotente (reimportar o mesmo pacote deixa o banco igual e
   * preserva os ids, logo o progresso dos alunos). O conteúdo novo fica assinado pelo admin.
   *
   * @throws AppError 422 `INVALID_BUNDLE` quando o pacote cita um slug (pré-requisito, curso de trilha) que não existe; 429 no limite.
   */
  async importBundle(actor: AuthUser, bundle: ContentBundle): Promise<ContentImportSummary> {
    this.rateLimit.consume(RATE_LIMITS.contentImport, actor.id)
    try {
      const summary = await this.transactions.run((tx: DbTransaction) => importContentBundle(tx, bundle, { authorId: actor.id }))
      await this.audit.log(actor, "content.import", "content", { ...summary, generated_at: bundle.generated_at ?? null }, "warning")
      this.logger.log({ actorId: actor.id, ...summary }, "pacote de conteúdo importado")
      return summary
    } catch (error) {
      // A mensagem do ContentBundleError é escrita por nós (cita só slugs do pacote): segura para o admin.
      if (error instanceof ContentBundleError) throw Unprocessable(`Pacote inválido: ${error.message}`, "INVALID_BUNDLE")
      throw error
    }
  }
}
