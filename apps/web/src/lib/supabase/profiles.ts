import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

/**
 * Ranking por XP (leaderboard). Antes era uma query inline em
 * app/leaderboard/page.tsx.
 */
export async function fetchLeaderboard(limit = 50): Promise<Profile[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("total_xp", { ascending: false })
    .limit(limit)
  return (data ?? []) as Profile[]
}

/**
 * Perfil público por username. Antes era uma query inline em
 * app/perfil/[username]/page.tsx.
 */
export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle()
  return (data as Profile) ?? null
}
