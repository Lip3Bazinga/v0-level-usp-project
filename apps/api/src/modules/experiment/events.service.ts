import { Injectable, Logger } from "@nestjs/common"
import type { EventInput, EventType, ExperimentCondition, Json } from "@levelusp/contracts"
import type { DbExecutor } from "@levelusp/db"
import { NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { toIsoTimestamp } from "@/common/time/time"
import { AuditService } from "../audit/audit.service"
import { toEventsCsv, type ExportedEvent } from "./experiment.domain"
import { EventsRepository } from "./events.repository"

/** Eventos lidos por consulta na exportação (o CSV é montado página a página). */
const EXPORT_PAGE_SIZE = 5_000
/** Teto da exportação: acima disso o estudo deve exportar direto do banco. */
const MAX_EXPORTED_EVENTS = 500_000

/**
 * Log de eventos do experimento de gamificação. O servidor registra os eventos que ele
 * mesmo decide (submissão, conclusão, dica…) com {@link record}; o cliente só envia os
 * de uso (`POST /me/events`, tipos de `CLIENT_EVENT_TYPES`). Nada aqui altera ou apaga um
 * evento, e o banco recusa UPDATE e DELETE em `events`.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name)

  constructor(
    private readonly repo: EventsRepository,
    private readonly rateLimit: RateLimitService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registra um evento decidido pelo servidor. Melhor-esforço: uma falha aqui vai para o
   * log e nunca derruba a ação do aluno (por isso, fora de transação quando possível).
   */
  async record(userId: string, type: EventType, payload: Record<string, Json> = {}, executor?: DbExecutor): Promise<void> {
    try {
      await this.repo.createMany([{ userId, type, payload }], executor)
    } catch (error) {
      this.logger.warn({ err: error, userId, type }, "falha ao registrar evento do experimento")
    }
  }

  /**
   * Grava o lote enviado pelo cliente com o usuário da sessão (o corpo não escolhe o usuário nem a hora).
   * O tipo já chega restrito aos de uso pelo `eventsBatchSchema`: tipo que o servidor decide é recusado
   * com 400 no controller, antes de chegar aqui, e o lote inteiro não é gravado.
   *
   * @throws AppError 429 quando o usuário passa de 600 eventos por hora.
   */
  async createMyEvents(user: AuthUser, batch: EventInput[]): Promise<void> {
    for (const _event of batch) this.rateLimit.consume(RATE_LIMITS.experimentEvents, user.id)
    await this.repo.createMany(batch.map((event) => ({ userId: user.id, type: event.type, payload: event.payload })))
  }

  /** CSV com todos os eventos (até {@link MAX_EXPORTED_EVENTS}), do mais antigo ao mais novo; fica na auditoria. */
  async exportCsv(actor: AuthUser): Promise<string> {
    const exported: ExportedEvent[] = []
    let afterId = 0
    while (exported.length < MAX_EXPORTED_EVENTS) {
      const page = await this.repo.listAfter(afterId, EXPORT_PAGE_SIZE)
      for (const event of page) {
        exported.push({
          id: event.id,
          user_id: event.userId,
          experiment_condition: event.experimentCondition,
          type: event.type,
          payload: event.payload,
          created_at: toIsoTimestamp(event.createdAt),
        })
      }
      const last = page.at(-1)
      if (!last || page.length < EXPORT_PAGE_SIZE) break
      afterId = last.id
    }
    await this.audit.log(actor, "experiment.export", "events", { events: exported.length })
    return toEventsCsv(exported)
  }

  /**
   * Define (ou tira, com null) o grupo do experimento de um usuário; fica na auditoria.
   *
   * @throws AppError 404 usuário inexistente.
   */
  async setCondition(actor: AuthUser, userId: string, condition: ExperimentCondition | null): Promise<void> {
    if (!(await this.repo.updateCondition(userId, condition))) throw NotFound("Usuário")
    await this.audit.log(actor, "experiment.condition", `user:${userId}`, { experiment_condition: condition })
  }
}
