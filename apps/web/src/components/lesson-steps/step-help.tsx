"use client"

import { Eye, Lightbulb } from "lucide-react"
import type { HintReveal, LessonStepProgress } from "@levelusp/contracts"
import { canRevealSolution } from "@/lib/utils/step-player"
import { useStepBackend } from "./step-backend"
import { StepMarkdown } from "./step-markdown"

interface RevealedHintsProps {
  hints: readonly HintReveal[]
}

/** Dicas que o aluno já revelou neste passo, na ordem. */
export function RevealedHints({ hints }: RevealedHintsProps): React.JSX.Element | null {
  if (hints.length === 0) return null
  return (
    <ol className="mt-4 space-y-2" aria-label="Dicas reveladas">
      {hints.map((hint) => (
        <li key={hint.index} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="mb-1 font-semibold">Dica {hint.index + 1}</p>
          <StepMarkdown content={hint.text} />
        </li>
      ))}
    </ol>
  )
}

interface HelpButtonsProps {
  hintCount: number
  progress: LessonStepProgress | undefined
  solutionAfterAttempts: number
  /** A solução já está na tela: o botão "Ver solução" some. */
  isSolutionShown: boolean
  isBusy: boolean
  onHint: () => void
  onSolution: () => void
}

/**
 * Botões "Dica (n/total)" e "Ver solução" (este só depois das tentativas que a lição exige; na
 * prévia do professor fica sempre disponível).
 */
export function HelpButtons({ hintCount, progress, solutionAfterAttempts, isSolutionShown, isBusy, onHint, onSolution }: HelpButtonsProps): React.JSX.Element {
  const { isPreview } = useStepBackend()
  const hintsRevealed = progress?.hints_revealed ?? 0
  return (
    <>
      {hintCount > 0 && (
        <button
          type="button"
          onClick={onHint}
          disabled={isBusy || hintsRevealed >= hintCount}
          className="flex items-center gap-2 rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
        >
          <Lightbulb className="h-4 w-4" aria-hidden="true" /> Dica ({hintsRevealed}/{hintCount})
        </button>
      )}
      {(isPreview || canRevealSolution(progress, solutionAfterAttempts)) && !isSolutionShown && (
        <button
          type="button"
          onClick={onSolution}
          disabled={isBusy}
          className="flex items-center gap-2 rounded-xl border border-level-purple px-4 py-2.5 text-sm font-semibold text-level-purple hover:bg-level-purple-light disabled:opacity-50"
        >
          <Eye className="h-4 w-4" aria-hidden="true" /> Ver solução
        </button>
      )}
    </>
  )
}

interface SolutionCountdownProps {
  progress: LessonStepProgress | undefined
  solutionAfterAttempts: number
}

/** Aviso de quantas tentativas faltam para a solução ficar disponível (some quando ela libera). */
export function SolutionCountdown({ progress, solutionAfterAttempts }: SolutionCountdownProps): React.JSX.Element | null {
  const { isPreview } = useStepBackend()
  const attempts = progress?.attempts ?? 0
  if (isPreview || progress?.status === "completed" || solutionAfterAttempts <= 0 || attempts === 0 || canRevealSolution(progress, solutionAfterAttempts)) return null
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      A solução fica disponível depois de {solutionAfterAttempts} tentativas ({attempts} até agora).
    </p>
  )
}
