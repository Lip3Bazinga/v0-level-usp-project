export type BadgeRarity = "common" | "rare" | "epic" | "legendary"

export type BadgeCriteriaType =
  | "total_xp"
  | "current_streak"
  | "max_streak"
  | "lessons_completed"
  | "courses_completed"
  | "manual"

export interface Badge {
  id: string
  name: string
  description: string
  icon: string            // nome do ícone lucide (ex: "Flame")
  rarity: BadgeRarity
  criteria_type: BadgeCriteriaType
  criteria_value: number
  sort_order: number
  active: boolean
  created_at: string
}

export interface UserBadge {
  user_id: string
  badge_id: string
  earned_at: string
}
