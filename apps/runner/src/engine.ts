import type { Probe, ProbeObservation, ProjectFile, PythonRuntime, RunnerLimits } from "@levelusp/contracts"

/** Motores do executor: CPython WASI no Wasmtime, Pyodide em workers do Node ou CPython nativo em contêiner gVisor. */
export type EngineName = "wasi" | "pyodide" | "nativo"

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
export type EngineStats = Record<string, number | string | Record<string, number | string>>

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
  /**
   * Classe de custo do pedido: `key` separa as médias de duração na admissão (um lote WASI
   * de 0,15 s não se mistura com um `ml` de 10 s) e `memoryMb` é o peso que uma instância
   * segura no orçamento de memória (0 = não entra na conta).
   *
   * @throws EngineRequestError quando o pedido não é atendido (o mesmo de `accept`).
   */
  cost(request: EngineRequest): EngineCost
  /**
   * Reserva, de forma SÍNCRONA, a instância (e a memória) que vai rodar o lote. Motores sem
   * pool não implementam: o executor reserva o peso de `cost` direto no orçamento.
   *
   * @returns a reserva, entregue depois a `run`; `undefined` quando não há memória agora (o
   *          motor já começou a liberar o que pode e avisa o orçamento quando houver).
   */
  reserve?(batch: EngineBatch): EngineLease | undefined
  /**
   * Roda o lote numa instância isolada; nunca rejeita por erro do aluno (vira observação).
   * Sem `lease`, o motor reserva por conta própria, esperando memória se preciso.
   */
  run(batch: EngineBatch, lease?: EngineLease): Promise<ProbeObservation[]>
  stats(): EngineStats
}

/** Classe de custo de um lote (ver `Engine.cost`). */
export interface EngineCost {
  /** Identifica a classe: `wasi`, `pyodide:dados`, `pyodide:ml`, `nativo`. */
  key: string
  /** Peso de uma instância no orçamento de memória (MB). */
  memoryMb: number
  /**
   * Duração esperada de um lote da classe enquanto o executor não mediu nenhum (ms), JÁ com o
   * aquecimento que o lote vai pagar (ex.: um worker `ml` criado para ele). É o ponto de
   * partida da média móvel da admissão; ausente = o padrão do executor, somado a `warmupMs`.
   */
  initialBatchMs?: number
}

/**
 * Reserva feita por `Engine.reserve`: garante ao lote uma instância (pronta ou a caminho) com
 * a memória já contada. Só o motor que a criou sabe usá-la; quem recebe uma DEVE entregá-la a
 * `run` do mesmo motor, que cuida de devolver a instância e a memória.
 */
export interface EngineLease {
  readonly key: string
  readonly memoryMb: number
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

/**
 * O perfil pedido pesa mais que o orçamento de memória inteiro: nunca vai rodar neste
 * executor, por mais que espere. Resposta 501 (para a API é "indisponível", não "ocupado":
 * tentar de novo não adianta).
 */
export class InsufficientMemoryError extends Error {
  constructor(
    /** Classe de custo recusada (`pyodide:ml`...). */
    readonly key: string,
    readonly neededMb: number,
    readonly budgetMb: number,
  ) {
    super(`Memória insuficiente neste executor para "${key}": precisa de ${neededMb} MB e o orçamento é de ${Math.floor(budgetMb)} MB`)
  }
}
