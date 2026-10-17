"use client"

import { Crown, Star } from "lucide-react"
import type { BadgeRarity } from "@levelusp/contracts"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BadgeIcon } from "@/components/design-system/badge-icon"
import { cn, formatDate } from "@/lib/utils"
import type { DisplayBadge } from "./display-badges"

export type { DisplayBadge } from "./display-badges"

interface BadgesSectionProps {
  badges: DisplayBadge[]
  className?: string
}

const TOOLTIP_DELAY_MS = 200

const RARITY_STYLES: Record<BadgeRarity, { background: string; border: string; icon: string; glow: string }> = {
  common: { background: "bg-level-purple-light", border: "border-level-purple-medium", icon: "text-level-purple", glow: "" },
  rare: { background: "bg-blue-50", border: "border-blue-400", icon: "text-blue-500", glow: "" },
  epic: {
    background: "bg-level-purple-light",
    border: "border-level-purple",
    icon: "text-level-purple",
    glow: "shadow-[0_0_12px_rgba(124,58,237,0.3)]",
  },
  legendary: {
    background: "bg-linear-to-br from-yellow-50 to-orange-50",
    border: "border-yellow-400",
    icon: "text-yellow-500",
    glow: "shadow-[0_0_16px_rgba(234,179,8,0.4)]",
  },
}

const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: "Comum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
}

/** Selo de raridade no tooltip: o escuro (badge conquistada) e o claro (bloqueada). */
const RARITY_PILL_ON_DARK: Record<BadgeRarity, string> = {
  common: "bg-white/20 text-white",
  rare: "bg-blue-500/20 text-blue-200",
  epic: "bg-purple-500/20 text-purple-200",
  legendary: "bg-yellow-500/20 text-yellow-200",
}

const RARITY_PILL_ON_LIGHT: Record<BadgeRarity, string> = {
  common: "bg-gray-100 text-gray-700",
  rare: "bg-blue-100 text-blue-700",
  epic: "bg-level-purple-light text-level-purple",
  legendary: "bg-yellow-100 text-yellow-700",
}

function RarityPill({ rarity, className }: { rarity: BadgeRarity; className: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", className)}>{RARITY_LABELS[rarity]}</span>
}

export function BadgesSection({ badges, className }: BadgesSectionProps) {
  const earnedBadges = badges.filter((badge) => badge.isEarned)
  const lockedBadges = badges.filter((badge) => !badge.isEarned)

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-6", className)}>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-level-purple-dark">Badges Conquistadas</h3>
          <span className="rounded-full bg-level-purple-light px-3 py-1 text-sm font-medium text-level-purple-dark">
            {earnedBadges.length}/{badges.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Continue aprendendo para desbloquear mais conquistas</p>
      </div>

      <div className="mb-8">
        <h4 className="mb-4 text-sm font-semibold text-level-purple-dark">Conquistadas ({earnedBadges.length})</h4>
        <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
          <div className="flex flex-wrap gap-4">
            {earnedBadges.map((badge) => (
              <EarnedBadge key={badge.id} badge={badge} />
            ))}
          </div>
        </TooltipProvider>
      </div>

      {lockedBadges.length > 0 && (
        <div>
          <h4 className="mb-4 text-sm font-semibold text-muted-foreground">Bloqueadas ({lockedBadges.length})</h4>
          <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
            <div className="flex flex-wrap gap-4">
              {lockedBadges.map((badge) => (
                <LockedBadge key={badge.id} badge={badge} />
              ))}
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}

function EarnedBadge({ badge }: { badge: DisplayBadge }) {
  const styles = RARITY_STYLES[badge.rarity]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-2 transition-all hover:scale-110",
            styles.background,
            styles.border,
            styles.glow,
          )}
        >
          <BadgeIcon name={badge.icon} className={cn("h-7 w-7", styles.icon)} />
          {badge.rarity === "legendary" && (
            <div className="absolute -right-1 -top-1">
              <Crown className="h-4 w-4 text-yellow-500" />
            </div>
          )}
          {badge.rarity === "epic" && (
            <div className="absolute -right-1 -top-1">
              <Star className="h-4 w-4 text-level-purple" />
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-level-purple-dark text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-bold">{badge.name}</p>
            <RarityPill rarity={badge.rarity} className={RARITY_PILL_ON_DARK[badge.rarity]} />
          </div>
          <p className="text-sm opacity-90">{badge.description}</p>
          {badge.earnedAt && <p className="text-xs opacity-70">Conquistado em {formatDate(badge.earnedAt)}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function LockedBadge({ badge }: { badge: DisplayBadge }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/50 transition-all hover:border-level-purple-medium hover:bg-level-purple-light/50">
          <BadgeIcon name={badge.icon} className="h-7 w-7 text-muted-foreground/50" />
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-level-purple-dark">{badge.name}</p>
            <RarityPill rarity={badge.rarity} className={RARITY_PILL_ON_LIGHT[badge.rarity]} />
          </div>
          <p className="text-sm text-muted-foreground">{badge.description}</p>
          <p className="text-xs font-medium text-level-purple">Continue aprendendo para desbloquear!</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
