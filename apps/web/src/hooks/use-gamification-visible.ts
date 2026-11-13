import { useAuth } from "@/contexts/auth-context"

/**
 * Se a interface mostra a gamificação (XP, nível, sequência, badges e ranking). O grupo
 * `controle` do experimento usa a plataforma sem esses elementos; o progresso (lições e
 * passos concluídos) continua visível para todos. A API segue registrando XP normalmente.
 */
export function useGamificationVisible(): boolean {
  const { profile } = useAuth()
  return profile?.experiment_condition !== "controle"
}
