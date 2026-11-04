import type { LucideIcon } from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  className?: string
}

export function StatCard({ label, value, icon: Icon, iconColor = "text-level-purple", className }: StatCardProps): React.JSX.Element {
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl border border-border bg-white p-6 transition-all card-hover", className)}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-level-purple-light opacity-50 transition-transform group-hover:scale-150" />
      <div className="relative">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
        <p className="mb-1 text-3xl font-bold text-level-purple-dark">{typeof value === "number" ? formatNumber(value) : value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
