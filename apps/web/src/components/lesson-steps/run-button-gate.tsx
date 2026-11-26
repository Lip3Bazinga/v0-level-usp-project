"use client"

import { createContext, useContext, useMemo } from "react"
import { isRunButtonUnlocked, resolveRunButtonMinLevel, RUN_BUTTON_MIN_LEVEL } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useGamificationVisible } from "@/hooks/use-gamification-visible"

/** Comando que o aluno digita no terminal enquanto o "Executar" está bloqueado. */
export const TERMINAL_RUN_COMMAND = "python main.py"

/** Situação do botão "Executar" para quem está vendo a lição. */
export interface RunButtonGate {
  isLocked: boolean
  /** Nível que libera o botão (o do curso ou o padrão do contrato). */
  minLevel: number
  /** Motivo do bloqueio, pronto para a tela; `null` com o botão liberado. */
  message: string | null
}

const UNLOCKED_GATE: RunButtonGate = { isLocked: false, minLevel: RUN_BUTTON_MIN_LEVEL, message: null }

/**
 * Texto do bloqueio do "Executar". O grupo `controle` do experimento não vê nível em lugar
 * nenhum da interface, então recebe a orientação sem citar o nível (`isLevelVisible` false).
 */
export function runButtonLockMessage(minLevel: number, isLevelVisible: boolean): string {
  return isLevelVisible
    ? `Executar libera no nível ${minLevel}; até lá, use o terminal: ${TERMINAL_RUN_COMMAND}`
    : `Por enquanto, rode seu código pelo terminal: ${TERMINAL_RUN_COMMAND}`
}

/**
 * Decide, nas telas do aluno, se o "Executar" está bloqueado: o nível do jogador (do
 * `AuthContext`, que muda sem recarregar quando ele sobe de nível) contra o limite do curso
 * (`lesson.run_button_min_level`). Professor e admin nunca ficam bloqueados; enquanto a sessão
 * carrega, também não (evita piscar o bloqueio para quem já passou do nível). Visitante sem
 * sessão conta como nível 1. É regra de interface: nada disto é validado na API.
 */
export function useRunButtonGate(courseMinLevel: number | null | undefined): RunButtonGate {
  const { profile, isLoading } = useAuth()
  const isLevelVisible = useGamificationVisible()
  const minLevel = resolveRunButtonMinLevel(courseMinLevel)
  const isStaff = profile?.role === "teacher" || profile?.role === "admin"
  const isLocked = !isLoading && !isStaff && !isRunButtonUnlocked(profile?.level ?? 1, courseMinLevel)
  return useMemo(
    () => ({ isLocked, minLevel, message: isLocked ? runButtonLockMessage(minLevel, isLevelVisible) : null }),
    [isLocked, minLevel, isLevelVisible],
  )
}

const RunButtonGateContext = createContext<RunButtonGate>(UNLOCKED_GATE)

interface RunButtonGateProviderProps {
  gate: RunButtonGate
  children: React.ReactNode
}

/** Entrega aos passos filhos a situação do "Executar" calculada pelo player do aluno ({@link useRunButtonGate}). */
export function RunButtonGateProvider({ gate, children }: RunButtonGateProviderProps): React.JSX.Element {
  return <RunButtonGateContext value={gate}>{children}</RunButtonGateContext>
}

/**
 * Situação do "Executar" para o passo atual. Fora de um {@link RunButtonGateProvider} (a prévia
 * do professor, que não tem sessão de aluno nem usa o `AuthContext`) o botão está sempre liberado.
 */
export function useProvidedRunButtonGate(): RunButtonGate {
  return useContext(RunButtonGateContext)
}
