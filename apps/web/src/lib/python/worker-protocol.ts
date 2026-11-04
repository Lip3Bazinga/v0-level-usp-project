import type { ProjectFile } from "@levelusp/contracts"
import type { ProjectRunResult } from "./project-execution"

/*
 * Mensagens trocadas entre a página (pyodide-worker.ts) e o Web Worker
 * (python-worker.ts). Os dois lados são código nosso: estes tipos são o contrato.
 */

/** Ciclo de vida do runtime no worker. */
export type PyodideStatus = "idle" | "loading" | "ready" | "error"

/** Resultado de uma execução (mesmo formato produzido pelo harness do navegador). */
export type ExecutionResult = ProjectRunResult

/** Comandos que a página envia ao worker. */
export type WorkerCommand =
  | {
      type: "init"
      /** URL absoluta da pasta do núcleo do Pyodide (com "/" no fim). */
      indexURL: string
      /** URL absoluta de onde vêm os wheels dos pacotes extras (numpy, matplotlib…). */
      packageBaseUrl: string
    }
  | { type: "execute"; files: readonly ProjectFile[]; entryPath: string }
  | { type: "install"; packages: readonly string[] }

/** Mensagens que o worker envia à página. */
export type WorkerMessage =
  | { type: "status"; status: PyodideStatus; error?: string; pythonVersion?: string }
  | { type: "execution-start" }
  | { type: "execution-result"; result: ExecutionResult }
  | { type: "execution-error"; error: string }
  | { type: "packages-loading"; packages: string[] }
  | { type: "package-installed"; package: string }
  | { type: "package-error"; package: string; error: string }
