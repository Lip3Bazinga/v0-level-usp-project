import type { Notification } from "@levelusp/contracts"
import type { NotificationRow } from "@levelusp/db"

/** Notificação no formato do contrato. */
export function toNotification(notification: NotificationRow): Notification {
  return {
    id: notification.id,
    user_id: notification.userId,
    title: notification.title,
    body: notification.body,
    kind: notification.kind,
    read: notification.read,
    href: notification.href,
    created_at: notification.createdAt,
  }
}
