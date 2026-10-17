/** Limita execuções simultâneas e rejeita quando a fila passa do teto (backpressure). */
export class Semaphore {
  private active = 0
  private readonly waiters: (() => void)[] = []

  constructor(
    private readonly capacity: number,
    private readonly maxQueue: number,
  ) {}

  get pending(): number {
    return this.waiters.length
  }

  /** `signal`: se o cliente desistir enquanto espera na fila, o trabalho nem começa. */
  async run<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (this.active >= this.capacity) {
      if (this.waiters.length >= this.maxQueue) throw new QueueFullError()
      await new Promise<void>((resolve) => this.waiters.push(resolve))
    }
    if (signal?.aborted) {
      this.waiters.shift()?.()
      throw new CancelledError()
    }
    this.active++
    try {
      return await fn()
    } finally {
      this.active--
      this.waiters.shift()?.()
    }
  }
}

export class QueueFullError extends Error {
  constructor() {
    super("Fila do executor cheia")
  }
}

export class CancelledError extends Error {
  constructor() {
    super("Execução cancelada: o cliente desconectou")
  }
}
