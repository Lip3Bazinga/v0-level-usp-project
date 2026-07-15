"use client"

import { cn } from "@/lib/utils"
import { Shield, BookOpen, Users } from "lucide-react"

export function DiffBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    iniciante:     "bg-success/10 text-success",
    intermediario: "bg-warning/10 text-warning",
    avancado:      "bg-destructive/10 text-destructive",
  }
  const label =
    d === "iniciante" ? "Iniciante" : d === "intermediario" ? "Intermediário" : "Avançado"
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", map[d])}>
      {label}
    </span>
  )
}

export function PubBadge({ published }: { published: boolean }) {
  if (published)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Publicada
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      Rascunho
    </span>
  )
}

export function RoleBadge({ role, size = "md" }: { role: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
  if (role === "admin")
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-destructive/10 font-semibold text-destructive", sz)}>
        <Shield className="h-2.5 w-2.5" /> Admin
      </span>
    )
  if (role === "teacher")
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-level-purple-light font-semibold text-level-purple-dark", sz)}>
        <BookOpen className="h-2.5 w-2.5" /> Professor
      </span>
    )
  return (
    <span className={cn("inline-flex items-center rounded-full bg-muted font-semibold text-muted-foreground", sz)}>
      Aluno
    </span>
  )
}
