"use client"

import { useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react"
import type { ProjectFile } from "@levelusp/contracts"
import { MS_PER_SECOND, PYTHON_EXECUTION_TIMEOUT_MS } from "@/lib/constants"
import {
  getWorkerStatus,
  postToWorker,
  restartWorker,
  subscribeToWorker,
  subscribeToWorkerStatus,
} from "@/lib/python/pyodide-worker"
import type { ExecutionResult, PyodideStatus, WorkerMessage } from "@/lib/python/worker-protocol"

export type { ExecutionResult, PyodideStatus }

export interface ExecutionRequest {
  files: readonly ProjectFile[]
  /** Arquivo executado; os demais ficam disponíveis para `import`. */
  entryPath: string
}

export interface ExecutionHandlers {
  onResult: (result: ExecutionResult) => void
  onError: (message: string) => void
}

export interface UsePythonOptions {
  /** Pacotes instalados sempre que o runtime fica pronto (inclusive depois de reiniciado). */
  packages?: readonly string[] | null
  /** Chamado ao montar com o status atual e depois a cada mudança de status do runtime. */
  onStatusChange?: (status: PyodideStatus) => void
}

const TIMEOUT_MESSAGE =
  `Execução interrompida: tempo limite excedido (${PYTHON_EXECUTION_TIMEOUT_MS / MS_PER_SECOND}s). ` +
  "Verifique se seu código tem loops infinitos."

const getServerStatus = (): PyodideStatus => "idle"

function withoutPackage(packages: ReadonlySet<string>, name: string): ReadonlySet<string> {
  const next = new Set(packages)
  next.delete(name)
  return next
}

/** Executa Python no navegador (Pyodide em Web Worker compartilhado entre telas). */
export function usePython({ packages, onStatusChange }: UsePythonOptions = {}) {
  const status = useSyncExternalStore(subscribeToWorkerStatus, getWorkerStatus, getServerStatus)
  const [isExecuting, setIsExecuting] = useState(false)
  const [pendingPackages, setPendingPackages] = useState<ReadonlySet<string>>(() => new Set())
  // Handlers da execução em andamento; o worker responde de forma assíncrona.
  const handlersRef = useRef<ExecutionHandlers | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearExecutionTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }, [])

  const abortExecution = useCallback(
    (message: string) => {
      clearExecutionTimeout()
      restartWorker()
      setIsExecuting(false)
      handlersRef.current?.onError(message)
    },
    [clearExecutionTimeout],
  )

  const handleStatus = useEffectEvent((nextStatus: PyodideStatus) => {
    if (nextStatus === "ready" && packages?.length) {
      setPendingPackages(new Set(packages))
      postToWorker({ type: "install", packages })
    }
    onStatusChange?.(nextStatus)
  })

  useEffect(() => {
    let lastStatus = getWorkerStatus()

    const finishExecution = (): void => {
      clearExecutionTimeout()
      setIsExecuting(false)
    }

    const handleMessage = (message: WorkerMessage): void => {
      switch (message.type) {
        case "status":
          if (message.status === lastStatus) return
          lastStatus = message.status
          handleStatus(message.status)
          return
        case "execution-start":
          setIsExecuting(true)
          clearExecutionTimeout()
          timeoutRef.current = setTimeout(() => abortExecution(TIMEOUT_MESSAGE), PYTHON_EXECUTION_TIMEOUT_MS)
          return
        case "execution-result":
          finishExecution()
          handlersRef.current?.onResult(message.result)
          return
        case "execution-error":
          finishExecution()
          handlersRef.current?.onError(message.error || "Erro desconhecido")
          return
        case "package-installed":
        case "package-error":
          setPendingPackages((current) => withoutPackage(current, message.package))
          return
      }
    }

    const unsubscribe = subscribeToWorker({
      onMessage: handleMessage,
      onCrash: (event) => {
        finishExecution()
        handlersRef.current?.onError(`Worker error: ${event.message}`)
        if (lastStatus === "error") return
        lastStatus = "error"
        handleStatus("error")
      },
    })
    handleStatus(lastStatus)

    return () => {
      clearExecutionTimeout()
      unsubscribe()
    }
  }, [abortExecution, clearExecutionTimeout])

  const execute = useCallback((executionRequest: ExecutionRequest, handlers: ExecutionHandlers) => {
    if (getWorkerStatus() !== "ready") return
    handlersRef.current = handlers
    postToWorker({ type: "execute", files: executionRequest.files, entryPath: executionRequest.entryPath })
  }, [])

  const stop = useCallback(() => abortExecution("Execução interrompida pelo usuário."), [abortExecution])

  return { status, isExecuting, isInstalling: pendingPackages.size > 0, execute, stop }
}
