"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-level-purple",
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-white p-6 transition-all card-hover",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-level-purple-light opacity-50 transition-transform group-hover:scale-150" />
      
      <div className="relative">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>

        {/* Value */}
        <p className="mb-1 text-3xl font-bold text-level-purple-dark">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </p>

        {/* Label */}
        <p className="text-sm text-muted-foreground">{label}</p>

        {/* Trend */}
        {trend && (
          <div className="mt-3 flex items-center gap-1">
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground">vs semana passada</span>
          </div>
        )}
      </div>
    </div>
  )
}
