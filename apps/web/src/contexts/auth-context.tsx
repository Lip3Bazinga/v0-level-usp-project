"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/supabase/types"
import { checkAndUpdateDailyStreak } from "@/lib/supabase/lessons"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface StreakResult {
  streakUpdated: boolean
  newStreak: number
}

export interface AuthContextValue {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; streakResult?: StreakResult }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Singleton do client Supabase ──────────────────────────────────────────────
// Criado uma vez fora do componente para que React Strict Mode (que desmonta e
// remonta em dev) não instancie múltiplos listeners disputando o mesmo lock de
// token do GoTrue.
const supabase = createClient()

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Evita fetch de perfil após unmount (Strict Mode double-invoke)
  const mounted = useRef(true)

  const fetchProfile = useCallback(async (userId: string) => {
    // Retry uma vez em caso de falha transitória (ex: RLS ainda propagando)
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (!mounted.current) return

      if (!error && data) {
        setProfile(data as Profile)
        return
      }

      if (attempt === 0) {
        // Pequena espera antes de tentar novamente
        await new Promise((r) => setTimeout(r, 400))
      }
    }
    // Após 2 tentativas, mantém null — o usuário está autenticado mas sem perfil
    setProfile(null)
  }, [])

  useEffect(() => {
    mounted.current = true

    // onAuthStateChange dispara imediatamente com a sessão atual (INITIAL_SESSION),
    // então NÃO precisamos de getSession() separado — isso evita a corrida de
    // dois caminhos assíncronos tentando adquirir o lock do token ao mesmo tempo.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted.current) return

      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }

      if (mounted.current) setIsLoading(false)
    })

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null; streakResult?: StreakResult }> => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }

      // Bloqueia contas suspensas (camada extra além do ban do Auth)
      if (data?.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("suspended")
          .eq("id", data.user.id)
          .single()
        if (prof && (prof as { suspended?: boolean }).suspended) {
          await supabase.auth.signOut()
          return { error: "Esta conta está suspensa. Entre em contato com o suporte." }
        }
      }

      // Check and update daily streak on login
      let streakResult: StreakResult | undefined
      if (data?.user) {
        try {
          streakResult = await checkAndUpdateDailyStreak(data.user.id)
        } catch { /* streak is non-critical */ }
      }
      return { error: null, streakResult }
    },
    [],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      setUser(currentUser)
      await fetchProfile(currentUser.id)
    }
  }, [fetchProfile])

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signIn, signOut, refreshProfile }}>
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
