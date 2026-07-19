"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ToastProvider } from "@/contexts/toast-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { ProgressProvider } from "@/contexts/progress-context"

/**
 * Centraliza todos os providers client-side da aplicação.
 * Mantido separado do app/layout.tsx (Server Component) para preservar
 * suporte a metadata e geração estática do Next.js.
 *
 * Camadas (de fora para dentro):
 *   ThemeProvider        → dark/light mode via next-themes
 *   AuthProvider         → sessão Supabase + perfil do usuário
 *   ToastProvider        → feedback unificado (wrapper sobre lib/swal)
 *   NotificationProvider → notificações reais por usuário
 *   ProgressProvider     → lições + progresso + gamificação (fonte única)
 *
 * Nota: IDEProvider não fica aqui — é escopado às páginas da IDE.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <ProgressProvider>{children}</ProgressProvider>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
