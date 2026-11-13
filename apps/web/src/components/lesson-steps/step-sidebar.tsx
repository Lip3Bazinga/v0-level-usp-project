"use client"

import { BookOpen, CheckCircle2, Code2, HelpCircle, Lock, type LucideIcon } from "lucide-react"
import type { LessonStep, StepKind } from "@levelusp/contracts"
import { cn } from "@/lib/utils"
import type { StepState } from "@/lib/utils/step-player"

const KIND_ICONS: Readonly<Record<StepKind, LucideIcon>> = { leitura: BookOpen, exercicio: Code2, quiz: HelpCircle }
const KIND_LABELS: Readonly<Record<StepKind, string>> = { leitura: "Leitura", exercicio: "Exercício", quiz: "Quiz" }
const STATE_LABELS: Readonly<Record<StepState, string>> = { completed: "concluído", current: "passo atual", available: "disponível", locked: "bloqueado" }

interface StepSidebarProps {
  steps: readonly LessonStep[]
  states: readonly StepState[]
  onSelect: (index: number) => void
}

/** Lista dos passos da lição com a situação de cada um; passos travados não são clicáveis. */
export function StepSidebar({ steps, states, onSelect }: StepSidebarProps): React.JSX.Element {
  return (
    <nav aria-label="Passos da lição" className="shrink-0 border-b border-border bg-gray-50 lg:w-64 lg:border-b-0 lg:border-r">
      <ol className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible lg:p-3">
        {steps.map((step, index) => {
          const state = states[index] ?? "locked"
          const Icon = state === "completed" ? CheckCircle2 : state === "locked" ? Lock : KIND_ICONS[step.kind]
          return (
            <li key={step.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={state === "locked"}
                aria-current={state === "current" ? "step" : undefined}
                aria-label={`Passo ${step.order}: ${step.title} (${KIND_LABELS[step.kind]}, ${STATE_LABELS[state]})`}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  state === "current" && "bg-level-purple text-white",
                  state === "completed" && "text-green-700 hover:bg-green-50",
                  state === "available" && "text-level-purple-dark hover:bg-level-purple-light",
                  state === "locked" && "cursor-not-allowed text-gray-400",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="max-w-40 truncate lg:max-w-none">
                  <span className="font-semibold">{step.order}.</span> {step.title}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
