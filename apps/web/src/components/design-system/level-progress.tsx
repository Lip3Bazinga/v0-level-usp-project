"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface LevelProgressProps {
  value: number
  max?: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function LevelProgress({
  value,
  max = 100,
  size = "md",
  showLabel = false,
  className,
}: LevelProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const sizes = {
    sm: "h-2",
    md: "h-4",
    lg: "h-6",
  }

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-level-purple-dark">Progresso</span>
          <span className="font-bold text-level-purple">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-level-purple-subtle",
          sizes[size]
        )}
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-level-purple to-level-purple-medium transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
