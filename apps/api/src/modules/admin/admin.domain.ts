/**
 * Regras puras da administração (sem I/O) — testadas isoladamente.
 */
import type { AdminUpdateUserInput } from "@levelusp/contracts"
import { previousDate, saoPauloDate } from "@/common/time/time"

/** Chaves de configuração enviadas de uma vez (evita abuso de PUT gigante). */
export const MAX_SETTINGS_PER_REQUEST = 100

/** Ação de um admin sobre um usuário, para checar se ele está agindo sobre si mesmo. */
export type SelfAction = { kind: "update"; patch: Pick<AdminUpdateUserInput, "role" | "suspended"> } | { kind: "delete" }

/**
 * Proteção contra o admin se trancar fora: não pode rebaixar o próprio papel,
 * se suspender nem excluir a própria conta. Devolve a mensagem de erro, ou null.
 */
export function selfActionViolation(actorId: string, targetId: string, action: SelfAction): string | null {
  if (actorId !== targetId) return null
  if (action.kind === "delete") return "Você não pode excluir a própria conta pelo painel."
  if (action.patch.role !== undefined && action.patch.role !== "admin") {
    return "Você não pode remover o seu próprio acesso de administrador."
  }
  if (action.patch.suspended === true) return "Você não pode suspender a própria conta."
  return null
}

/** Últimos `dayCount` dias civis (São Paulo), do mais antigo a hoje. */
export function lastDays(dayCount: number, now: Date = new Date()): string[] {
  let oldestDay = saoPauloDate(now)
  const days = [oldestDay]
  while (days.length < dayCount) {
    oldestDay = previousDate(oldestDay)
    days.unshift(oldestDay)
  }
  return days
}

/** Contagem agregada de um dia, entrada de {@link dailySeries}. */
export interface DailyCount {
  /** Data civil yyyy-mm-dd. */
  day: string
  count: number
}

/** Série diária sem buracos a partir de contagens agregadas por dia. */
export function dailySeries(counts: DailyCount[], dayCount: number, now: Date = new Date()): number[] {
  const countByDay = new Map(counts.map((daily) => [daily.day, Number(daily.count)]))
  return lastDays(dayCount, now).map((day) => countByDay.get(day) ?? 0)
}

/** Percentual inteiro (0–100); 0 quando não há base. */
export function percentage(part: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.round((Math.min(part, total) / total) * 100)
}
