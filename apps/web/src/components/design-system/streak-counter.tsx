"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Flame } from "lucide-react"

interface StreakCounterProps {
  days: number
  className?: string
}

export function StreakCounter({ days, className }: StreakCounterProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-red-500 px-4 py-2 font-bold text-white shadow-lg",
        className
      )}
    >
      <div className="relative">
        <Flame className="h-6 w-6 animate-pulse fill-yellow-300 text-yellow-300" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg leading-none">{days}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">
          {days === 1 ? "dia" : "dias"}
        </span>
      </div>
    </div>
  )
}
