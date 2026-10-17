"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Profile, SignUpInput, StreakResult } from "@levelusp/contracts"
import { fetchSession, getErrorMessage, signIn as requestSignIn, signOut as requestSignOut, signUp as requestSignUp } from "@/lib/api"

/**
 * O mínimo derivado do perfil para identificar quem está logado. A sessão em si
 * vive num cookie httpOnly emitido pela API: o navegador nunca vê o token.
 */
export interface AuthUser {
  id: string
  email: string
}

export type AuthActionResult = { ok: true } | { ok: false; error: string }

/** No login a API também atualiza a sequência diária, que dispara a animação. */
export type SignInResult = { ok: true; streak?: StreakResult } | { ok: false; error: string }

export interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  isLoading: boolean
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<SignInResult>
  signUp: (input: SignUpInput) => Promise<AuthActionResult>
  /** Encerra a sessão; o estado local é limpo mesmo se a API falhar. */
  signOut: () => Promise<void>
  /** Busca o perfil de novo (ex.: depois de ganhar XP). */
  refreshProfile: () => Promise<void>
  /** Substitui o perfil local pelo que a API acabou de devolver (ex.: após PATCH /me/profile). */
  setProfile: (profile: Profile | null) => void
}

export type AuthContextValue = AuthState & AuthActions

type SessionState = { status: "loading" } | { status: "ready"; profile: Profile | null }

const AuthContext = createContext<AuthContextValue | null>(null)

/** Falha de rede ou servidor ao ler a sessão é tratada como "deslogado", sem quebrar a página. */
async function loadSessionProfile(): Promise<Profile | null> {
  try {
    const session = await fetchSession()
    return session?.user ?? null
  } catch {
    return null
  }
}

function toAuthUser(profile: Profile | null): AuthUser | null {
  return profile ? { id: profile.id, email: profile.email } : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: "loading" })

  const setProfile = useCallback((profile: Profile | null) => setSession({ status: "ready", profile }), [])

  useEffect(() => {
    let isCurrent = true
    void loadSessionProfile().then((profile) => {
      if (isCurrent) setProfile(profile)
    })
    return () => {
      isCurrent = false
    }
  }, [setProfile])

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      try {
        const response = await requestSignIn({ email: email.trim(), password })
        setProfile(response.user)
        return { ok: true, streak: response.streak }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, "Não foi possível entrar. Tente novamente.") }
      }
    },
    [setProfile],
  )

  const signUp = useCallback(
    async (input: SignUpInput): Promise<AuthActionResult> => {
      try {
        const response = await requestSignUp(input)
        setProfile(response.user)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, "Não foi possível criar a conta. Tente novamente.") }
      }
    },
    [setProfile],
  )

  const signOut = useCallback(async () => {
    try {
      await requestSignOut()
    } catch {
      // Sessão já expirada ou sem rede: do lado do navegador, sair é só limpar o estado.
    }
    setProfile(null)
  }, [setProfile])

  const refreshProfile = useCallback(async () => setProfile(await loadSessionProfile()), [setProfile])

  const profile = session.status === "ready" ? session.profile : null
  const value = useMemo<AuthContextValue>(
    () => ({
      user: toAuthUser(profile),
      profile,
      isLoading: session.status === "loading",
      signIn,
      signUp,
      signOut,
      refreshProfile,
      setProfile,
    }),
    [profile, session.status, signIn, signUp, signOut, refreshProfile, setProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return context
}
