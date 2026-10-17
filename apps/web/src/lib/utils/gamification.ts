import { XP_PER_LEVEL } from "@levelusp/contracts"

/** XP total acumulado ao concluir o nível `level` (régua linear da API). */
function xpForLevel(level: number): number {
  return level * XP_PER_LEVEL
}

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
 * Posição do usuário dentro do nível atual. A barra de nível mede o XP ganho no nível
 * sobre a faixa do nível, e não sobre o teto absoluto: com 1.500 XP no nível 2 são
 * "500/1.000 XP" (50%), e não "500/2.000 XP" (25%).
 */
export function computeLevelProgress(totalXp: number, level: number): LevelProgress {
  const xpFloor = xpForLevel(level - 1)
  const xpCeil = xpForLevel(level)
  const xpInLevel = totalXp - xpFloor
  const xpLevelRange = xpCeil - xpFloor
  return { xpFloor, xpCeil, xpInLevel, xpLevelRange, levelPercent: toClampedPercent(xpInLevel, xpLevelRange) }
}

/** Fração `part / whole` em 0–100, arredondada e limitada a 100 (0 quando `whole` não é positivo). */
export function toClampedPercent(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.min(100, Math.round((part / whole) * 100))
}
