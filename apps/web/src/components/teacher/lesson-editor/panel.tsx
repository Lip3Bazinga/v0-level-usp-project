import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

/** Cartão padrão das abas do editor (ícone + título + ação opcional). */
export function EditorPanel({ icon: Icon, title, subtitle, action, children }: {
  icon: LucideIcon
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border-2 border-border bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-light">
              <Icon className="h-5 w-5 text-level-purple" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-level-purple-dark">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  )
}

export const addButtonClass =
  "flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-level-purple bg-level-purple-subtle px-3 py-2 text-sm font-semibold text-level-purple transition-colors hover:bg-level-purple-light disabled:opacity-50"

export const inputClass =
  "w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"

export const smallInputClass =
  "w-full rounded-xl border-2 border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"

export const labelClass = "text-sm font-medium text-level-purple-dark"
export const miniLabelClass = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
