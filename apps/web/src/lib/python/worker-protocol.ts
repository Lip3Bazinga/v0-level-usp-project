import type { ProjectFile } from "@levelusp/contracts"

/*
 * Mensagens trocadas com public/pyodide-worker-v2.js. O worker é código nosso,
 * então os formatos abaixo são o contrato entre os dois lados.
 */

/** Ciclo de vida do runtime Pyodide no worker. */
export type PyodideStatus = "idle" | "loading" | "ready" | "error"

/** Saída de uma execução; `figures` são PNGs em base64 dos gráficos do matplotlib. */
export interface ExecutionResult {
  stdout: string
  stderr: string
  figures: string[]
}

/** Comandos da página para o worker. */
export type WorkerCommand =
  | { type: "init"; indexURL: string }
  | { type: "execute"; files: readonly ProjectFile[]; entryPath: string }
  | { type: "install"; packages: readonly string[] }

/** Mensagens do worker para a página. */
export type WorkerMessage =
  | { type: "status"; status: PyodideStatus; error?: string }
  | { type: "execution-start" }
  | { type: "execution-result"; stdout?: string; stderr?: string; figures?: string[] }
  | { type: "execution-error"; error?: string }
  | { type: "figure"; index: number; data: string }
  | { type: "error"; error?: string }
  | { type: "packages-loading"; packages: string[] }
  | { type: "package-installed"; package: string }
  | { type: "package-error"; package: string; error?: string }
  | { type: "test-start" }
  | { type: "test-result" }
  | { type: "test-error"; error?: string }
