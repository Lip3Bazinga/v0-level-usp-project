import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/lib/supabase/types"

/** Retorna as notificações do usuário, mais recentes primeiro. */
export async function fetchNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as Notification[]
}

/** Marca uma notificação como lida. */
export async function markRead(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
  if (error) throw error
}

/** Marca todas as notificações do usuário como lidas. */
export async function markAllRead(userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false)
  if (error) throw error
}
