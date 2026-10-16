import { Injectable, Logger } from "@nestjs/common"
import { desc } from "drizzle-orm"
import { auditLog } from "@levelusp/db"
import type { AuditLog } from "@levelusp/contracts"
import type { AuthUser } from "@/common/http/request"
import { InjectDb, type Database } from "@/infra/database/database.module"

export type AuditSeverity = "info" | "warning" | "danger"

/**
 * Trilha de auditoria das ações administrativas. Só a API escreve aqui
 * (antes, a RPC log_audit aceitava qualquer chamador). Falhas de auditoria
 * nunca derrubam a ação principal.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(@InjectDb() private readonly db: Database) {}

  async log(actor: AuthUser | null, action: string, target: string, meta: Record<string, unknown> = {}, severity: AuditSeverity = "info") {
    try {
      await this.db.insert(auditLog).values({ actorId: actor?.id ?? null, actorName: actor?.fullName ?? "sistema", action, target, meta, severity })
    } catch (err) {
      this.logger.error({ err, action, target }, "falha ao gravar auditoria")
    }
  }

  async list(limit = 50): Promise<AuditLog[]> {
    const rows = await this.db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(Math.min(limit, 500))
    return rows.map((r) => ({
      id: r.id, actor_id: r.actorId, actor_name: r.actorName, action: r.action, target: r.target,
      meta: r.meta ?? null, severity: r.severity, created_at: r.createdAt,
    }))
  }
}
