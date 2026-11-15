"use client"

import { useEffect, useState } from "react"
import type { HintReveal, LessonStepProgress, SolutionReveal } from "@levelusp/contracts"
import { fetchRevealedStepHints, getErrorMessage, HTTP_STATUS, isApiError, revealStepHint, revealStepSolution } from "@/lib/api"

/** Ação em andamento num passo com resposta (exercício ou previsão). */
export type StepAction = "submit" | "hint" | "solution"

interface UseStepHelpOptions {
  lessonId: string
  stepId: string
  progress: LessonStepProgress | undefined
  /** Reflete na lição o que a API devolveu (dicas reveladas, solução vista). */
  onProgress: (patch: Partial<LessonStepProgress>) => void
  /** Sessão expirada numa ação: a página leva ao login. */
  onUnauthorized: () => void
}

/** Dicas, solução e estado das ações de um passo devolvidos por `useStepHelp`. */
export interface UseStepHelpResult {
  hints: HintReveal[]
  /** Solução já revelada pela API nesta visita; null antes disso. */
  solution: SolutionReveal | null
  busy: StepAction | null
  /** Mensagem de erro da última ação (texto pt-BR da API) ou aviso da própria tela. */
  message: string | null
  setMessage: (message: string | null) => void
  /** Roda uma ação da API com o estado de ocupado; 401 leva ao login e o resto vira `message`. */
  run: (action: StepAction, task: () => Promise<void>, fallback: string) => Promise<void>
  revealHint: () => Promise<void>
  revealSolution: () => Promise<void>
}

/**
 * Dicas (uma a uma) e solução de um passo, comuns ao exercício e à previsão. Tudo vem da API:
 * a tela só guarda o que já foi revelado. Reabrir a lição traz de volta as dicas já vistas.
 */
export function useStepHelp({ lessonId, stepId, progress, onProgress, onUnauthorized }: UseStepHelpOptions): UseStepHelpResult {
  const [hints, setHints] = useState<HintReveal[]>([])
  const [solution, setSolution] = useState<SolutionReveal | null>(null)
  const [busy, setBusy] = useState<StepAction | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const hintsRevealed = progress?.hints_revealed ?? 0
  const isCompleted = progress?.status === "completed"

  useEffect(() => {
    if (hintsRevealed === 0) return
    let isCurrent = true
    fetchRevealedStepHints(lessonId, stepId)
      .then((revealed) => {
        if (isCurrent) setHints((current) => (current.length >= revealed.length ? current : revealed))
      })
      .catch(() => {
        // Sem as dicas antigas o aluno ainda pode pedir a próxima.
      })
    return () => {
      isCurrent = false
    }
  }, [lessonId, stepId, hintsRevealed])

  const run = async (action: StepAction, task: () => Promise<void>, fallback: string): Promise<void> => {
    setBusy(action)
    setMessage(null)
    try {
      await task()
    } catch (error) {
      if (isApiError(error, HTTP_STATUS.UNAUTHORIZED)) onUnauthorized()
      else setMessage(getErrorMessage(error, fallback))
    } finally {
      setBusy(null)
    }
  }

  const revealHint = (): Promise<void> =>
    run("hint", async () => {
      const hint = await revealStepHint(lessonId, stepId)
      setHints((current) => [...current.filter((item) => item.index !== hint.index), hint].sort((first, second) => first.index - second.index))
      onProgress({ hints_revealed: Math.max(hintsRevealed, hint.index + 1) })
    }, "Não foi possível revelar a dica.")

  const revealSolution = (): Promise<void> =>
    run("solution", async () => {
      setSolution(await revealStepSolution(lessonId, stepId))
      if (!isCompleted) onProgress({ solution_viewed: true })
    }, "A solução ainda não está liberada.")

  return { hints, solution, busy, message, setMessage, run, revealHint, revealSolution }
}
