/** Quantos jobs recentes ficam guardados para os percentis de `/v1/stats`. */
export const RECENT_JOBS_CAPACITY = 2_000

/** Tempos de um job concluído (ou que falhou depois de começar). */
export interface JobTiming {
  /** Instante do fim do job (ms desde a época). */
  at: number
  /** Espera na fila até o primeiro lote começar. */
  queueMs: number
  /** Do início do primeiro lote ao fim do último. */
  execMs: number
  /** Lotes (instâncias WASI) do job. */
  batches: number
}

/** Fotografia dos contadores e da ocupação do executor, servida em `GET /v1/stats`. */
export interface RunnerStatsSnapshot {
  /** Instante da leitura (ms desde a época), para quem lê calcular taxas. */
  now: number
  capacity: number
  maxQueue: number
  /** Lotes rodando agora. */
  active: number
  /** Lotes esperando na fila agora. */
  pending: number
  /** Maior fila vista desde a partida. */
  peakPending: number
  jobs: { completed: number; rejected: number; cancelled: number; failed: number }
  /** Últimos jobs (no máximo {@link RECENT_JOBS_CAPACITY}), do mais antigo ao mais novo. */
  recent: JobTiming[]
}

/** O que a fotografia precisa saber da fila (o semáforo). */
export interface QueueGauge {
  readonly capacity: number
  readonly maxQueue: number
  readonly active: number
  readonly pending: number
}

/**
 * Contadores do executor para dimensionamento e teste de carga (`pnpm load:turma`).
 * Só tempos e contagens: nenhum código, entrada ou saída de aluno é guardado.
 */
export class RunnerStats {
  private readonly recent: JobTiming[] = []
  private peakPending = 0
  private readonly jobs = { completed: 0, rejected: 0, cancelled: 0, failed: 0 }

  constructor(private readonly gauge: QueueGauge) {}

  /** Registra um job concluído e os seus tempos. */
  recordCompleted(timing: JobTiming): void {
    this.jobs.completed++
    this.recent.push(timing)
    if (this.recent.length > RECENT_JOBS_CAPACITY) this.recent.shift()
  }

  /** Um job recusado por fila cheia (503). */
  recordRejected(): void {
    this.jobs.rejected++
  }

  /** Um job abandonado pelo cliente antes de rodar. */
  recordCancelled(): void {
    this.jobs.cancelled++
  }

  /** Um job que terminou em erro interno. */
  recordFailed(): void {
    this.jobs.failed++
  }

  /** Atualiza o pico da fila; chamado sempre que um lote entra na fila. */
  observeQueue(): void {
    this.peakPending = Math.max(this.peakPending, this.gauge.pending)
  }

  /** Fotografia atual (cópia: quem lê não altera os contadores). */
  snapshot(now: number = Date.now()): RunnerStatsSnapshot {
    return {
      now,
      capacity: this.gauge.capacity,
      maxQueue: this.gauge.maxQueue,
      active: this.gauge.active,
      pending: this.gauge.pending,
      peakPending: this.peakPending,
      jobs: { ...this.jobs },
      recent: [...this.recent],
    }
  }
}
