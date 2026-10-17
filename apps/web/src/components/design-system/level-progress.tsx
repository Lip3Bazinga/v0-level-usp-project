"use client"

import { cn, formatPercent } from "@/lib/utils"

type LevelProgressSize = "sm" | "md" | "lg"

interface LevelProgressProps {
  value: number
  max?: number
  size?: LevelProgressSize
  hasLabel?: boolean
  className?: string
}

const HEIGHT_CLASS: Record<LevelProgressSize, string> = {
  sm: "h-2",
  md: "h-4",
  lg: "h-6",
}

export function LevelProgress({ value, max = 100, size = "md", hasLabel = false, className }: LevelProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn("w-full", className)}>
      {hasLabel && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-level-purple-dark">Progresso</span>
          <span className="font-bold text-level-purple">{formatPercent(percentage)}</span>
        </div>
      )}
      <div className={cn("w-full overflow-hidden rounded-full bg-level-purple-subtle", HEIGHT_CLASS[size])}>
        <div
          className="h-full rounded-full bg-linear-to-r from-level-purple to-level-purple-medium transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
