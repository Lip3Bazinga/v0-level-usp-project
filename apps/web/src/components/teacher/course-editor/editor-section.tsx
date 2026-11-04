import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

export const FIELD_CLASS = "w-full rounded-xl border-2 border-border px-4 py-2.5 text-sm outline-none transition-colors focus:border-level-purple"
export const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-level-purple-dark"

interface EditorSectionProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  children: ReactNode
}

/** Cartão de uma seção do editor de curso (ícone, título e conteúdo). */
export function EditorSection({ icon: Icon, title, subtitle, children }: EditorSectionProps) {
  return (
    <div className="rounded-2xl border-2 border-border bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-light">
          <Icon className="h-5 w-5 text-level-purple" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-level-purple-dark">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}
