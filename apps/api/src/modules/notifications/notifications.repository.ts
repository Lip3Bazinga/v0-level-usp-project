import { Injectable } from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"
import { notifications, type NotificationInsert } from "@levelusp/db"
import type { NotificationKind } from "@levelusp/contracts"
import { InjectDb, type Database, type DbOrTx } from "@/infra/database/database.module"

export interface NewNotification {
  title: string
  body?: string
  kind?: NotificationKind
  href?: string | null
}

function toInsert(userId: string, notification: NewNotification): NotificationInsert {
  return { userId, title: notification.title, body: notification.body ?? "", kind: notification.kind ?? "info", href: notification.href ?? null }
}

@Injectable()
export class NotificationsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  list(userId: string, limit: number) {
    return this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit)
  }

  async createMany(userId: string, newNotifications: NewNotification[], tx: DbOrTx = this.db): Promise<void> {
    if (!newNotifications.length) return
    await tx.insert(notifications).values(newNotifications.map((notification) => toInsert(userId, notification)))
  }

  /** Só marca se a notificação for do usuário; devolve se alguma linha mudou. */
  async markRead(userId: string, id: string): Promise<boolean> {
    const updated = await this.db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning({ id: notifications.id })
    return updated.length > 0
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
  }
}
