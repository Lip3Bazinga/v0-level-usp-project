"use client"

import type { ReactNode } from "react"
import { CheckCircle2, Lock, Play } from "lucide-react"
import { cn, formatPercent } from "@/lib/utils"
import { LevelProgress } from "./level-progress"

type CourseCardStatus = "locked" | "in-progress" | "completed"

interface CourseCardProps {
  title: string
  description: string
  icon: ReactNode
  progress?: number
  totalLessons: number
  completedLessons: number
  status?: CourseCardStatus
  className?: string
  onClick?: () => void
}

const CARD_SHADOW = "0 4px 12px -2px rgba(124, 58, 237, 0.08)"

function StatusIcon({ status }: { status: CourseCardStatus }) {
  if (status === "locked") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }
  if (status === "completed") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success">
        <CheckCircle2 className="h-5 w-5 text-white" />
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-level-purple transition-transform group-hover:scale-110">
      <Play className="h-4 w-4 fill-white text-white" />
    </div>
  )
}

export function CourseCard({
  title,
  description,
  icon,
  progress = 0,
  totalLessons,
  completedLessons,
  status = "in-progress",
  className,
  onClick,
}: CourseCardProps) {
  const isLocked = status === "locked"

  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 bg-white p-6 transition-all duration-200",
        isLocked
          ? "cursor-not-allowed border-border opacity-60"
          : "cursor-pointer border-transparent card-hover hover:border-level-purple-medium",
        status === "completed" && "border-success",
        className,
      )}
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="absolute right-4 top-4">
        <StatusIcon status={status} />
      </div>

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-level-purple-light text-level-purple">
        {icon}
      </div>

      <h3 className="mb-2 text-xl font-bold text-level-purple-dark">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{description}</p>

      <div className="space-y-2">
        <LevelProgress value={progress} size="sm" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {completedLessons} de {totalLessons} lições
          </span>
          <span className="font-semibold text-level-purple">{formatPercent(progress)}</span>
        </div>
      </div>
    </div>
  )
}
