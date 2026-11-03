"use client"

import { pyodideIndexUrl, pyodidePackageBaseUrl } from "./runtime-config"
import type { PyodideStatus, WorkerCommand, WorkerMessage } from "./worker-protocol"

/*
 * Um único Web Worker por aba: todas as telas compartilham o mesmo runtime
 * Pyodide, que leva segundos para carregar, em vez de recarregá-lo a cada navegação.
 */

export interface WorkerListener {
  onMessage: (message: WorkerMessage) => void
  onCrash: (event: ErrorEvent) => void
}

let worker: Worker | null = null
let status: PyodideStatus = "idle"
const listeners = new Set<WorkerListener>()
const statusSubscribers = new Set<() => void>()

function setStatus(nextStatus: PyodideStatus): void {
  if (status === nextStatus) return
  status = nextStatus
  statusSubscribers.forEach((notify) => notify())
}

function absoluteUrl(url: string): string {
  return new URL(url, window.location.href).href
}

function ensureWorker(): Worker {
  if (worker) return worker
  // O bundler do Next empacota o worker (TypeScript) a partir deste `new URL` literal.
  const created = new Worker(new URL("./python-worker.ts", import.meta.url), { type: "module", name: "python" })
  created.onmessage = (event: MessageEvent<WorkerMessage>): void => {
    const message = event.data
    if (message.type === "status") setStatus(message.status)
    listeners.forEach((listener) => listener.onMessage(message))
  }
  created.onerror = (event: ErrorEvent): void => {
    setStatus("error")
    listeners.forEach((listener) => listener.onCrash(event))
  }
  created.postMessage({
    type: "init",
    indexURL: absoluteUrl(pyodideIndexUrl()),
    packageBaseUrl: absoluteUrl(pyodidePackageBaseUrl()),
  } satisfies WorkerCommand)
  worker = created
  return created
}

export function postToWorker(command: WorkerCommand): void {
  ensureWorker().postMessage(command)
}

/** Mata o worker (laço infinito ou "Parar") e sobe outro do zero. */
export function restartWorker(): void {
  worker?.terminate()
  worker = null
  setStatus("idle")
  ensureWorker()
}

export function getWorkerStatus(): PyodideStatus {
  return status
}

/** Para `useSyncExternalStore`: avisa quando o status do runtime muda. */
export function subscribeToWorkerStatus(onChange: () => void): () => void {
  ensureWorker()
  statusSubscribers.add(onChange)
  return () => {
    statusSubscribers.delete(onChange)
  }
}

/** Assina as mensagens do worker (criando-o se preciso). Devolve a função de cancelamento. */
export function subscribeToWorker(listener: WorkerListener): () => void {
  ensureWorker()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
