"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react"
import type { LessonStep, StepQuizResult } from "@levelusp/contracts"
import { cn } from "@/lib/utils"
import { StepMarkdown } from "./step-markdown"

const OPTION_LETTERS = "ABCDEFGH"

interface QuizStepProps {
  step: LessonStep
  isCompleted: boolean
  isBusy: boolean
  /** Correção devolvida pela API para o último envio; null antes de enviar. */
  result: StepQuizResult | null
  onSubmit: (answers: number[]) => void
  /** Apaga a correção para o aluno responder de novo. */
  onRetry: () => void
  onContinue: () => void
}

/**
 * Quiz do passo: uma alternativa por questão, correção feita na API. Depois do envio mostra
 * acerto/erro por questão e a explicação (a API só manda a das questões acertadas enquanto
 * o quiz não é aprovado).
 */
export function QuizStep({ step, isCompleted, isBusy, result, onSubmit, onRetry, onContinue }: QuizStepProps): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const questions = step.quiz_questions
  const isAnswered = questions.every((_question, index) => answers[index] !== undefined)
  const isLocked = result !== null || isBusy

  const handleRetry = (): void => {
    setAnswers({})
    onRetry()
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-8">
      <h2 className="mb-2 text-2xl font-bold text-level-purple-dark">{step.title}</h2>
      {step.narrative_markdown.trim() && <StepMarkdown content={step.narrative_markdown} className="mb-6" />}
      <ol className="space-y-6">
        {questions.map((question, questionIndex) => {
          const review = result?.review.find((item) => item.index === questionIndex)
          return (
            <li key={questionIndex}>
              <fieldset disabled={isLocked}>
                <legend className="mb-3 flex items-start gap-2 text-sm font-semibold text-level-purple-dark">
                  <span>{questionIndex + 1}.</span>
                  <StepMarkdown content={question.prompt} className="flex-1" />
                  {review && (review.correct
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-label="Resposta certa" />
                    : <XCircle className="h-5 w-5 shrink-0 text-red-500" aria-label="Resposta errada" />)}
                </legend>
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const isChosen = answers[questionIndex] === optionIndex
                    return (
                      <label
                        key={optionIndex}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-sm transition-colors",
                          isChosen ? "border-level-purple bg-level-purple-light" : "border-gray-200 hover:border-level-purple/40",
                          isChosen && review?.correct === true && "border-green-500 bg-green-50",
                          isChosen && review?.correct === false && "border-red-400 bg-red-50",
                          isLocked && "cursor-default",
                        )}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={`passo-${step.id}-questao-${questionIndex}`}
                          checked={isChosen}
                          onChange={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                        />
                        <span className="font-bold text-level-purple">{OPTION_LETTERS.charAt(optionIndex)}</span>
                        <StepMarkdown content={option} className="flex-1" />
                      </label>
                    )
                  })}
                </div>
                {review?.explanation && (
                  <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    <StepMarkdown content={review.explanation} />
                  </div>
                )}
              </fieldset>
            </li>
          )
        })}
      </ol>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6" aria-live="polite">
        {result ? (
          <p className={cn("text-sm font-semibold", result.passed ? "text-green-700" : "text-red-600")}>
            {result.passed
              ? `Aprovado: ${result.correct_count} de ${result.total} (${result.score}%).`
              : `Você acertou ${result.correct_count} de ${result.total} (${result.score}%). É preciso ${result.passing_score}% — revise e tente de novo.`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{isCompleted ? "Quiz já concluído." : "Escolha uma alternativa em cada questão."}</p>
        )}
        {result?.passed || (isCompleted && result === null) ? (
          <button type="button" onClick={onContinue} className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-6 py-3 text-sm font-semibold text-white hover:bg-level-purple-dark">
            Continuar <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : result ? (
          <button type="button" onClick={handleRetry} className="flex items-center gap-2 rounded-xl border border-level-purple px-6 py-3 text-sm font-semibold text-level-purple hover:bg-level-purple-light">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Tentar de novo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSubmit(questions.map((_question, index) => answers[index] ?? 0))}
            disabled={!isAnswered || isBusy}
            className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-6 py-3 text-sm font-semibold text-white hover:bg-level-purple-dark disabled:opacity-60"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Enviar respostas
          </button>
        )}
      </div>
    </article>
  )
}
