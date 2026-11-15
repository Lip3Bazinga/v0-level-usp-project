/**
 * Regras puras de gamificação (sem I/O) — testadas isoladamente.
 */
import { levelForXp, type BadgeCriteriaType, type StreakResult } from "@levelusp/contracts"
import { previousDate } from "@/common/time/time"

export { levelForXp }

/**
 * Sequência diária: atividade hoje mantém, ontem incrementa, antes disso
 * reinicia em 1. Atividade = CONCLUIR algo (passo, lição ou quiz); entrar na
 * plataforma não conta.
 */
export function nextStreak(lastActivity: string | null, today: string, current: number): StreakResult {
  if (lastActivity === today) return { streak: Math.max(current, 1), increased: false, reset: false }
  if (lastActivity && lastActivity === previousDate(today)) return { streak: current + 1, increased: true, reset: false }
  return { streak: 1, increased: current !== 1 || lastActivity === null, reset: lastActivity !== null && current > 0 }
}

/**
 * Sequência que o aluno VÊ: a gravada só vale enquanto a última conclusão foi hoje ou
 * ontem; depois disso ela já quebrou (0), mesmo que o banco ainda guarde o número antigo
 * (ele só é reescrito na próxima conclusão).
 */
export function effectiveStreak(lastActivity: string | null, today: string, current: number): number {
  if (lastActivity === today || (lastActivity !== null && lastActivity === previousDate(today))) return current
  return 0
}

/** XP de um passo: metade (arredondada para baixo) quando o aluno viu a solução antes de concluir. */
export function stepXp(xp: number, solutionViewed: boolean): number {
  return solutionViewed ? Math.floor(xp / 2) : xp
}

/** Critérios avaliados automaticamente; "manual" só é concedido pelo admin. */
export type AutomaticCriteria = Exclude<BadgeCriteriaType, "manual">

/** Contadores do perfil, com os mesmos nomes dos critérios de badge. */
export type PlayerStats = Record<AutomaticCriteria, number>

/** O que a concessão automática precisa de um badge do catálogo. */
export interface BadgeRule {
  id: string
  criteriaType: BadgeCriteriaType
  criteriaValue: number
  active: boolean
}

function isAutomatic(criteria: BadgeCriteriaType): criteria is AutomaticCriteria {
  return criteria !== "manual"
}

/** Badges automáticos que o jogador passou a merecer e ainda não tem. */
export function eligibleBadges(stats: PlayerStats, rules: BadgeRule[], owned: ReadonlySet<string>): string[] {
  return rules.flatMap((rule) => {
    if (!rule.active || owned.has(rule.id) || !isAutomatic(rule.criteriaType)) return []
    return stats[rule.criteriaType] >= rule.criteriaValue ? [rule.id] : []
  })
}
