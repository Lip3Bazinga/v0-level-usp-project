"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import {
  swalToast,
  swalSuccess,
  swalError,
  swalWarning,
  swalInfo,
  swalConfirm,
} from "@/lib/swal"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  icon?: "warning" | "question" | "info"
  danger?: boolean
}

export interface ToastApi {
  /** Toast discreto no canto (auto-some). */
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
  warning: (msg: string) => void
  /** Modal de sucesso/erro com mais destaque. */
  alertSuccess: (title: string, text?: string) => void
  alertError: (title: string, text?: string) => void
  alertWarning: (title: string, text?: string) => void
  alertInfo: (title: string, text?: string) => void
  /** Diálogo de confirmação. Retorna true se o usuário confirmou. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastApi | null>(null)

/**
 * Centraliza o feedback ao usuário sobre o lib/swal.ts existente (SweetAlert2),
 * dando uma interface única e estável. Os helpers swal* continuam exportados
 * para uso direto; este provider é o ponto de entrada recomendado.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const api = useMemo<ToastApi>(
    () => ({
      success: (msg) => swalToast({ title: msg, icon: "success" }),
      error: (msg) => swalToast({ title: msg, icon: "error" }),
      info: (msg) => swalToast({ title: msg, icon: "info" }),
      warning: (msg) => swalToast({ title: msg, icon: "warning" }),
      alertSuccess: (title, text) => swalSuccess({ title, text }),
      alertError: (title, text) => swalError({ title, text }),
      alertWarning: (title, text) => swalWarning({ title, text }),
      alertInfo: (title, text) => swalInfo({ title, text }),
      confirm: (options) => swalConfirm(options),
    }),
    [],
  )

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider")
  return ctx
}
