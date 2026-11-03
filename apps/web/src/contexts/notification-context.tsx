"use client"

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"
import type { Notification } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api"

export interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
}

export interface NotificationActions {
  /** Busca de novo (ex.: depois de uma conclusão que gerou notificações no servidor). */
  refresh: () => Promise<void>
  markRead: (notificationId: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export type NotificationContextValue = NotificationState & NotificationActions

const NotificationContext = createContext<NotificationContextValue | null>(null)

const NO_NOTIFICATIONS: Notification[] = []

/** O sino não deve quebrar a página: falha ao buscar mostra a lista vazia. */
async function loadNotifications(userId: string | undefined): Promise<Notification[]> {
  if (!userId) return NO_NOTIFICATIONS
  try {
    return await fetchNotifications()
  } catch {
    return NO_NOTIFICATIONS
  }
}

function markAsRead(notification: Notification): Notification {
  return { ...notification, read: true }
}

export function NotificationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { user } = useAuth()
  const userId = user?.id
  const resource = useAsyncResource(() => loadNotifications(userId), [userId])
  const { reload, setData } = resource
  const notifications = resource.status === "success" ? resource.data : NO_NOTIFICATIONS

  // Atualização otimista: em caso de falha, recarrega para voltar ao estado real.
  const markRead = useCallback(
    async (notificationId: string) => {
      setData((current) => current.map((item) => (item.id === notificationId ? markAsRead(item) : item)))
      try {
        await markNotificationRead(notificationId)
      } catch {
        await reload()
      }
    },
    [reload, setData],
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    setData((current) => current.map(markAsRead))
    try {
      await markAllNotificationsRead()
    } catch {
      await reload()
    }
  }, [userId, reload, setData])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading: resource.status === "loading",
      refresh: reload,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, resource.status, reload, markRead, markAllRead],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) throw new Error("useNotifications deve ser usado dentro de NotificationProvider")
  return context
}
