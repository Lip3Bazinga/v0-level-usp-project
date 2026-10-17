/**
 * Regras puras de gamificação (sem I/O) — testadas isoladamente.
 */
import { levelForXp, type BadgeCriteriaType, type StreakResult } from "@levelusp/contracts"

export { levelForXp }

/** Data civil (yyyy-mm-dd) no fuso de São Paulo — "hoje" para fins de sequência. */
export function saoPauloDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

export function previousDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Sequência diária: atividade hoje mantém, ontem incrementa, antes disso
 * reinicia em 1. Login e conclusão de lição contam como atividade.
 */
export function nextStreak(lastActivity: string | null, today: string, current: number): StreakResult {
  if (lastActivity === today) return { streak: Math.max(current, 1), increased: false, reset: false }
  if (lastActivity && lastActivity === previousDate(today)) return { streak: current + 1, increased: true, reset: false }
  return { streak: 1, increased: current !== 1 || lastActivity === null, reset: lastActivity !== null && current > 0 }
}

export interface PlayerStats {
  total_xp: number
  current_streak: number
  max_streak: number
  lessons_completed: number
  courses_completed: number
}

export interface BadgeRule {
  id: string
  criteriaType: BadgeCriteriaType
  criteriaValue: number
  active: boolean
}

/** Badges automáticos que o jogador passou a merecer e ainda não tem. */
export function eligibleBadges(stats: PlayerStats, rules: BadgeRule[], owned: Set<string>): string[] {
  return rules
    .filter((b) => b.active && b.criteriaType !== "manual" && !owned.has(b.id))
    .filter((b) => (stats[b.criteriaType as keyof PlayerStats] ?? 0) >= b.criteriaValue)
    .map((b) => b.id)
}
