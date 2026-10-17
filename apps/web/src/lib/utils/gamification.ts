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
}

export function computeLevelProgress(totalXp: number, level: number): LevelProgress {
  const xpFloor = xpForLevel(level - 1)
  return { xpFloor, xpCeil: xpForLevel(level), xpInLevel: totalXp - xpFloor }
}

/** Fração `part / whole` em 0–100, arredondada e limitada a 100 (0 quando `whole` não é positivo). */
export function toClampedPercent(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.min(100, Math.round((part / whole) * 100))
}
