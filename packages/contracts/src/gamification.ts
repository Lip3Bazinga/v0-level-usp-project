import { z } from "zod"
import { patchSchemaOf } from "./schema"

export const BADGE_RARITIES = ["common", "rare", "epic", "legendary"] as const
export const badgeRaritySchema = z.enum(BADGE_RARITIES)
/** Raridade de um badge (só visual: a cor e o brilho do ícone). */
export type BadgeRarity = z.infer<typeof badgeRaritySchema>

export const BADGE_CRITERIA_TYPES = [
  "total_xp", "current_streak", "max_streak", "lessons_completed", "courses_completed", "certificates_issued", "manual",
] as const
export const badgeCriteriaTypeSchema = z.enum(BADGE_CRITERIA_TYPES)
/**
 * Métrica comparada com `criteria_value` para conceder o badge; `manual` nunca é automático.
 * `certificates_issued` conta certificados de curso emitidos (badge "Formado(a)").
 */
export type BadgeCriteriaType = z.infer<typeof badgeCriteriaTypeSchema>

/** Ids de badge são slugs legíveis (aparecem em URLs e no seed). */
export const BADGE_ID_PATTERN = /^[a-z0-9_-]{2,40}$/

/** Badge do catálogo; concedido quando a métrica de `criteria_type` alcança `criteria_value`. */
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

/** Badge conquistado por um usuário. */
export interface UserBadge {
  user_id: string
  badge_id: string
  earned_at: string
}

/** Badge recém-conquistado, como aparece na comemoração depois de concluir uma lição. */
export interface GrantedBadge {
  id: string
  name: string
  icon: string
  rarity: string
}

export const badgeInputSchema = z.object({
  id: z.string().trim().regex(BADGE_ID_PATTERN, "Use letras minúsculas, números, _ ou -"),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(""),
  icon: z.string().trim().max(40).default("Award"),
  rarity: badgeRaritySchema.default("common"),
  criteria_type: badgeCriteriaTypeSchema,
  criteria_value: z.number().int().min(0).default(0),
  sort_order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})
/** Corpo de `POST /admin/badges`; o `id` é o slug (ver {@link BADGE_ID_PATTERN}). */
export type BadgeInput = z.infer<typeof badgeInputSchema>
/** PATCH sem defaults (senão um PATCH só com `name` zeraria os demais campos). */
export const badgeUpdateSchema = patchSchemaOf(badgeInputSchema.omit({ id: true }))
/** Corpo de `PATCH /admin/badges/:id` (o id não muda). */
export type BadgeUpdateInput = z.infer<typeof badgeUpdateSchema>

/**
 * Fator da curva de XP: `xpForLevel(level) = XP_CURVE_FACTOR · (level − 1) · (level + 2)`,
 * ou seja 0, 1000, 2500, 4500, 7000… — cada nível pede mais que o anterior.
 */
export const XP_CURVE_FACTOR = 250

/**
 * XP por nível da régua linear antiga; não participa mais da curva.
 *
 * @deprecated Use {@link xpForLevel} e {@link levelForXp}. Mantido só até a web trocar a barra de nível.
 */
export const XP_PER_LEVEL = 1000

/**
 * XP total acumulado necessário para estar no nível `level` (1 → 0, 2 → 1000, 3 → 2500,
 * 4 → 4500, 5 → 7000…). Níveis abaixo de 1 valem 0.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return XP_CURVE_FACTOR * (level - 1) * (level + 2)
}

/**
 * Nível correspondente a um total de XP: o maior nível cujo {@link xpForLevel} não passa
 * de `totalXp` (1000 → 2, 2499 → 2, 2500 → 3). Valores negativos ou inválidos dão nível 1.
 */
export function levelForXp(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp < xpForLevel(2)) return 1
  // Inversa de XP_CURVE_FACTOR·(L−1)·(L+2) ≤ xp; os ajustes abaixo cobrem o arredondamento do ponto flutuante.
  const discriminant = 9 + (4 * totalXp) / XP_CURVE_FACTOR
  let level = Math.max(1, Math.floor((Math.sqrt(discriminant) - 1) / 2))
  while (xpForLevel(level + 1) <= totalXp) level++
  while (level > 1 && xpForLevel(level) > totalXp) level--
  return level
}
