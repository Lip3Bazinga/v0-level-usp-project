import type { Difficulty } from "@levelusp/contracts"

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
}

/** Cores do selo de dificuldade (verde, amarelo, vermelho). */
export const DIFFICULTY_BADGE_CLASSES: Record<Difficulty, string> = {
  iniciante: "bg-green-100 text-green-700",
  intermediario: "bg-yellow-100 text-yellow-700",
  avancado: "bg-red-100 text-red-700",
}
