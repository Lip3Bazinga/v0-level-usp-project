"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export type PyodideStatus = "idle" | "loading" | "ready" | "error"

export interface ExecutionResult {
  stdout: string
  stderr: string
}

export interface TestResult {
  testsRun: number
  passed: number
  failures: number
  errors: number
  allPassed: boolean
  failureDetails: string[]
}

interface WorkerMessage {
  type: string
  status?: PyodideStatus
  error?: string
  text?: string
  stdout?: string
  stderr?: string
  testsRun?: number
  passed?: number
  failures?: number
  errors?: number
  allPassed?: boolean
  failureDetails?: string[]
  package?: string
}

export function usePython() {
  const workerRef = useRef<Worker | null>(null)
  const [status, setStatus] = useState<PyodideStatus>("idle")
  const [isExecuting, setIsExecuting] = useState(false)

  // Callbacks armazenados via ref para evitar re-renders
  const onStdoutRef = useRef<((text: string) => void) | null>(null)
  const onStderrRef = useRef<((text: string) => void) | null>(null)
  const onResultRef = useRef<((result: ExecutionResult) => void) | null>(null)
  const onErrorRef = useRef<((error: string) => void) | null>(null)
  const onTestResultRef = useRef<((result: TestResult) => void) | null>(null)
  const onTestErrorRef = useRef<((error: string) => void) | null>(null)

  // Inicializa o Web Worker
  useEffect(() => {
    const worker = new Worker("/pyodide-worker.js")
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data

      switch (data.type) {
        case "status":
          setStatus(data.status || "idle")
          break

        case "stdout":
          onStdoutRef.current?.(data.text || "")
          break

        case "stderr":
          onStderrRef.current?.(data.text || "")
          break

        case "execution-start":
          setIsExecuting(true)
          break

        case "execution-result":
          setIsExecuting(false)
          onResultRef.current?.({
            stdout: data.stdout || "",
            stderr: data.stderr || "",
          })
          break

        case "execution-error":
          setIsExecuting(false)
          onErrorRef.current?.(data.error || "Erro desconhecido")
          break

        case "test-result":
          onTestResultRef.current?.({
            testsRun: data.testsRun || 0,
            passed: data.passed || 0,
            failures: data.failures || 0,
            errors: data.errors || 0,
            allPassed: data.allPassed || false,
            failureDetails: data.failureDetails || [],
          })
          break

        case "test-error":
          onTestErrorRef.current?.(data.error || "Erro nos testes")
          break

        case "error":
          onErrorRef.current?.(data.error || "Erro interno")
          break
      }
    }

    worker.onerror = (error) => {
      setStatus("error")
      onErrorRef.current?.(`Worker error: ${error.message}`)
    }

    // Inicia carregamento do Pyodide
    worker.postMessage({ type: "init" })

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  // Executa código Python (opcionalmente com testes)
  const execute = useCallback(
    (
      code: string,
      options?: {
        testCode?: string
        onStdout?: (text: string) => void
        onStderr?: (text: string) => void
        onResult?: (result: ExecutionResult) => void
        onError?: (error: string) => void
        onTestResult?: (result: TestResult) => void
        onTestError?: (error: string) => void
      }
    ) => {
      if (!workerRef.current || status !== "ready") return

      // Configura callbacks
      onStdoutRef.current = options?.onStdout || null
      onStderrRef.current = options?.onStderr || null
      onResultRef.current = options?.onResult || null
      onErrorRef.current = options?.onError || null
      onTestResultRef.current = options?.onTestResult || null
      onTestErrorRef.current = options?.onTestError || null

      workerRef.current.postMessage({
        type: "execute",
        code,
        testCode: options?.testCode,
      })
    },
    [status]
  )

  // Instala pacotes Python extras
  const installPackages = useCallback(
    (packages: string[]) => {
      if (!workerRef.current || status !== "ready") return
      workerRef.current.postMessage({ type: "install", packages })
    },
    [status]
  )

  return {
    status,
    isExecuting,
    execute,
    installPackages,
  }
}
