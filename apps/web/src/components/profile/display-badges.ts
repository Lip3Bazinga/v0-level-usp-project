import type { Badge, UserBadge } from "@levelusp/contracts"
import { indexBy } from "@/lib/utils"

/** Badge do catálogo + estado de conquista do usuário sendo exibido. */
export interface DisplayBadge extends Badge {
  isEarned: boolean
  earnedAt?: Date
}

/** Catálogo inteiro, marcando o que o dono do perfil já conquistou e quando. */
export function toDisplayBadges(catalog: readonly Badge[], earnedBadges: readonly UserBadge[]): DisplayBadge[] {
  const earnedByBadgeId = indexBy(earnedBadges, (earned) => earned.badge_id)
  return catalog.map((badge) => {
    const earned = earnedByBadgeId.get(badge.id)
    return { ...badge, isEarned: Boolean(earned), ...(earned && { earnedAt: new Date(earned.earned_at) }) }
  })
}
