import { z } from "zod"
import { patchSchemaOf } from "./courses"

export type BadgeRarity = "common" | "rare" | "epic" | "legendary"
export type BadgeCriteriaType =
  | "total_xp" | "current_streak" | "max_streak" | "lessons_completed" | "courses_completed" | "manual"

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
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

export interface GrantedBadge {
  id: string
  name: string
  icon: string
  rarity: string
}

export const badgeInputSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9_-]{2,40}$/, "Use letras minúsculas, números, _ ou -"),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(""),
  icon: z.string().trim().max(40).default("Award"),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  criteria_type: z.enum(["total_xp", "current_streak", "max_streak", "lessons_completed", "courses_completed", "manual"]),
  criteria_value: z.number().int().min(0).default(0),
  sort_order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})
export type BadgeInput = z.infer<typeof badgeInputSchema>
/** PATCH sem defaults (senão um PATCH só com `name` zeraria os demais campos). */
export const badgeUpdateSchema = patchSchemaOf(badgeInputSchema.omit({ id: true }))
export type BadgeUpdateInput = z.infer<typeof badgeUpdateSchema>

/** XP necessário por nível (regra herdada: 1000 XP por nível). */
export const XP_PER_LEVEL = 1000
export function levelForXp(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / XP_PER_LEVEL) + 1)
}
