import { Injectable } from "@nestjs/common"
import { desc } from "drizzle-orm"
import { auditLog } from "@levelusp/db"
import type { AuditSeverity } from "@levelusp/contracts"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { AuditLogRow } from "@levelusp/db"

export interface AuditEntry {
  actorId: string | null
  actorName: string
  action: string
  target: string
  meta: Record<string, unknown>
  severity: AuditSeverity
}

@Injectable()
export class AuditRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  async create(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLog).values(entry)
  }

  list(limit: number): Promise<AuditLogRow[]> {
    return this.db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit)
  }
}
