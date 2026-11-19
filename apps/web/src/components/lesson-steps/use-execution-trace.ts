"use client"

import { useCallback, useRef, useState } from "react"
import type { ProjectFile } from "@levelusp/contracts"
import type { ProjectTrace } from "@/lib/python/project-execution"
import { requestTrace } from "@/lib/python/trace-client"
import { limitTrace } from "@/lib/utils/execution-trace"

/** Situação do visualizador: fechado, executando, com o registro pronto ou com erro. */
export type ExecutionTraceState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; code: string; trace: ProjectTrace }
  | { status: "error"; message: string }

/** Estado e comandos do visualizador de execução devolvidos por `useExecutionTrace`. */
export interface UseExecutionTraceResult {
  state: ExecutionTraceState
  /**
   * Executa o projeto no navegador registrando cada passo do arquivo `entryPath`; `stdin` é o que
   * `input()` lê e `packages` são as bibliotecas da lição, instaladas antes da execução.
   */
  start: (files: readonly ProjectFile[], entryPath: string, stdin?: string, packages?: readonly string[] | null) => void
  close: () => void
}

const FALLBACK_ERROR = "Não foi possível visualizar a execução."

/**
 * Roda o código no Pyodide do navegador com registro passo a passo (visualizador de execução).
 * É só pedagógico: não fala com a API e não conta como tentativa.
 */
export function useExecutionTrace(): UseExecutionTraceResult {
  const [state, setState] = useState<ExecutionTraceState>({ status: "idle" })
  // Só o pedido mais recente pode mudar a tela (o aluno pode fechar ou pedir de novo).
  const latestRequest = useRef(0)

  const start = useCallback((files: readonly ProjectFile[], entryPath: string, stdin = "", packages: readonly string[] | null = null): void => {
    latestRequest.current += 1
    const request = latestRequest.current
    const code = files.find((file) => file.path === entryPath)?.content ?? ""
    setState({ status: "loading" })
    requestTrace({ files, entryPath, stdin, packages: packages ?? [] }).then(
      (trace) => {
        if (latestRequest.current === request) setState({ status: "ready", code, trace: limitTrace(trace) })
      },
      (error: unknown) => {
        if (latestRequest.current === request) setState({ status: "error", message: error instanceof Error ? error.message : FALLBACK_ERROR })
      },
    )
  }, [])

  const close = useCallback((): void => {
    latestRequest.current += 1
    setState({ status: "idle" })
  }, [])

  return { state, start, close }
}
