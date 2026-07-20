/**
 * Régua de XP: 1000 XP por nível. Fonte única — antes duplicado em
 * cursos/page, perfil/[username]/page, ide/header e progress-context.
 */
export function xpForLevel(level: number): number {
  return level * 1000
}

/** XP acumulado no início do nível atual. */
export function xpFloorForLevel(level: number): number {
  return xpForLevel(level - 1)
}

/** XP total necessário para alcançar o próximo nível. */
export function xpCeilForLevel(level: number): number {
  return xpForLevel(level)
}

/** XP acumulado dentro do nível atual. */
export function xpInLevel(totalXp: number, level: number): number {
  return totalXp - xpFloorForLevel(level)
}
