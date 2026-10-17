"use client"

import type { ReactNode } from "react"
import { MotionConfig } from "framer-motion"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { ProgressProvider } from "@/contexts/progress-context"

/**
 * Providers do lado do cliente, fora do app/layout.tsx para que o layout continue
 * Server Component (metadata e geração estática). A ordem importa: notificações
 * dependem da sessão, e o progresso depende de ambos. O IDEProvider fica só nas
 * páginas de lição. O `MotionConfig` faz o framer-motion respeitar o "reduzir
 * movimento" do sistema (WCAG 2.3.3).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <NotificationProvider>
            <ProgressProvider>{children}</ProgressProvider>
          </NotificationProvider>
        </AuthProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}
