"use client"

import { useState } from "react"
import { Bell, Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/contexts/notification-context"
import type { NotificationKind } from "@/lib/supabase/types"

const KIND_STYLE: Record<NotificationKind, { Icon: typeof Info; color: string }> = {
  info:    { Icon: Info,          color: "bg-info/10 text-info" },
  success: { Icon: CheckCircle2,  color: "bg-success/10 text-success" },
  warning: { Icon: AlertTriangle, color: "bg-warning/10 text-warning" },
  danger:  { Icon: AlertCircle,   color: "bg-destructive/10 text-destructive" },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "agora"
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
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

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-linear-to-r from-level-purple-subtle/50 to-white px-4 py-3">
              <div>
                <p className="text-sm font-extrabold text-level-purple-dark">Central de notificações</p>
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} não lidas` : "Tudo em dia"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-[11px] font-bold text-level-purple hover:underline"
                >
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
                notifications.map((n) => {
                  const { Icon, color } = KIND_STYLE[n.kind] ?? KIND_STYLE.info
                  const Inner = (
                    <>
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug text-level-purple-dark">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p>}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-level-purple" />}
                    </>
                  )
                  const className = cn(
                    "flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-level-purple-subtle/40",
                    !n.read && "bg-level-purple-subtle/20",
                  )
                  return n.href ? (
                    <Link key={n.id} href={n.href} className={className} onClick={() => markRead(n.id)}>
                      {Inner}
                    </Link>
                  ) : (
                    <button key={n.id} className={className} onClick={() => markRead(n.id)}>
                      {Inner}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
