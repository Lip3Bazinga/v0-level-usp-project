"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info, type LucideIcon } from "lucide-react"
import type { Notification, NotificationKind } from "@levelusp/contracts"
import { useNotifications } from "@/contexts/notification-context"
import { cn, formatTimeAgo } from "@/lib/utils"

const KIND_STYLE: Record<NotificationKind, { Icon: LucideIcon; colorClass: string }> = {
  info: { Icon: Info, colorClass: "bg-info/10 text-info" },
  success: { Icon: CheckCircle2, colorClass: "bg-success/10 text-success" },
  warning: { Icon: AlertTriangle, colorClass: "bg-warning/10 text-warning" },
  danger: { Icon: AlertCircle, colorClass: "bg-destructive/10 text-destructive" },
}

interface NotificationItemProps {
  notification: Notification
  onOpen: (notificationId: string) => void
}

function NotificationItem({ notification, onOpen }: NotificationItemProps): React.JSX.Element {
  const { Icon, colorClass } = KIND_STYLE[notification.kind]
  const className = cn(
    "flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-level-purple-subtle/40",
    !notification.read && "bg-level-purple-subtle/20",
  )
  const content = (
    <>
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-level-purple-dark">{notification.title}</p>
        {notification.body && <p className="mt-0.5 text-[11px] text-muted-foreground">{notification.body}</p>}
        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatTimeAgo(notification.created_at, { withNow: true })}</p>
      </div>
      {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-level-purple" />}
    </>
  )
  const handleClick = (): void => onOpen(notification.id)

  if (notification.href) {
    return (
      <Link href={notification.href} className={className} onClick={handleClick}>
        {content}
      </Link>
    )
  }
  return (
    <button className={className} onClick={handleClick}>
      {content}
    </button>
  )
}

export function NotificationBell(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-linear-to-r from-level-purple-subtle/50 to-white px-4 py-3">
              <div>
                <p className="text-sm font-extrabold text-level-purple-dark">Central de notificações</p>
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} não lidas` : "Tudo em dia"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button onClick={() => void markAllRead()} className="text-[11px] font-bold text-level-purple hover:underline">
                  Marcar todas
                </button>
              )}
            </div>

            <div className="max-h-96 divide-y divide-border overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} onOpen={(notificationId) => void markRead(notificationId)} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
