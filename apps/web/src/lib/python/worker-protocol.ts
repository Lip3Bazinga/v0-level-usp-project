import type { ProjectFile } from "@levelusp/contracts"
import type { ProjectRunResult, ProjectTrace } from "./project-execution"

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
  /** `stdin`: o que `input()` lê (campo "Entrada (stdin)"); vazio = sem entrada. */
  | { type: "execute"; files: readonly ProjectFile[]; entryPath: string; stdin: string }
  | { type: "install"; packages: readonly string[] }
  /** Visualizador: executa registrando cada passo. `requestId` volta na resposta para casar pedido e resultado. */
  | { type: "trace"; requestId: number; files: readonly ProjectFile[]; entryPath: string; stdin: string }
  /** Terminal: `python arquivo.py`. A saída chega em `term-output`; o fim, em `term-done`. */
  | { type: "term-run"; runId: number; files: readonly ProjectFile[]; entryPath: string }
  /** Terminal: `ls` e `cat` lidos do sistema de arquivos do Pyodide (já com os arquivos da lição). */
  | { type: "term-fs"; runId: number; op: TerminalFsOperation; args: readonly string[]; files: readonly ProjectFile[] }
  /** Terminal: abre o REPL (`python` sem argumentos) com os arquivos da lição no sistema de arquivos. */
  | { type: "term-repl-start"; runId: number; files: readonly ProjectFile[] }
  /** Terminal: uma linha digitada no REPL; `null` descarta o bloco ainda incompleto (Ctrl+C). */
  | { type: "term-repl-line"; runId: number; line: string | null }
  /** Terminal: resposta ao `term-input-request`. `line: null` é fim de entrada (Ctrl+D). Não passa pela fila. */
  | { type: "term-input"; runId: number; line: string | null }

/** Operações de arquivo do terminal. */
export type TerminalFsOperation = "ls" | "cat"

/** Como um comando do terminal terminou. */
export type TerminalStatus = "ok" | "error" | "exit" | "more"

/** Mensagens que o worker envia à página. */
export type WorkerMessage =
  | { type: "status"; status: PyodideStatus; error?: string; pythonVersion?: string }
  | { type: "execution-start" }
  | { type: "execution-result"; result: ExecutionResult }
  | { type: "execution-error"; error: string }
  | { type: "packages-loading"; packages: string[] }
  | { type: "package-installed"; package: string }
  | { type: "package-error"; package: string; error: string }
  | { type: "trace-result"; requestId: number; trace: ProjectTrace }
  | { type: "trace-error"; requestId: number; error: string }
  /** Terminal: texto escrito pelo programa (com "\n"; a página converte para o terminal). */
  | { type: "term-output"; runId: number; stream: "stdout" | "stderr"; text: string }
  /** Terminal: o programa espera uma linha (`input()`); responda com `term-input`. */
  | { type: "term-input-request"; runId: number }
  /** Terminal: fim do comando. `more`: o REPL espera a continuação do bloco. `figures`: PNG em base64. */
  | { type: "term-done"; runId: number; status: TerminalStatus; figures: string[] }
  /** Terminal: falha interna ao executar o comando (mensagem pt-BR segura). */
  | { type: "term-error"; runId: number; error: string }
