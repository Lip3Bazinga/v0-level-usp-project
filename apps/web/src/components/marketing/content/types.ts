import type { LucideIcon } from "lucide-react"

export interface SiteLink {
  href: string
  label: string
}

/** Cartão de destaque com ícone: missões, pilares, valores, frentes da equipe etc. */
export interface IconHighlight {
  icon: LucideIcon
  title: string
  description: string
}

/** Número de vitrine com legenda ("72%" — "concluem a primeira trilha"). */
export interface IconStat {
  icon: LucideIcon
  value: string
  label: string
}
