"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DraftStepVerifyInput, DraftStepVerifyResult } from "@levelusp/contracts"
import { useSubmitLock } from "@/hooks/use-submit-lock"
import { getErrorMessage, isApiError, verifyDraftStep } from "@/lib/api"
import {
  buildVerifyRequest, exerciseSteps, remapWrongSolutions, requestSignature,
  type GabaritoLesson, type StepTestState, type WrongSolutionsByStep,
} from "./gabarito-test"

/** Passo em teste e total de passos do teste em andamento. */
export interface GabaritoProgress {
  current: number
  total: number
}

/** Estado e ação do "Testar gabarito". */
export interface UseGabaritoTestResult {
  /** Situação de cada passo de exercício do último teste, pela `order` do passo. */
  states: Readonly<Record<number, StepTestState>>
  isRunning: boolean
  /** null quando não há teste em andamento. */
  progress: GabaritoProgress | null
  /** Testa todos os passos de exercício do rascunho, um por vez. Ignora a chamada se já há um teste rodando. */
  run: (lesson: GabaritoLesson, wrongSolutions: WrongSolutionsByStep) => Promise<void>
}

/** Soluções erradas do editor e o que as mantém no passo certo. */
export interface UseWrongSolutionsResult {
  wrongSolutions: WrongSolutionsByStep
  setWrongSolutions: (wrongSolutions: WrongSolutionsByStep) => void
  /** Para o `onStepsReordered` da aba Passos: leva cada lista para a `order` nova do seu passo. */
  handleStepsReordered: (previousOrders: readonly number[]) => void
  /** Muda quando os passos são renumerados; use como `key` do painel para descartar resultados que ficaram em outro passo. */
  resultsKey: number
}

/**
 * Soluções erradas do "Testar gabarito", só em memória (nunca vão no salvar). Elas são guardadas
 * pela `order` do passo; quando um passo é removido ou movido, a lista acompanha o passo e os
 * resultados de teste (também por `order`) são descartados.
 */
export function useWrongSolutions(): UseWrongSolutionsResult {
  const [wrongSolutions, setWrongSolutions] = useState<WrongSolutionsByStep>({})
  const [resultsKey, setResultsKey] = useState(0)
  const handleStepsReordered = useCallback((previousOrders: readonly number[]): void => {
    setWrongSolutions((current) => remapWrongSolutions(current, previousOrders))
    setResultsKey((current) => current + 1)
  }, [])
  return { wrongSolutions, setWrongSolutions, handleStepsReordered, resultsKey }
}

/** Chamada à API que testa um passo (trocada nos testes). */
export type VerifyDraftStep = (input: DraftStepVerifyInput) => Promise<DraftStepVerifyResult>

const BAD_REQUEST_STATUS = 400
const STEP_ERROR_FALLBACK = "Não foi possível testar este passo. Tente novamente."

/**
 * "Testar gabarito" do editor: envia cada passo de exercício do rascunho à API, em sequência (o
 * corretor é compartilhado), e guarda o resultado por passo. Passo incompleto é recusado aqui
 * mesmo, sem pedido. Um erro que não seja de validação (limite de pedidos, corretor fora do ar)
 * interrompe o teste: os passos seguintes ficam como não testados.
 */
export function useGabaritoTest(verify: VerifyDraftStep = verifyDraftStep): UseGabaritoTestResult {
  const lock = useSubmitLock()
  const [states, setStates] = useState<Record<number, StepTestState>>({})
  const [progress, setProgress] = useState<GabaritoProgress | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const run = async (lesson: GabaritoLesson, wrongSolutions: WrongSolutionsByStep): Promise<void> => {
    if (!lock.acquire()) return
    const targets = exerciseSteps(lesson.steps)
    const setState = (order: number, state: StepTestState): void => setStates((current) => ({ ...current, [order]: state }))
    setStates(Object.fromEntries(targets.map((step): [number, StepTestState] => [step.order, { status: "pending" }])))
    try {
      for (const [index, step] of targets.entries()) {
        if (!isMountedRef.current) return
        setProgress({ current: index + 1, total: targets.length })
        const drafts = wrongSolutions[step.order] ?? []
        const signature = requestSignature(lesson, step, drafts)
        const request = buildVerifyRequest(lesson, step, drafts)
        if (!request.ok) {
          setState(step.order, { status: "error", message: request.error, signature })
          continue
        }
        setState(step.order, { status: "running" })
        try {
          setState(step.order, { status: "done", result: await verify(request.input), signature })
        } catch (error) {
          setState(step.order, { status: "error", message: getErrorMessage(error, STEP_ERROR_FALLBACK), signature })
          if (isApiError(error, BAD_REQUEST_STATUS)) continue
          for (const skipped of targets.slice(index + 1)) setState(skipped.order, { status: "skipped" })
          return
        }
      }
    } finally {
      setProgress(null)
      lock.release()
    }
  }

  return { states, isRunning: lock.isSubmitting, progress, run }
}
