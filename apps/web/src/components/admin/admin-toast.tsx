"use client"

import { useCallback } from "react"
import { CheckCircle2 } from "lucide-react"
import { useTransientValue } from "@/hooks/use-transient-value"
import { ADMIN_TOAST_DURATION_MS } from "@/lib/constants"
import type { OnToast, ToastKind } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AdminToastMessage {
  message: string
  kind: ToastKind
}

const TOAST_KIND_CLASSES: Record<ToastKind, string> = {
  success: "bg-success text-white",
  error: "bg-destructive text-white",
  warning: "bg-warning text-white",
  info: "bg-level-purple text-white",
}

/** Aviso do painel do admin que some sozinho; um novo aviso substitui o anterior. */
export function useAdminToast(): { toast: AdminToastMessage | null; showToast: OnToast } {
  const { value: toast, show } = useTransientValue<AdminToastMessage>(ADMIN_TOAST_DURATION_MS)
  const showToast = useCallback<OnToast>((message, kind = "success") => show({ message, kind }), [show])
  return { toast, showToast }
}

interface AdminToastProps {
  toast: AdminToastMessage | null
}

export function AdminToast({ toast }: AdminToastProps): React.JSX.Element | null {
  if (!toast) return null
  return (
    <div className="fixed bottom-6 right-6 z-80">
      <div className={cn("flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl", TOAST_KIND_CLASSES[toast.kind])}>
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <p className="text-sm font-semibold">{toast.message}</p>
      </div>
    </div>
  )
}
