"use client"

import { cn } from "@/lib/utils"

type Tone = "neutral" | "danger" | "success" | "warning"

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "text-muted-foreground hover:bg-level-purple-light hover:text-level-purple",
  danger:  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
  success: "text-success hover:bg-success/10",
  warning: "text-warning hover:bg-warning/10",
}

const SIZE_CLASSES = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
}

interface IconBtnProps {
  title?: string
  onClick?: () => void
  children: React.ReactNode
  tone?: Tone
  size?: "sm" | "md"
  disabled?: boolean
}

export function IconBtn({ title, onClick, children, tone = "neutral", size = "md", disabled }: IconBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
      )}
    >
      {children}
    </button>
  )
}
