"use client"

import { createContext, useContext } from "react"
import type { HintReveal, ParsonsPlacement, ProjectFile, SolutionReveal, StepPredictResult, StepSubmitResult } from "@levelusp/contracts"
import { fetchRevealedStepHints, revealStepHint, revealStepSolution, submitStep, submitStepArrangement, submitStepPrediction } from "@/lib/api"

/**
 * Tudo que um passo (exercício ou previsão) pede ao "mundo de fora": corrigir, revelar dicas e a
 * solução. O player do aluno usa a API (padrão); a prévia do professor injeta um backend local
 * (`createPreviewBackend`), de modo que os mesmos componentes de passo servem aos dois sem copiar
 * nada. As assinaturas são as de `lib/api/steps.ts`.
 */
export interface StepBackend {
  /** true na prévia do professor: sem API, sem progresso, dicas e solução sempre liberadas. */
  isPreview: boolean
  submitStep: (lessonId: string, stepId: string, files: readonly ProjectFile[]) => Promise<StepSubmitResult>
  submitStepArrangement: (lessonId: string, stepId: string, arrangement: readonly ParsonsPlacement[]) => Promise<StepSubmitResult>
  submitStepPrediction: (lessonId: string, stepId: string, output: string) => Promise<StepPredictResult>
  revealStepHint: (lessonId: string, stepId: string) => Promise<HintReveal>
  fetchRevealedStepHints: (lessonId: string, stepId: string) => Promise<HintReveal[]>
  revealStepSolution: (lessonId: string, stepId: string) => Promise<SolutionReveal>
}

/**
 * Erro de um backend de passo cuja mensagem (pt-BR) já é segura para a tela. O `useStepHelp` a
 * mostra como está, no lugar do texto genérico reservado a erros desconhecidos.
 */
export class StepBackendError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StepBackendError"
  }
}

/** Backend do aluno: cada chamada vai para a API (única fonte de veredito, dicas e solução). */
export const API_STEP_BACKEND: StepBackend = {
  isPreview: false,
  submitStep,
  submitStepArrangement,
  submitStepPrediction,
  revealStepHint,
  fetchRevealedStepHints,
  revealStepSolution,
}

const StepBackendContext = createContext<StepBackend>(API_STEP_BACKEND)

interface StepBackendProviderProps {
  backend: StepBackend
  children: React.ReactNode
}

/** Troca o backend dos passos filhos (a prévia do professor). Sem ele, valem as chamadas à API. */
export function StepBackendProvider({ backend, children }: StepBackendProviderProps): React.JSX.Element {
  return <StepBackendContext value={backend}>{children}</StepBackendContext>
}

/** Backend dos passos em uso; fora de um {@link StepBackendProvider}, o da API (comportamento do aluno). */
export function useStepBackend(): StepBackend {
  return useContext(StepBackendContext)
}
