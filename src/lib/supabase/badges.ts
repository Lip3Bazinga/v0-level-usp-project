import { createClient } from "@/lib/supabase/client"
import type { Badge, UserBadge } from "@/lib/supabase/types"

/** Badge recém-concedida, retornada pela RPC grant_badges. */
export type GrantedBadge = Pick<Badge, "id" | "name" | "description" | "icon" | "rarity">

// ── Leitura ───────────────────────────────────────────────────────────────────

/** Catálogo completo de badges, ordenado. */
export async function fetchAllBadges(includeInactive = false): Promise<Badge[]> {
  const supabase = createClient()
  let query = supabase.from("badges").select("*").order("sort_order", { ascending: true })
  if (!includeInactive) query = query.eq("active", true)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Badge[]
}

/** Badges conquistadas por um usuário (id + data). */
export async function fetchUserBadges(userId: string): Promise<UserBadge[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("user_badges")
    .select("*")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []) as UserBadge[]
}

// ── Concessão automática ────────────────────────────────────────────────────────

/** Avalia critérios e concede badges novas. Retorna as recém-conquistadas. */
export async function grantBadges(userId: string): Promise<GrantedBadge[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("grant_badges", { p_user_id: userId })
  if (error) throw error
  return (data ?? []) as GrantedBadge[]
}

// ── CRUD admin ──────────────────────────────────────────────────────────────────

export type BadgeFormData = Omit<Badge, "created_at">

export async function createBadge(data: BadgeFormData): Promise<Badge> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from("badges")
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return created as Badge
}

export async function updateBadge(id: string, data: Partial<BadgeFormData>): Promise<Badge> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from("badges")
    .update(data)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return updated as Badge
}

export async function deleteBadge(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("badges").delete().eq("id", id)
  if (error) throw error
}
