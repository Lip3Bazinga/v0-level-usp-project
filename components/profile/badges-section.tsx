"use client"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Crown, Star } from "lucide-react"
import { badgeIcon } from "@/lib/badge-icons"
import type { Badge as CatalogBadge } from "@/lib/supabase/types"

/** Badge do catálogo + estado de conquista do usuário sendo exibido. */
export interface DisplayBadge extends CatalogBadge {
  isEarned: boolean
  earnedAt?: Date
}

interface BadgesSectionProps {
  badges: DisplayBadge[]
  className?: string
}

const rarityColors = {
  common: {
    bg: "bg-level-purple-light",
    border: "border-level-purple-medium",
    icon: "text-level-purple",
    glow: "",
  },
  rare: {
    bg: "bg-blue-50",
    border: "border-blue-400",
    icon: "text-blue-500",
    glow: "",
  },
  epic: {
    bg: "bg-level-purple-light",
    border: "border-level-purple",
    icon: "text-level-purple",
    glow: "shadow-[0_0_12px_rgba(124,58,237,0.3)]",
  },
  legendary: {
    bg: "bg-linear-to-br from-yellow-50 to-orange-50",
    border: "border-yellow-400",
    icon: "text-yellow-500",
    glow: "shadow-[0_0_16px_rgba(234,179,8,0.4)]",
  },
}

const rarityLabels = {
  common: "Comum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
}

export function BadgesSection({ badges, className }: BadgesSectionProps) {
  const earnedBadges = badges.filter((b) => b.isEarned)
  const lockedBadges = badges.filter((b) => !b.isEarned)

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-6", className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-level-purple-dark">Badges Conquistadas</h3>
          <span className="rounded-full bg-level-purple-light px-3 py-1 text-sm font-medium text-level-purple-dark">
            {earnedBadges.length}/{badges.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Continue aprendendo para desbloquear mais conquistas
        </p>
      </div>

      {/* Earned Badges */}
      <div className="mb-8">
        <h4 className="mb-4 text-sm font-semibold text-level-purple-dark">
          Conquistadas ({earnedBadges.length})
        </h4>
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap gap-4">
            {earnedBadges.map((badge) => {
              const colors = rarityColors[badge.rarity]
              const Icon = badgeIcon(badge.icon)
              
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "group relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-2 transition-all hover:scale-110",
                        colors.bg,
                        colors.border,
                        colors.glow
                      )}
                    >
                      <Icon className={cn("h-7 w-7", colors.icon)} />
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
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          badge.rarity === "legendary" && "bg-yellow-500/20 text-yellow-200",
                          badge.rarity === "epic" && "bg-purple-500/20 text-purple-200",
                          badge.rarity === "rare" && "bg-blue-500/20 text-blue-200",
                          badge.rarity === "common" && "bg-white/20 text-white"
                        )}>
                          {rarityLabels[badge.rarity]}
                        </span>
                      </div>
                      <p className="text-sm opacity-90">{badge.description}</p>
                      {badge.earnedAt && (
                        <p className="text-xs opacity-70">
                          Conquistado em {badge.earnedAt.toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h4 className="mb-4 text-sm font-semibold text-muted-foreground">
            Bloqueadas ({lockedBadges.length})
          </h4>
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-4">
              {lockedBadges.map((badge) => {
                const Icon = badgeIcon(badge.icon)
                
                return (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <div className="group flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/50 transition-all hover:border-level-purple-medium hover:bg-level-purple-light/50">
                        <Icon className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-level-purple-dark">{badge.name}</p>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            badge.rarity === "legendary" && "bg-yellow-100 text-yellow-700",
                            badge.rarity === "epic" && "bg-level-purple-light text-level-purple",
                            badge.rarity === "rare" && "bg-blue-100 text-blue-700",
                            badge.rarity === "common" && "bg-gray-100 text-gray-700"
                          )}>
                            {rarityLabels[badge.rarity]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        <p className="text-xs font-medium text-level-purple">
                          Continue aprendendo para desbloquear!
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
