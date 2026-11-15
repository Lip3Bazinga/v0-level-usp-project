import type { Probe, ProbeObservation, ProjectFile, PythonRuntime, RunnerLimits } from "@levelusp/contracts"

/** Motores do executor: CPython WASI no Wasmtime ou Pyodide em workers do Node. */
export type EngineName = "wasi" | "pyodide"

/** Versões que o motor informa na resposta de cada job (`RunnerResult.engine`). */
export interface EngineVersions {
  python: string
  runtime: string
}

/**
 * Estado de prontidão de um motor. É um objeto mutado no lugar (o servidor lê `ready`
 * a cada `/healthz`): enquanto `ready` for falso, `reason` diz por quê.
 */
export interface EngineReadiness {
  ready: boolean
  reason: string
}

/** O que um job pede do motor além das sondas: o motor e as bibliotecas. */
export interface EngineRequest {
  runtime: PythonRuntime
  libraries: string[]
}

/**
 * Um lote de sondas rodado numa única instância isolada do interpretador (a unidade
 * de trabalho do semáforo). `libraries` só importa ao motor Pyodide (perfil do worker).
 */
export interface EngineBatch {
  files: ProjectFile[]
  entry: string
  probes: Probe[]
  limits: RunnerLimits
  libraries: string[]
}

/** Contadores de um motor, servidos em `GET /v1/stats` (só números: nada do aluno). */
export type EngineStats = Record<string, number | string | Record<string, number>>

/**
 * Um motor de execução: recebe um lote (arquivos, sondas, limites) e devolve uma
 * observação por sonda, numa instância que o aluno não divide com outro lote.
 */
export interface Engine {
  readonly name: EngineName
  readonly versions: EngineVersions
  readonly readiness: EngineReadiness
  /**
   * Confere, antes da admissão na fila, se o motor atende o pedido.
   *
   * @throws EngineRequestError quando não atende (ex.: biblioteca desconhecida) — vira 400.
   */
  accept(request: EngineRequest): void
  /**
   * Custo estimado de preparar uma instância para o pedido além da duração normal do
   * lote (ex.: aquecer um worker quando o pool do perfil está vazio); 0 quando há
   * instância pronta. Entra na estimativa de espera da fila.
   */
  warmupMs(request: EngineRequest): number
  /** Roda o lote numa instância isolada; nunca rejeita por erro do aluno (vira observação). */
  run(batch: EngineBatch): Promise<ProbeObservation[]>
  stats(): EngineStats
}

/** O pedido não pode ser atendido por este motor (resposta 400 com a mensagem). */
export class EngineRequestError extends Error {
  constructor(
    message: string,
    /** Código curto para o cliente (`unknown_library`...). */
    readonly code: string,
  ) {
    super(message)
  }
}

/** O motor pedido não está habilitado neste executor (resposta 501). */
export class RuntimeUnavailableError extends Error {
  constructor(readonly runtime: PythonRuntime) {
    super(`Motor "${runtime}" não está habilitado neste executor`)
  }
}
