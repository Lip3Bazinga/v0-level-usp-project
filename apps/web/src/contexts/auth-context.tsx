"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import type { Profile, SessionResponse, SignUpInput } from "@levelusp/contracts"
import {
  fetchSession,
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
  errorMessage,
} from "@/lib/api"

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Usuário autenticado. A sessão vive num cookie httpOnly emitido pela API —
 * o navegador nunca vê token; aqui só guardamos o mínimo derivado do perfil.
 */
export interface AuthUser {
  id: string
  email: string
}

/** Resultado da sequência diária atualizada no login (dispara a animação). */
export interface StreakResult {
  streakUpdated: boolean
  newStreak: number
}

export interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; streakResult?: StreakResult }>
  signUp: (input: SignUpInput) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  /** Atualiza o perfil local com o que a API devolveu (ex.: após PATCH /me/profile). */
  setProfile: (profile: Profile | null) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

function toStreakResult(session: SessionResponse): StreakResult | undefined {
  if (!session.streak) return undefined
  return { streakUpdated: session.streak.increased, newStreak: session.streak.streak }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Evita setState após unmount (Strict Mode monta/desmonta em dev)
  const mounted = useRef(true)

  const loadSession = useCallback(async () => {
    try {
      const session = await fetchSession()
      if (mounted.current) setProfile(session?.user ?? null)
    } catch {
      // Falha de rede/servidor: trata como deslogado, sem quebrar a página.
      if (mounted.current) setProfile(null)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    loadSession().finally(() => {
      if (mounted.current) setIsLoading(false)
    })
    return () => {
      mounted.current = false
    }
  }, [loadSession])

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null; streakResult?: StreakResult }> => {
      try {
        const session = await apiSignIn({ email: email.trim(), password })
        if (mounted.current) setProfile(session.user)
        return { error: null, streakResult: toStreakResult(session) }
      } catch (err) {
        return { error: errorMessage(err, "Não foi possível entrar. Tente novamente.") }
      }
    },
    [],
  )

  const signUp = useCallback(async (input: SignUpInput): Promise<{ error: string | null }> => {
    try {
      const session = await apiSignUp(input)
      if (mounted.current) setProfile(session.user)
      return { error: null }
    } catch (err) {
      return { error: errorMessage(err, "Não foi possível criar a conta. Tente novamente.") }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await apiSignOut()
    } catch {
      // Mesmo se a API falhar (sessão já expirada, rede), limpa o estado local.
    }
    if (mounted.current) setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    await loadSession()
  }, [loadSession])

  const user = useMemo<AuthUser | null>(
    () => (profile ? { id: profile.id, email: profile.email } : null),
    [profile],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, isLoading, signIn, signUp, signOut, refreshProfile, setProfile }),
    [user, profile, isLoading, signIn, signUp, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}
