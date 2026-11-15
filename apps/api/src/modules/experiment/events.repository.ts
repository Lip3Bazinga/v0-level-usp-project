import { Injectable } from "@nestjs/common"
import { asc, eq, gt } from "drizzle-orm"
import { events, profiles, type DbExecutor, type EventInsert, type EventRow } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"

/** Evento com o grupo atual do participante (null quando a conta foi apagada ou está fora do experimento). */
export interface EventWithConditionRow extends EventRow {
  experimentCondition: string | null
}

/** Log append-only do experimento: só insere e lê (não existe update nem delete). */
@Injectable()
export class EventsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Grava os eventos de uma vez. */
  async createMany(rows: EventInsert[], executor: DbExecutor = this.db): Promise<void> {
    if (rows.length > 0) await executor.insert(events).values(rows)
  }

  /** Página da exportação: eventos com id maior que `afterId`, em ordem, com o grupo do participante. */
  listAfter(afterId: number, limit: number): Promise<EventWithConditionRow[]> {
    return this.db
      .select({
        id: events.id,
        userId: events.userId,
        type: events.type,
        payload: events.payload,
        createdAt: events.createdAt,
        experimentCondition: profiles.experimentCondition,
      })
      .from(events)
      .leftJoin(profiles, eq(profiles.id, events.userId))
      .where(gt(events.id, afterId))
      .orderBy(asc(events.id))
      .limit(limit)
  }

  /** Define o grupo do participante; `undefined` quando o perfil não existe. */
  async updateCondition(userId: string, condition: "gamificada" | "controle" | null): Promise<{ id: string } | undefined> {
    const [profile] = await this.db.update(profiles).set({ experimentCondition: condition }).where(eq(profiles.id, userId)).returning({ id: profiles.id })
    return profile
  }
}
