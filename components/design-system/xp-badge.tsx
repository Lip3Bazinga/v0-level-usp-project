"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Zap, Flame, Trophy, Star } from "lucide-react"

interface XPBadgeProps {
  type: "xp" | "streak" | "level" | "achievement"
  value: number | string
  label?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function XPBadge({
  type,
  value,
  label,
  size = "md",
  className,
}: XPBadgeProps) {
  const icons = {
    xp: Zap,
    streak: Flame,
    level: Trophy,
    achievement: Star,
  }

  const colors = {
    xp: "bg-level-purple text-white",
    streak: "bg-warning text-white",
    level: "bg-level-purple-dark text-white",
    achievement: "bg-success text-white",
  }

  const iconColors = {
    xp: "text-yellow-300",
    streak: "text-orange-200",
    level: "text-yellow-400",
    achievement: "text-yellow-300",
  }

  const sizes = {
    sm: "px-2.5 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const Icon = icons[type]

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-bold shadow-sm",
        colors[type],
        sizes[size],
        className
      )}
    >
      <Icon className={cn(iconSizes[size], iconColors[type])} />
      <span>{value}</span>
      {label && <span className="font-normal opacity-80">{label}</span>}
    </div>
  )
}
