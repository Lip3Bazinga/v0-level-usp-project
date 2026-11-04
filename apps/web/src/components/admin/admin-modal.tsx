"use client"

import { useId, type ReactNode } from "react"
import { Loader2, X } from "lucide-react"
import { useModalA11y } from "@/hooks/use-modal-a11y"
import { cn } from "@/lib/utils"

const SIZE_CLASSES = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const

const ICON_TONE_CLASSES = {
  primary: "bg-level-purple text-white",
  danger: "bg-destructive/10 text-destructive",
} as const

interface AdminModalProps {
  title: ReactNode
  /** Nome acessível explícito, quando o título visível não serve (ex.: tem separadores). */
  accessibleName?: string
  /** Ícone do quadrado à esquerda do título. */
  icon?: ReactNode
  iconTone?: keyof typeof ICON_TONE_CLASSES
  size?: keyof typeof SIZE_CLASSES
  /** Limita a altura à janela e rola só o corpo (formulários longos). */
  isScrollable?: boolean
  bodyClassName?: string
  footer?: ReactNode
  footerAlign?: "end" | "between"
  onClose: () => void
  children: ReactNode
}

/**
 * Diálogo padrão do painel do admin. Só é montado enquanto aberto; o foco entra nele,
 * o Tab fica preso, Esc fecha e o foco volta a quem abriu (`useModalA11y`).
 */
export function AdminModal({
  title,
  accessibleName,
  icon,
  iconTone = "primary",
  size = "md",
  isScrollable = false,
  bodyClassName = "p-6",
  footer,
  footerAlign = "end",
  onClose,
  children,
}: AdminModalProps) {
  const titleId = useId()
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={accessibleName}
        aria-labelledby={accessibleName ? undefined : titleId}
        className={cn(
          "w-full rounded-2xl bg-white shadow-xl",
          SIZE_CLASSES[size],
          isScrollable && "flex max-h-[90vh] flex-col overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ICON_TONE_CLASSES[iconTone])}>
                {icon}
              </div>
            )}
            <p id={titleId} className="text-base font-extrabold text-level-purple-dark">{title}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn(isScrollable && "flex-1 overflow-y-auto", bodyClassName)}>{children}</div>

        {footer && (
          <div
            className={cn(
              "flex border-t border-border bg-muted/30 px-6 py-4",
              footerAlign === "end" ? "justify-end gap-2" : "items-center justify-between",
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface ModalCancelButtonProps {
  onClick: () => void
  disabled?: boolean
}

/** Botão "Cancelar" do rodapé dos diálogos do admin. */
export function ModalCancelButton({ onClick, disabled }: ModalCancelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white disabled:opacity-50"
    >
      Cancelar
    </button>
  )
}

interface ModalSubmitButtonProps {
  onClick: () => void
  isBusy: boolean
  children: ReactNode
}

/** Botão principal do rodapé, com indicador enquanto a ação roda. */
export function ModalSubmitButton({ onClick, isBusy, children }: ModalSubmitButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBusy}
      className="flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white hover:bg-level-purple-dark disabled:opacity-50"
    >
      {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
