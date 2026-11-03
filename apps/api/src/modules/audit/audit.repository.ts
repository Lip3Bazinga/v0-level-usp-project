import { Injectable } from "@nestjs/common"
import { desc } from "drizzle-orm"
import { auditLog } from "@levelusp/db"
import type { AuditSeverity } from "@levelusp/contracts"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { AuditLogRow } from "@levelusp/db"

/** Linha a gravar na trilha de auditoria. */
export interface AuditEntry {
  actorId: string | null
  actorName: string
  action: string
  target: string
  meta: Record<string, unknown>
  severity: AuditSeverity
}

/** Trilha de auditoria: só inserção e leitura, nunca atualização. */
@Injectable()
export class AuditRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Grava uma entrada. */
  async create(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLog).values(entry)
  }

  /** Entradas mais recentes primeiro. */
  list(limit: number): Promise<AuditLogRow[]> {
    return this.db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit)
  }
}
