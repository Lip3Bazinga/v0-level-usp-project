/**
 * Regras puras da administração (sem I/O) — testadas isoladamente.
 */
import type { AdminUpdateUserInput } from "@levelusp/contracts"
import { previousDate, saoPauloDate } from "../gamification/gamification.domain"

/**
 * Proteção contra o admin se trancar fora: não pode rebaixar o próprio papel,
 * se suspender nem excluir a própria conta. Devolve a mensagem de erro, ou null.
 */
export function selfActionViolation(
  actorId: string,
  targetId: string,
  action: { kind: "update"; patch: Pick<AdminUpdateUserInput, "role" | "suspended"> } | { kind: "delete" },
): string | null {
  if (actorId !== targetId) return null
  if (action.kind === "delete") return "Você não pode excluir a própria conta pelo painel."
  if (action.patch.role !== undefined && action.patch.role !== "admin") {
    return "Você não pode remover o seu próprio acesso de administrador."
  }
  if (action.patch.suspended === true) return "Você não pode suspender a própria conta."
  return null
}

/** Últimos `days` dias civis (São Paulo), do mais antigo a hoje. */
export function lastDays(days: number, now: Date = new Date()): string[] {
  const out: string[] = [saoPauloDate(now)]
  while (out.length < days) out.unshift(previousDate(out[0]!))
  return out
}

/** Série diária sem buracos a partir de linhas agregadas por dia (yyyy-mm-dd). */
export function dailySeries(rows: { day: string; n: number }[], days: number, now: Date = new Date()): number[] {
  const byDay = new Map(rows.map((r) => [r.day, Number(r.n)]))
  return lastDays(days, now).map((d) => byDay.get(d) ?? 0)
}

/** Percentual inteiro (0–100); 0 quando não há base. */
export function percentage(part: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.round((Math.min(part, total) / total) * 100)
}

/** Chaves de configuração enviadas de uma vez (evita abuso de PUT gigante). */
export const MAX_SETTINGS_PER_REQUEST = 100
