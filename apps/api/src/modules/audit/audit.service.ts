import { Injectable, Logger } from "@nestjs/common"
import type { AuditLog, AuditSeverity } from "@levelusp/contracts"
import type { AuthUser } from "@/common/http/request"
import { toAuditLog } from "./audit.mapper"
import { AuditRepository } from "./audit.repository"

const SYSTEM_ACTOR_NAME = "sistema"
const MAX_LISTED_ENTRIES = 500

/**
 * Trilha de auditoria das ações administrativas. Só a API escreve aqui
 * (antes, a RPC log_audit aceitava qualquer chamador). Falhas de auditoria
 * nunca derrubam a ação principal.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly repo: AuditRepository) {}

  async log(actor: AuthUser | null, action: string, target: string, meta: Record<string, unknown> = {}, severity: AuditSeverity = "info") {
    try {
      await this.repo.insert({ actorId: actor?.id ?? null, actorName: actor?.fullName ?? SYSTEM_ACTOR_NAME, action, target, meta, severity })
    } catch (error) {
      this.logger.error({ err: error, action, target }, "falha ao gravar auditoria")
    }
  }

  async list(limit = 50): Promise<AuditLog[]> {
    return (await this.repo.latest(Math.min(limit, MAX_LISTED_ENTRIES))).map(toAuditLog)
  }
}
