"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"

/**
 * Centraliza todos os providers client-side da aplicação.
 * Mantido separado do app/layout.tsx (Server Component) para preservar
 * suporte a metadata e geração estática do Next.js.
 *
 * Camadas (de fora para dentro):
 *   ThemeProvider → suporte a dark/light mode via next-themes
 *   AuthProvider  → sessão Supabase + perfil do usuário
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}
