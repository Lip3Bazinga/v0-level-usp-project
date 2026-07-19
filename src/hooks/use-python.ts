"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  ensureWorker,
  replaceWorker,
  getWorkerStatus,
  addListener,
  removeListener,
  type WorkerListener,
} from "@/lib/pyodide-worker-singleton"
import type { TestResult } from "@/lib/types"

export type PyodideStatus = "idle" | "loading" | "ready" | "error"

export interface ExecutionResult {
  stdout: string
  stderr: string
  figures: string[]
}

// Fonte única em @/lib/types; re-exportado aqui por compatibilidade.
export type { TestResult }

// Tempo máximo de execução em ms antes de matar o worker
const EXECUTION_TIMEOUT_MS = 10_000

export function usePython() {
  const [status, setStatus] = useState<PyodideStatus>(() => getWorkerStatus())
  const [isExecuting, setIsExecuting] = useState(false)
  const [pendingPackages, setPendingPackages] = useState<Set<string>>(new Set())
  const isInstalling = pendingPackages.size > 0

  const onStdoutRef      = useRef<((text: string) => void) | null>(null)
  const onStderrRef      = useRef<((text: string) => void) | null>(null)
  const onResultRef      = useRef<((result: ExecutionResult) => void) | null>(null)
  const onFigureRef      = useRef<((b64: string, index: number) => void) | null>(null)
  const onErrorRef       = useRef<((error: string) => void) | null>(null)
  const onTestResultRef  = useRef<((result: TestResult) => void) | null>(null)
  const onTestErrorRef   = useRef<((error: string) => void) | null>(null)
  const hasPendingTestRef = useRef(false)
  const timeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const listener: WorkerListener = {
      onMessage(data) {
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
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => {
              replaceWorker()
              setIsExecuting(false)
              hasPendingTestRef.current = false
              onErrorRef.current?.("Execução interrompida: tempo limite excedido (10s). Verifique se seu código tem loops infinitos.")
            }, EXECUTION_TIMEOUT_MS)
            break

          case "execution-result":
            if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
            if (!hasPendingTestRef.current) setIsExecuting(false)
            onResultRef.current?.({
              stdout:  data.stdout  || "",
              stderr:  data.stderr  || "",
              figures: data.figures || [],
            })
            break

          case "figure":
            if (data.data) onFigureRef.current?.(data.data, data.index ?? 0)
            break

          case "execution-error":
            if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
            hasPendingTestRef.current = false
            setIsExecuting(false)
            onErrorRef.current?.(data.error || "Erro desconhecido")
            break

          case "test-start":
            break

          case "test-result":
            if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
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
            if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
            hasPendingTestRef.current = false
            setIsExecuting(false)
            onTestErrorRef.current?.(data.error || "Erro nos testes")
            break

          case "error":
            onErrorRef.current?.(data.error || "Erro interno")
            break

          case "package-installed":
            setPendingPackages((prev) => {
              const next = new Set(prev)
              next.delete(data.package || "")
              return next
            })
            break

          case "package-error":
            setPendingPackages((prev) => {
              const next = new Set(prev)
              next.delete(data.package || "")
              return next
            })
            break
        }
      },
      onError(ev) {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
        setStatus("error")
        setIsExecuting(false)
        onErrorRef.current?.(`Worker error: ${ev.message}`)
      },
    }

    addListener(listener)
    // Sincroniza o status inicial caso o worker já esteja pronto (navegação de volta à lição)
    setStatus(getWorkerStatus())

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      removeListener(listener)
    }
  }, [])

  const stop = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    replaceWorker()
    setIsExecuting(false)
    hasPendingTestRef.current = false
    onErrorRef.current?.("Execução interrompida pelo usuário.")
  }, [])

  const execute = useCallback(
    (
      code: string,
      options?: {
        /** Projeto multi-arquivo. Se fornecido, tem precedência sobre `code`. */
        files?: { path: string; content: string }[]
        /** Arquivo de entrada a executar (padrão: main.py). Ignorado na verificação. */
        entryPath?: string
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
      if (status !== "ready") return

      onStdoutRef.current     = options?.onStdout     || null
      onStderrRef.current     = options?.onStderr     || null
      onResultRef.current     = options?.onResult     || null
      onFigureRef.current     = options?.onFigure     || null
      onErrorRef.current      = options?.onError      || null
      onTestResultRef.current = options?.onTestResult || null
      onTestErrorRef.current  = options?.onTestError  || null
      hasPendingTestRef.current = !!options?.testCode

      ensureWorker().postMessage({
        type: "execute",
        code,
        files: options?.files,
        entryPath: options?.entryPath,
        testCode: options?.testCode,
      })
    },
    [status]
  )

  const installPackages = useCallback(
    (packages: string[]) => {
      if (status !== "ready") return
      setPendingPackages(new Set(packages))
      ensureWorker().postMessage({ type: "install", packages })
    },
    [status]
  )

  return { status, isExecuting, isInstalling, execute, installPackages, stop }
}
