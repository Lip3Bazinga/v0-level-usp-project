"use client"

// Worker singleton — criado uma vez por sessão de navegador.
// Múltiplas chamadas de usePython() em páginas diferentes compartilham o mesmo Worker,
// evitando que o Pyodide recarregue a cada navegação.

import type { PyodideStatus, ExecutionResult, TestResult } from "@/hooks/use-python"

type WorkerMessage = {
  type: string
  status?: PyodideStatus
  error?: string
  text?: string
  stdout?: string
  stderr?: string
  figures?: string[]
  data?: string
  index?: number
  testsRun?: number
  passed?: number
  failures?: number
  errors?: number
  allPassed?: boolean
  failureDetails?: string[]
  package?: string
}

export type WorkerListener = {
  onMessage: (msg: WorkerMessage) => void
  onError:   (ev: ErrorEvent) => void
}

let worker:    Worker | null         = null
let listeners: Set<WorkerListener>   = new Set()
let workerStatus: PyodideStatus      = "idle"

function getOrCreateWorker(): Worker {
  if (worker) return worker

  worker = new Worker("/pyodide-worker-v2.js")

  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const msg = event.data
    if (msg.type === "status" && msg.status) workerStatus = msg.status
    listeners.forEach((l) => l.onMessage(msg))
  }

  worker.onerror = (ev: ErrorEvent) => {
    workerStatus = "error"
    listeners.forEach((l) => l.onError(ev))
  }

  worker.postMessage({ type: "init" })
  return worker
}

export function ensureWorker(): Worker {
  return getOrCreateWorker()
}

/** Substitui o worker (após timeout ou stop manual) e reinicializa. */
export function replaceWorker(): Worker {
  worker?.terminate()
  worker = null
  workerStatus = "idle"
  return getOrCreateWorker()
}

export function getWorkerStatus(): PyodideStatus {
  return workerStatus
}

export function addListener(l: WorkerListener): void {
  // Garante que o worker existe ao registrar o primeiro listener
  getOrCreateWorker()
  listeners.add(l)
}

export function removeListener(l: WorkerListener): void {
  listeners.delete(l)
}
