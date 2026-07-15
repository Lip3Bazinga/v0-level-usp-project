"use client"

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchNotifications,
  markRead as apiMarkRead,
  markAllRead as apiMarkAllRead,
} from "@/lib/supabase/notifications"
import type { Notification } from "@/lib/supabase/types"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const userId = user?.id

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      return
    }
    setIsLoading(true)
    try {
      const data = await fetchNotifications(userId)
      setNotifications(data)
    } catch {
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Carrega ao logar / trocar de usuário
  useEffect(() => {
    refresh()
  }, [refresh])

  const markRead = useCallback(async (id: string) => {
    // Atualização otimista
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await apiMarkRead(id)
    } catch {
      refresh() // reverte para o estado real em caso de falha
    }
  }, [refresh])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await apiMarkAllRead(userId)
    } catch {
      refresh()
    }
  }, [userId, refresh])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, unreadCount, isLoading, refresh, markRead, markAllRead }),
    [notifications, unreadCount, isLoading, refresh, markRead, markAllRead],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotifications deve ser usado dentro de NotificationProvider")
  return ctx
}
