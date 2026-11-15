"use client"

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import type { LessonStep } from "@levelusp/contracts"
import { StepMarkdown } from "./step-markdown"

interface ReadingStepProps {
  step: LessonStep
  isCompleted: boolean
  isBusy: boolean
  /** Conclui o passo (primeira vez) ou só avança (passo já concluído). */
  onContinue: () => void
}

/** Passo de leitura: o texto e o botão que conclui e leva ao próximo passo. */
export function ReadingStep({ step, isCompleted, isBusy, onContinue }: ReadingStepProps): React.JSX.Element {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-8">
      <h2 className="mb-6 text-2xl font-bold text-level-purple-dark">{step.title}</h2>
      <StepMarkdown content={step.narrative_markdown} />
      <div className="mt-10 flex items-center justify-between gap-4 border-t border-gray-100 pt-6">
        {isCompleted ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Leitura concluída
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={isBusy}
          className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-60"
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Continuar
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
