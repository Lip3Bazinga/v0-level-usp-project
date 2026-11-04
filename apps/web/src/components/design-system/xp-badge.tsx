"use client"

import { Flame, Star, Trophy, Zap, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type XPBadgeType = "xp" | "streak" | "level" | "achievement"
type XPBadgeSize = "sm" | "md" | "lg"

interface XPBadgeProps {
  type: XPBadgeType
  value: number | string
  label?: string
  size?: XPBadgeSize
  className?: string
}

const BADGE_STYLE: Record<XPBadgeType, { Icon: LucideIcon; colorClass: string; iconColorClass: string }> = {
  xp: { Icon: Zap, colorClass: "bg-level-purple text-white", iconColorClass: "text-yellow-300" },
  streak: { Icon: Flame, colorClass: "bg-warning text-white", iconColorClass: "text-orange-200" },
  level: { Icon: Trophy, colorClass: "bg-level-purple-dark text-white", iconColorClass: "text-yellow-400" },
  achievement: { Icon: Star, colorClass: "bg-success text-white", iconColorClass: "text-yellow-300" },
}

const SIZE_CLASS: Record<XPBadgeSize, { container: string; icon: string }> = {
  sm: { container: "px-2.5 py-1 text-xs gap-1", icon: "h-3 w-3" },
  md: { container: "px-3 py-1.5 text-sm gap-1.5", icon: "h-4 w-4" },
  lg: { container: "px-4 py-2 text-base gap-2", icon: "h-5 w-5" },
}

export function XPBadge({ type, value, label, size = "md", className }: XPBadgeProps) {
  const { Icon, colorClass, iconColorClass } = BADGE_STYLE[type]
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-bold shadow-sm",
        colorClass,
        SIZE_CLASS[size].container,
        className,
      )}
    >
      <Icon className={cn(SIZE_CLASS[size].icon, iconColorClass)} />
      <span>{value}</span>
      {label && <span className="font-normal opacity-80">{label}</span>}
    </div>
  )
}
