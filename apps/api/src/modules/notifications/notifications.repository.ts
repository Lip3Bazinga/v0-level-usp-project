import { Injectable } from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"
import { notifications, type NotificationInsert } from "@levelusp/db"
import type { NotificationKind } from "@levelusp/contracts"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { DbExecutor, NotificationRow } from "@levelusp/db"

/** Notificação a criar; sem `kind`, é `info`, e sem `body`, texto vazio. */
export interface NewNotification {
  title: string
  body?: string
  kind?: NotificationKind
  href?: string | null
}

function toInsert(userId: string, notification: NewNotification): NotificationInsert {
  return { userId, title: notification.title, body: notification.body ?? "", kind: notification.kind ?? "info", href: notification.href ?? null }
}

/** Notificações dos usuários; leitura e escrita sempre filtradas pelo dono. */
@Injectable()
export class NotificationsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Notificações do usuário, mais recentes primeiro. */
  list(userId: string, limit: number): Promise<NotificationRow[]> {
    return this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit)
  }

  /** Cria várias notificações de uma vez (nada a fazer com lista vazia). */
  async createMany(userId: string, newNotifications: NewNotification[], executor: DbExecutor = this.db): Promise<void> {
    if (!newNotifications.length) return
    await executor.insert(notifications).values(newNotifications.map((notification) => toInsert(userId, notification)))
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

  /** Marca todas as notificações do usuário como lidas. */
  async markAllRead(userId: string): Promise<void> {
    await this.db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
  }
}
