import type { AuditLog } from "@levelusp/contracts"
import type { AuditLogRow } from "@levelusp/db"

export function toAuditLog(entry: AuditLogRow): AuditLog {
  return {
    id: entry.id,
    actor_id: entry.actorId,
    actor_name: entry.actorName,
    action: entry.action,
    target: entry.target,
    meta: entry.meta ?? null,
    severity: entry.severity,
    created_at: entry.createdAt,
  }
}
