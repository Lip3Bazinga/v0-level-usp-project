import { Injectable } from "@nestjs/common"
import { desc } from "drizzle-orm"
import { auditLog } from "@levelusp/db"
import type { AuditSeverity } from "@levelusp/contracts"
import { InjectDb, type Database } from "@/infra/database/database.module"

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

  async insert(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLog).values(entry)
  }

  latest(limit: number) {
    return this.db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit)
  }
}
