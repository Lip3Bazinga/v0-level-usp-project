import { xpForLevel } from "@levelusp/contracts"

/** Onde o XP total cai dentro do nível atual (para barras de progresso). */
export interface LevelProgress {
  /** XP total no início do nível atual. */
  xpFloor: number
  /** XP total necessário para chegar ao próximo nível. */
  xpCeil: number
  /** XP acumulado dentro do nível atual. */
  xpInLevel: number
  /** Tamanho da faixa do nível atual (teto − piso): o XP do início do nível até o próximo. */
  xpLevelRange: number
  /** 0–100: quanto da faixa do nível atual já foi percorrido. */
  levelPercent: number
}

/**
 * Posição do usuário dentro do nível atual, pela curva crescente do contrato
 * (`xpForLevel`: 0, 1000, 2500, 4500, 7000…). A barra mede o XP ganho no nível sobre a
 * faixa do nível, e não sobre o teto absoluto: com 1.500 XP no nível 2 (faixa 1000–2500)
 * são "500/1.500 XP" (33%).
 */
export function computeLevelProgress(totalXp: number, level: number): LevelProgress {
  const xpFloor = xpForLevel(level)
  const xpCeil = xpForLevel(level + 1)
  const xpInLevel = totalXp - xpFloor
  const xpLevelRange = xpCeil - xpFloor
  return { xpFloor, xpCeil, xpInLevel, xpLevelRange, levelPercent: toClampedPercent(xpInLevel, xpLevelRange) }
}

/** Fração `part / whole` em 0–100, arredondada e limitada a 100 (0 quando `whole` não é positivo). */
export function toClampedPercent(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.min(100, Math.round((part / whole) * 100))
}
