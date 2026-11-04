/** Limita execuções simultâneas e rejeita quando a fila passa do teto (backpressure). */
export class Semaphore {
  private running = 0
  private readonly waiters: (() => void)[] = []

  constructor(
    readonly capacity: number,
    readonly maxQueue: number,
  ) {}

  /** Tarefas esperando vaga. */
  get pending(): number {
    return this.waiters.length
  }

  /** Tarefas rodando agora. */
  get active(): number {
    return this.running
  }

  /** Quantas de `count` tarefas novas ficariam esperando na fila se chegassem agora. */
  queuedIfAdmitted(count: number): number {
    const freeSlots = Math.max(0, this.capacity - this.running)
    return Math.max(0, this.waiters.length + count - freeSlots)
  }

  /** `signal`: se o cliente desistir enquanto espera na fila, o trabalho nem começa. */
  async run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (this.running >= this.capacity) {
      if (this.waiters.length >= this.maxQueue) throw new QueueFullError()
      await new Promise<void>((resolve) => this.waiters.push(resolve))
    }
    if (signal?.aborted) {
      this.releaseNext()
      throw new CancelledError()
    }
    this.running++
    try {
      return await task()
    } finally {
      this.running--
      this.releaseNext()
    }
  }

  private releaseNext(): void {
    this.waiters.shift()?.()
  }
}

/** A fila de espera atingiu o teto: o servidor responde 503 para a API tentar depois. */
export class QueueFullError extends Error {
  /**
   * Fila cheia, com a espera sugerida quando a estimativa existe.
   *
   * @param retryAfterSeconds espera sugerida antes de tentar de novo (vai no `Retry-After`).
   */
  constructor(readonly retryAfterSeconds?: number) {
    super("Fila do executor cheia")
  }
}

/** O cliente desistiu enquanto o trabalho esperava na fila: nada foi executado. */
export class CancelledError extends Error {
  constructor() {
    super("Execução cancelada: o cliente desconectou")
  }
}
