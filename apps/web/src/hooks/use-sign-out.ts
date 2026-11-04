"use client"

import { useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { ROUTES } from "@/lib/constants"

/**
 * Encerra a sessão e recarrega a aplicação no login. A navegação é completa
 * (não `router.push`) de propósito: descarta o estado em memória de todos os
 * providers, worker do Python e caches de página do usuário anterior.
 */
export function useSignOut(): () => Promise<void> {
  const { signOut } = useAuth()
  return useCallback(async () => {
    await signOut()
    window.location.assign(ROUTES.login)
  }, [signOut])
}
