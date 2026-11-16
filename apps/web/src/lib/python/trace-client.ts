"use client"

import type { ProjectFile } from "@levelusp/contracts"
import { MS_PER_SECOND, PYTHON_EXECUTION_TIMEOUT_MS } from "@/lib/constants"
import { getWorkerStatus, postToWorker, restartWorker, subscribeToWorker } from "./pyodide-worker"
import type { ProjectTrace } from "./project-execution"

/*
 * Lado da página do visualizador de execução: pede ao MESMO worker do "Executar" que rode o
 * projeto registrando cada passo. Nada aqui fala com a API: o resultado é só pedagógico.
 */

/** Projeto a visualizar: o arquivo de entrada é acompanhado linha a linha. */
export interface TraceRequest {
  files: readonly ProjectFile[]
  entryPath: string
  /** Texto lido por `input()`, uma linha por chamada. */
  stdin?: string
  /** Bibliotecas da lição (numpy, pandas…), instaladas no worker antes de executar. */
  packages?: readonly string[]
}

const TIMEOUT_MESSAGE = `A visualização passou do tempo limite (${PYTHON_EXECUTION_TIMEOUT_MS / MS_PER_SECOND}s). Verifique se o código tem um laço que não termina.`
const UNAVAILABLE_MESSAGE = "O Python não pôde ser carregado. Recarregue a página e tente de novo."

let lastRequestId = 0

/**
 * Executa o projeto no Pyodide do navegador com registro passo a passo. Se o runtime ainda está
 * carregando, espera por ele; se a lição usa bibliotecas, instala-as antes (o worker as guarda
 * entre execuções). O tempo limite só conta a partir do pedido de execução, depois da instalação.
 *
 * @throws Error com mensagem pt-BR quando o runtime falha, uma biblioteca não pode ser instalada
 * ou o código não termina no tempo limite (nesse caso o worker é reiniciado, como no "Parar").
 */
export function requestTrace({ files, entryPath, stdin = "", packages = [] }: TraceRequest): Promise<ProjectTrace> {
  lastRequestId += 1
  const requestId = lastRequestId
  return new Promise<ProjectTrace>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let hasRequestedInstall = false
    let hasPosted = false
    // Bibliotecas pedidas e ainda sem confirmação do worker.
    const pendingPackages = new Set(packages)
    let unsubscribe = (): void => undefined

    const finish = (settle: () => void): void => {
      if (timeoutId) clearTimeout(timeoutId)
      unsubscribe()
      settle()
    }

    const postTrace = (): void => {
      if (hasPosted) return
      hasPosted = true
      timeoutId = setTimeout(() => {
        restartWorker()
        finish(() => reject(new Error(TIMEOUT_MESSAGE)))
      }, PYTHON_EXECUTION_TIMEOUT_MS)
      postToWorker({ type: "trace", requestId, files: files.map(({ path, content }) => ({ path, content })), entryPath, stdin })
    }

    // Runtime pronto: instala o que falta (o worker responde na hora para o que já tem) e só
    // então executa. Os comandos entram na fila do worker na ordem em que são enviados.
    const onReady = (): void => {
      if (pendingPackages.size === 0) {
        postTrace()
        return
      }
      if (hasRequestedInstall) return
      hasRequestedInstall = true
      postToWorker({ type: "install", packages: [...pendingPackages] })
    }

    unsubscribe = subscribeToWorker({
      onMessage: (message) => {
        if (message.type === "status") {
          if (message.status === "ready") onReady()
          else if (message.status === "error") finish(() => reject(new Error(UNAVAILABLE_MESSAGE)))
          return
        }
        if (message.type === "package-installed" && pendingPackages.delete(message.package)) {
          if (pendingPackages.size === 0) postTrace()
          return
        }
        if (message.type === "package-error" && pendingPackages.has(message.package)) {
          finish(() => reject(new Error(message.error)))
          return
        }
        if ((message.type !== "trace-result" && message.type !== "trace-error") || message.requestId !== requestId) return
        if (message.type === "trace-result") finish(() => resolve(message.trace))
        else finish(() => reject(new Error(message.error)))
      },
      onCrash: () => finish(() => reject(new Error(UNAVAILABLE_MESSAGE))),
    })

    const status = getWorkerStatus()
    if (status === "ready") onReady()
    else if (status === "error") finish(() => reject(new Error(UNAVAILABLE_MESSAGE)))
  })
}
