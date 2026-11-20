"use client"

import type { ProjectFile } from "@levelusp/contracts"
import { getWorkerStatus, postToWorker, restartWorker, subscribeToWorker } from "./pyodide-worker"
import type { PyodideStatus, TerminalFsOperation, TerminalStatus, WorkerCommand, WorkerMessage } from "./worker-protocol"

/*
 * Lado da página do terminal: manda os comandos ao MESMO worker do "Executar" (pyodide-worker.ts)
 * e entrega a saída aos poucos. Um comando por vez. Nada aqui fala com a API: é só pedagógico.
 */

/** Resultado de um comando do terminal. */
export interface TerminalRunResult {
  status: TerminalStatus
  /** Gráficos do matplotlib (PNG em base64) gerados pelo comando. */
  figures: string[]
}

/** Avisos que chegam enquanto o comando roda. */
export interface TerminalRunCallbacks {
  /** Texto escrito pelo programa (com "\n"). */
  onOutput: (stream: "stdout" | "stderr", text: string) => void
  /** O programa espera uma linha (`input()`); responda com {@link TerminalClient.sendInput}. */
  onInputRequest: () => void
}

/** Lançado quando o comando em andamento é interrompido por {@link TerminalClient.interrupt}. */
export class TerminalInterruptedError extends Error {
  constructor() {
    super("Comando interrompido.")
    this.name = "TerminalInterruptedError"
  }
}

/** Cliente do terminal sobre o worker compartilhado do Pyodide. */
export interface TerminalClient {
  /** Estado do runtime Python (idle, loading, ready, error). */
  getStatus: () => PyodideStatus
  /**
   * `python arquivo.py`. Espera o runtime carregar, se preciso.
   * @throws Error com mensagem pt-BR se o Python não carregar, o worker parar ou o comando falhar por dentro;
   * {@link TerminalInterruptedError} se for interrompido.
   */
  runScript: (files: readonly ProjectFile[], entryPath: string, callbacks: TerminalRunCallbacks) => Promise<TerminalRunResult>
  /** `ls` e `cat` sobre o sistema de arquivos do Pyodide. Mesmos erros de `runScript`. */
  runFs: (op: TerminalFsOperation, args: readonly string[], files: readonly ProjectFile[], callbacks: TerminalRunCallbacks) => Promise<TerminalRunResult>
  /** Abre um REPL novo. Mesmos erros de `runScript`. */
  startRepl: (files: readonly ProjectFile[], callbacks: TerminalRunCallbacks) => Promise<TerminalRunResult>
  /** Envia uma linha ao REPL (`null` descarta o bloco incompleto). Mesmos erros de `runScript`. */
  pushRepl: (line: string | null, callbacks: TerminalRunCallbacks) => Promise<TerminalRunResult>
  /** Responde ao `onInputRequest` do comando em andamento; `null` é fim de entrada (Ctrl+D). */
  sendInput: (line: string | null) => void
  /** Ctrl+C: mata o worker (como o "Parar" do Executar) e rejeita o comando em andamento. O REPL é perdido. */
  interrupt: () => void
}

interface ActiveRun {
  runId: number
  reject: (error: Error) => void
  unsubscribe: () => void
}

const CRASH_MESSAGE = "O Python parou de responder. Recarregue a página se o problema continuar."

let lastRunId = 0

/**
 * Cria o cliente do terminal. Vários clientes podem existir, mas só um comando roda por vez
 * no worker (os demais esperam na fila do worker).
 */
export function createTerminalClient(): TerminalClient {
  let active: ActiveRun | null = null

  const run = (build: (runId: number) => WorkerCommand, callbacks: TerminalRunCallbacks): Promise<TerminalRunResult> => {
    lastRunId += 1
    const runId = lastRunId
    return new Promise<TerminalRunResult>((resolve, reject) => {
      let unsubscribe = (): void => undefined
      const finish = (settle: () => void): void => {
        unsubscribe()
        if (active?.runId === runId) active = null
        settle()
      }
      const handleMessage = (message: WorkerMessage): void => {
        if (!("runId" in message) || message.runId !== runId) return
        switch (message.type) {
          case "term-output":
            callbacks.onOutput(message.stream, message.text)
            return
          case "term-input-request":
            callbacks.onInputRequest()
            return
          case "term-done":
            finish(() => resolve({ status: message.status, figures: message.figures }))
            return
          case "term-error":
            finish(() => reject(new Error(message.error)))
            return
        }
      }
      unsubscribe = subscribeToWorker({
        onMessage: handleMessage,
        onCrash: () => finish(() => reject(new Error(CRASH_MESSAGE))),
      })
      active = { runId, reject: (error) => finish(() => reject(error)), unsubscribe }
      postToWorker(build(runId))
    })
  }

  return {
    getStatus: getWorkerStatus,
    runScript: (files, entryPath, callbacks) => run((runId) => ({ type: "term-run", runId, files, entryPath }), callbacks),
    runFs: (op, args, files, callbacks) => run((runId) => ({ type: "term-fs", runId, op, args, files }), callbacks),
    startRepl: (files, callbacks) => run((runId) => ({ type: "term-repl-start", runId, files }), callbacks),
    pushRepl: (line, callbacks) => run((runId) => ({ type: "term-repl-line", runId, line }), callbacks),
    sendInput: (line) => {
      if (active) postToWorker({ type: "term-input", runId: active.runId, line })
    },
    interrupt: () => {
      if (!active) return
      const interrupted = active
      restartWorker()
      interrupted.reject(new TerminalInterruptedError())
    },
  }
}
