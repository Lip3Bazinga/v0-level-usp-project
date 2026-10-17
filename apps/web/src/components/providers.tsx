"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { ProgressProvider } from "@/contexts/progress-context"

/**
 * Providers do lado do cliente, fora do app/layout.tsx para que o layout continue
 * Server Component (metadata e geração estática). A ordem importa: notificações
 * dependem da sessão, e o progresso depende de ambos. O IDEProvider fica só nas
 * páginas de lição.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <AuthProvider>
        <NotificationProvider>
          <ProgressProvider>{children}</ProgressProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
