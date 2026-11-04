import type { Badge, GrantedBadge, UserBadge } from "@levelusp/contracts"
import type { BadgeRow, UserBadgeRow } from "@levelusp/db"

/** Badge do catálogo no formato do contrato. */
export function toBadge(badge: BadgeRow): Badge {
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    rarity: badge.rarity,
    criteria_type: badge.criteriaType,
    criteria_value: badge.criteriaValue,
    sort_order: badge.sortOrder,
    active: badge.active,
    created_at: badge.createdAt,
  }
}

/** Conquista no formato do contrato. */
export function toUserBadge(userBadge: UserBadgeRow): UserBadge {
  return { user_id: userBadge.userId, badge_id: userBadge.badgeId, earned_at: userBadge.earnedAt }
}

/** Badge recém-conquistado, para a comemoração. */
export function toGrantedBadge(badge: Pick<BadgeRow, "id" | "name" | "icon" | "rarity">): GrantedBadge {
  return { id: badge.id, name: badge.name, icon: badge.icon, rarity: badge.rarity }
}
