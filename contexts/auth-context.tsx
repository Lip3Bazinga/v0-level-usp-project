"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/supabase/types"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  /** Perfil completo do usuário logado (incluindo XP, level, role). Null se não autenticado. */
  profile: Profile | null
  /** True apenas durante a hidratação inicial da sessão (primeiro render). */
  isLoading: boolean
  /** Desloga e limpa o perfil local. */
  signOut: () => Promise<void>
  /** Re-busca o perfil do Supabase (útil após ganhar XP ou subir de nível). */
  refreshProfile: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Hidrata a sessão existente (ex: aba reaberta, F5)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      setIsLoading(false)
    })

    // Escuta login, logout e refresh de token em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) await fetchProfile(user.id)
  }, [fetchProfile])

  return (
    <AuthContext.Provider value={{ profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}
