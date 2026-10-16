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

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.capacity) {
      if (this.waiters.length >= this.maxQueue) throw new QueueFullError()
      await new Promise<void>((resolve) => this.waiters.push(resolve))
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
