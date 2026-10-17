import { Injectable } from "@nestjs/common"
import type { Notification } from "@levelusp/contracts"
import { NotFound } from "@/common/errors/app-error"
import type { DbOrTx } from "@/infra/database/database.module"
import { toNotification } from "./notifications.mapper"
import { type NewNotification, NotificationsRepository } from "./notifications.repository"

/** Notificações in-app. Outros módulos usam `notify` (opcionalmente dentro da sua transação). */
@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async list(userId: string, limit: number): Promise<Notification[]> {
    return (await this.repo.list(userId, limit)).map(toNotification)
  }

  async markRead(userId: string, id: string): Promise<void> {
    if (!(await this.repo.markRead(userId, id))) throw NotFound("Notificação")
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.markAllRead(userId)
  }

  async notify(userId: string, notification: NewNotification, tx?: DbOrTx): Promise<void> {
    await this.repo.insertMany(userId, [notification], tx)
  }

  async notifyMany(userId: string, notifications: NewNotification[], tx?: DbOrTx): Promise<void> {
    await this.repo.insertMany(userId, notifications, tx)
  }
}
