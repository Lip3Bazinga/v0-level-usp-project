"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export type PyodideStatus = "idle" | "loading" | "ready" | "error"

export interface ExecutionResult {
  stdout: string
  stderr: string
  figures: string[]   // base64 PNG de cada figura matplotlib
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
  figures?: string[]
  data?: string        // base64 de uma figura individual
  index?: number
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

  const onStdoutRef      = useRef<((text: string) => void) | null>(null)
  const onStderrRef      = useRef<((text: string) => void) | null>(null)
  const onResultRef      = useRef<((result: ExecutionResult) => void) | null>(null)
  const onFigureRef      = useRef<((b64: string, index: number) => void) | null>(null)
  const onErrorRef       = useRef<((error: string) => void) | null>(null)
  const onTestResultRef  = useRef<((result: TestResult) => void) | null>(null)
  const onTestErrorRef   = useRef<((error: string) => void) | null>(null)
  const hasPendingTestRef = useRef(false)

  useEffect(() => {
    const worker = new Worker("/pyodide-worker-v2.js")
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
          if (!hasPendingTestRef.current) setIsExecuting(false)
          onResultRef.current?.({
            stdout:  data.stdout  || "",
            stderr:  data.stderr  || "",
            figures: data.figures || [],
          })
          break

        case "figure":
          // Figura individual — chama callback com base64
          if (data.data) onFigureRef.current?.(data.data, data.index ?? 0)
          break

        case "execution-error":
          hasPendingTestRef.current = false
          setIsExecuting(false)
          onErrorRef.current?.(data.error || "Erro desconhecido")
          break

        case "test-start":
          break

        case "test-result":
          hasPendingTestRef.current = false
          setIsExecuting(false)
          onTestResultRef.current?.({
            testsRun:       data.testsRun      || 0,
            passed:         data.passed        || 0,
            failures:       data.failures      || 0,
            errors:         data.errors        || 0,
            allPassed:      data.allPassed     || false,
            failureDetails: data.failureDetails || [],
          })
          break

        case "test-error":
          hasPendingTestRef.current = false
          setIsExecuting(false)
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

    worker.postMessage({ type: "init" })

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const execute = useCallback(
    (
      code: string,
      options?: {
        testCode?: string
        onStdout?: (text: string) => void
        onStderr?: (text: string) => void
        onResult?: (result: ExecutionResult) => void
        onFigure?: (b64: string, index: number) => void
        onError?: (error: string) => void
        onTestResult?: (result: TestResult) => void
        onTestError?: (error: string) => void
      }
    ) => {
      if (!workerRef.current || status !== "ready") return

      onStdoutRef.current     = options?.onStdout     || null
      onStderrRef.current     = options?.onStderr     || null
      onResultRef.current     = options?.onResult     || null
      onFigureRef.current     = options?.onFigure     || null
      onErrorRef.current      = options?.onError      || null
      onTestResultRef.current = options?.onTestResult || null
      onTestErrorRef.current  = options?.onTestError  || null
      hasPendingTestRef.current = !!options?.testCode

      workerRef.current.postMessage({ type: "execute", code, testCode: options?.testCode })
    },
    [status]
  )

  const installPackages = useCallback(
    (packages: string[]) => {
      if (!workerRef.current || status !== "ready") return
      workerRef.current.postMessage({ type: "install", packages })
    },
    [status]
  )

  return { status, isExecuting, execute, installPackages }
}
