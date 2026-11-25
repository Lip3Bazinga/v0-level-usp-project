import type { ProjectFile } from "@levelusp/contracts"
import type { GuestJob } from "./observations.js"
import type { PyodideProfileName } from "./pyodide-profiles.js"

/**
 * Mensagens entre o motor Pyodide (thread principal) e o worker (`pyodide-worker.ts`).
 * O worker nunca recebe segredos nem o id dos casos: só o lote como o harness o lê.
 */

/** Políticas de reaproveitamento do worker. */
export const PYODIDE_POLICIES = ["fresh", "reuse"] as const
/** `fresh`: um lote por worker (padrão). `reuse`: o worker atende vários lotes, com restauração entre eles. */
export type PyodidePolicy = (typeof PYODIDE_POLICIES)[number]

/** Política de cada perfil de worker (`RUNNER_PYODIDE_POLICY=dados:fresh,ml:reuse`). */
export type PyodidePolicies = Record<PyodideProfileName, PyodidePolicy>

/** Dados fixos de um worker, entregues na criação (`workerData`). */
export interface PyodideWorkerBootData {
  /** Pasta com o núcleo do Pyodide e os wheels (`PYODIDE_DIR`). */
  pyodideDir: string
  profile: PyodideProfileName
  /** Código-fonte do harness (o mesmo arquivo do motor WASI), gravado em `/harness/harness.py`. */
  harnessSource: string
  /** `Int32Array` compartilhado: a thread principal escreve 2 para interromper o Python. */
  interruptBuffer: SharedArrayBuffer
  /** Teto da memória linear do wasm (MB): crescimento acima disto falha com `MemoryError`. */
  maxHeapMb: number
  /** Cota de bytes gravados em `/work`, `/tmp` e `/home` por lote. */
  maxJobDiskBytes: number
  /** Cota de arquivos e pastas criados por lote. */
  maxJobEntries: number
  /** Teto da saída padrão por lote; acima dele o lote é abortado. */
  maxStdoutBytes: number
  /** Quanto do stderr do aluno é guardado para diagnóstico. */
  maxStderrChars: number
  /**
   * Worker que vai atender vários lotes (`reuse`): instala o guarda que recusa novos audit
   * hooks e a introspecção do gc (protegem a fotografia usada na restauração) e tira a
   * fotografia do interpretador depois do aquecimento.
   */
  reusable: boolean
}

/** Um lote para o worker rodar. */
export interface PyodideRunRequest {
  type: "run"
  files: ProjectFile[]
  job: GuestJob
}

/** Pede a restauração do interpretador e o canário (política `reuse`). */
export interface PyodideResetRequest {
  type: "reset"
}

/** Comandos que a thread principal envia ao worker. */
export type PyodideWorkerCommand = PyodideRunRequest | PyodideResetRequest

/** Worker aquecido: Pyodide carregado, pacotes do perfil prontos, bloqueios instalados. */
export interface PyodideReadyEvent {
  type: "ready"
  pythonVersion: string
  pyodideVersion: string
  bootMs: number
  heapBytes: number
}

/** O aquecimento falhou (pasta do Pyodide inválida, pacote ausente...). */
export interface PyodideBootErrorEvent {
  type: "boot-error"
  message: string
}

/** Trecho da saída padrão do convidado (observações e prints diretos no fd 1). */
export interface PyodideStdoutEvent {
  type: "stdout"
  chunk: Uint8Array
}

/** Trecho do stderr do convidado (diagnóstico). */
export interface PyodideStderrEvent {
  type: "stderr"
  text: string
}

/** O lote terminou (com ou sem erro do interpretador). */
export interface PyodideDoneEvent {
  type: "done"
  durationMs: number
  heapBytes: number
  /** O host abortou o lote por excesso de saída. */
  overflowed: boolean
  /**
   * O interpretador ficou inutilizável (exceção de JS atravessou o wasm, `os._exit`,
   * saída excedida): o worker precisa ser descartado mesmo na política `reuse`.
   */
  fatal: boolean
  /** Mensagem do erro de JS/Pyodide, quando houve (só para o log). */
  error?: string
}

/** Resultado da restauração + canário (política `reuse`). */
export interface PyodideResetDoneEvent {
  type: "reset-done"
  ok: boolean
  reason: string
  heapBytes: number
  durationMs: number
}

/** Eventos que o worker envia à thread principal. */
export type PyodideWorkerEvent = PyodideReadyEvent | PyodideBootErrorEvent | PyodideStdoutEvent | PyodideStderrEvent | PyodideDoneEvent | PyodideResetDoneEvent

/** Valor escrito no buffer de interrupção para levantar `KeyboardInterrupt` no Python (SIGINT). */
export const INTERRUPT_SIGNAL = 2
