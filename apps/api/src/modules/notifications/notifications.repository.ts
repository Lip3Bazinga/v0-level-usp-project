import { Injectable } from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"
import { notifications } from "@levelusp/db"
import type { Notification, NotificationKind } from "@levelusp/contracts"
import { InjectDb, type Database, type DbOrTx } from "@/infra/database/database.module"

type NotificationRow = typeof notifications.$inferSelect

export function toNotification(r: NotificationRow): Notification {
  return { id: r.id, user_id: r.userId, title: r.title, body: r.body, kind: r.kind, read: r.read, href: r.href, created_at: r.createdAt }
}

export interface NewNotification {
  title: string
  body?: string
  kind?: NotificationKind
  href?: string | null
}

@Injectable()
export class NotificationsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  list(userId: string, limit: number) {
    return this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit)
  }

  insert(userId: string, n: NewNotification, tx: DbOrTx = this.db) {
    return tx.insert(notifications).values({ userId, title: n.title, body: n.body ?? "", kind: n.kind ?? "info", href: n.href ?? null })
  }

  /** Só marca se a notificação for do usuário; devolve quantas linhas mudaram. */
  async markRead(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning({ id: notifications.id })
    return rows.length > 0
  }

  markAllRead(userId: string) {
    return this.db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
  }
}
