"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Code2,
  Flame,
  Trophy,
  Zap,
  Target,
  BookOpen,
  Lightbulb,
  Rocket,
  Star,
  Crown,
  Medal,
  Award,
} from "lucide-react"

interface Badge {
  id: string
  name: string
  description: string
  icon: React.ElementType
  earnedAt?: Date
  isEarned: boolean
  rarity: "common" | "rare" | "epic" | "legendary"
}

interface BadgesSectionProps {
  badges: Badge[]
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

export const mockBadges: Badge[] = [
  {
    id: "first-code",
    name: "Primeira Linha",
    description: "Escreveu sua primeira linha de código",
    icon: Code2,
    earnedAt: new Date("2024-01-15"),
    isEarned: true,
    rarity: "common",
  },
  {
    id: "streak-7",
    name: "Semana de Fogo",
    description: "Manteve um streak de 7 dias",
    icon: Flame,
    earnedAt: new Date("2024-02-01"),
    isEarned: true,
    rarity: "common",
  },
  {
    id: "streak-30",
    name: "Mês Imparável",
    description: "Manteve um streak de 30 dias",
    icon: Flame,
    earnedAt: new Date("2024-03-10"),
    isEarned: true,
    rarity: "rare",
  },
  {
    id: "xp-1000",
    name: "Mil XP",
    description: "Acumulou 1.000 XP",
    icon: Zap,
    earnedAt: new Date("2024-01-20"),
    isEarned: true,
    rarity: "common",
  },
  {
    id: "xp-10000",
    name: "Dez Mil XP",
    description: "Acumulou 10.000 XP",
    icon: Zap,
    earnedAt: new Date("2024-04-05"),
    isEarned: true,
    rarity: "rare",
  },
  {
    id: "course-complete",
    name: "Missão Cumprida",
    description: "Completou um curso inteiro",
    icon: Trophy,
    earnedAt: new Date("2024-02-20"),
    isEarned: true,
    rarity: "epic",
  },
  {
    id: "perfect-quiz",
    name: "Perfeição",
    description: "Acertou todas as questões de um quiz",
    icon: Target,
    earnedAt: new Date("2024-01-25"),
    isEarned: true,
    rarity: "common",
  },
  {
    id: "bookworm",
    name: "Leitor Ávido",
    description: "Leu 50 lições teóricas",
    icon: BookOpen,
    earnedAt: new Date("2024-03-15"),
    isEarned: true,
    rarity: "rare",
  },
  {
    id: "eureka",
    name: "Eureka!",
    description: "Resolveu 10 desafios sem dicas",
    icon: Lightbulb,
    earnedAt: new Date("2024-04-01"),
    isEarned: true,
    rarity: "epic",
  },
  {
    id: "pioneer",
    name: "Pioneiro USP",
    description: "Está entre os primeiros 1.000 usuários",
    icon: Rocket,
    earnedAt: new Date("2024-01-01"),
    isEarned: true,
    rarity: "legendary",
  },
  {
    id: "all-stars",
    name: "Todas as Estrelas",
    description: "Obteve nota máxima em 10 lições",
    icon: Star,
    isEarned: false,
    rarity: "epic",
  },
  {
    id: "grandmaster",
    name: "Grão-Mestre",
    description: "Completou todos os cursos disponíveis",
    icon: Crown,
    isEarned: false,
    rarity: "legendary",
  },
]

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
              const Icon = badge.icon
              
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
                const Icon = badge.icon
                
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
