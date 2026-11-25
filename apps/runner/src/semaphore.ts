import type { MemoryBudget } from "./memory-budget.js"

/** Prazo de espera na fila de uma tarefa com `claim`. */
export interface QueueDeadline {
  /** Tempo máximo na fila (ms) antes de a tarefa ser recusada. */
  ms: number
  /** Espera sugerida ao cliente (`Retry-After`), calculada na hora da recusa. */
  retryAfterSeconds: () => number
  /**
   * Chamado logo depois de a tarefa ser recusada pelo prazo e ANTES de a fila ser reavaliada:
   * é a hora de cancelar as tarefas irmãs (do mesmo job) que ainda esperam, para nenhuma
   * começar a rodar sem ninguém para ler o resultado. Recebe o erro entregue à tarefa.
   */
  onExpire?: (error: QueueFullError) => void
}

/** Opções de uma tarefa do semáforo. */
export interface SemaphoreRunOptions {
  /** Se o cliente desistir enquanto a tarefa espera na fila, o trabalho nem começa. */
  signal?: AbortSignal | undefined
  /**
   * Recurso além da vaga de CPU (memória, worker): chamado, de forma síncrona, quando há vaga;
   * `true` = recurso reservado e a tarefa começa na hora; `false` = ainda não há, a tarefa
   * continua na fila. Pode ser chamado várias vezes; depois de `true`, nunca mais.
   */
  claim?: (() => boolean) | undefined
  /** Só vale com `claim`: recusa a tarefa (`QueueFullError`) se ela ainda estiver na fila depois do prazo. */
  deadline?: QueueDeadline | undefined
}

/** Tarefa na fila, esperando vaga de CPU e/ou o recurso do `claim`. */
interface QueuedTask {
  start: () => void
  reject: (error: Error) => void
  claim: (() => boolean) | undefined
  signal: AbortSignal | undefined
  onAbort: (() => void) | undefined
  timer: NodeJS.Timeout | undefined
  /** Já foi contada no orçamento como bloqueada por memória. */
  isBlocked: boolean
}

/**
 * Limita execuções simultâneas (vagas de CPU) e rejeita quando a fila passa do teto
 * (backpressure). Uma tarefa pode exigir também um recurso (`claim`: memória do orçamento ou
 * um worker): ela só começa quando há vaga E o `claim` devolve `true`.
 *
 * A fila é FIFO. Uma tarefa cujo `claim` falhou segura as tarefas com `claim` que vêm depois
 * (senão um lote caro esperaria para sempre atrás de lotes baratos); só tarefas sem `claim`
 * (custo zero) passam à frente dela.
 */
export class Semaphore {
  private running = 0
  private readonly queue: QueuedTask[] = []
  private isDraining = false
  private shouldDrainAgain = false

  /**
   * Cria o semáforo sem nada rodando.
   *
   * @param capacity tarefas simultâneas.
   * @param maxQueue teto de tarefas esperando.
   * @param budget orçamento de memória: a fila é reavaliada a cada mudança dele e informa
   *        nele quantas tarefas esperam memória.
   */
  constructor(
    readonly capacity: number,
    readonly maxQueue: number,
    private readonly budget?: MemoryBudget,
  ) {
    budget?.onChange(() => this.drain())
  }

  /** Tarefas esperando vaga ou recurso. */
  get pending(): number {
    return this.queue.length
  }

  /** Tarefas rodando agora. */
  get active(): number {
    return this.running
  }

  /** Tarefas na fila que já poderiam rodar (há vaga de CPU) mas esperam o recurso do `claim`. */
  get blocked(): number {
    return this.queue.filter((task) => task.isBlocked).length
  }

  /** Quantas de `count` tarefas novas ficariam esperando vaga de CPU na fila se chegassem agora. */
  queuedIfAdmitted(count: number): number {
    const freeSlots = Math.max(0, this.capacity - this.running)
    return Math.max(0, this.queue.length + count - freeSlots)
  }

  /**
   * Roda `task` quando houver vaga (e, com `claim`, o recurso).
   *
   * @throws QueueFullError se a fila está no teto ou se o prazo (`deadline`) venceu na fila.
   * @throws CancelledError se `signal` abortou antes de a tarefa começar.
   */
  run<T>(task: () => Promise<T>, options: SemaphoreRunOptions = {}): Promise<T> {
    const { signal, claim, deadline } = options
    return new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new CancelledError())
        return
      }
      const queued: QueuedTask = {
        claim,
        signal,
        reject,
        onAbort: undefined,
        timer: undefined,
        isBlocked: false,
        start: () => {
          this.running++
          let outcome: Promise<T>
          try {
            outcome = task()
          } catch (error) {
            outcome = Promise.reject(error instanceof Error ? error : new Error(String(error)))
          }
          void outcome
            .finally(() => {
              this.running--
              this.drain()
            })
            .then(resolve, reject)
        },
      }
      this.queue.push(queued)
      this.drain()
      if (!this.queue.includes(queued)) return
      if (this.queue.length > this.maxQueue) {
        this.dequeue(queued)
        reject(new QueueFullError())
        return
      }
      if (signal) {
        queued.onAbort = (): void => this.fail(queued, new CancelledError())
        signal.addEventListener("abort", queued.onAbort, { once: true })
      }
      if (claim && deadline) {
        queued.timer = setTimeout(() => {
          const error = new QueueFullError(deadline.retryAfterSeconds())
          this.fail(queued, error, () => deadline.onExpire?.(error))
        }, deadline.ms)
      }
    })
  }

  /**
   * Inicia, em ordem de chegada, as tarefas que têm vaga de CPU e recurso. Chamado na entrada
   * de uma tarefa, no fim de outra e a cada mudança do orçamento de memória.
   */
  drain(): void {
    if (this.isDraining) {
      this.shouldDrainAgain = true
      return
    }
    this.isDraining = true
    try {
      do {
        this.startReadyTasks()
      } while (this.takeDrainRequest())
    } finally {
      this.isDraining = false
    }
  }

  /** Alguém pediu `drain()` durante a rodada atual? Lê e zera a marca. */
  private takeDrainRequest(): boolean {
    const wasRequested = this.shouldDrainAgain
    this.shouldDrainAgain = false
    return wasRequested
  }

  private startReadyTasks(): void {
    let isMemoryBlocked = false
    let index = 0
    while (index < this.queue.length && this.running < this.capacity) {
      const queued = this.queue[index]
      if (queued === undefined) break
      if (queued.signal?.aborted) {
        this.dequeue(queued)
        queued.reject(new CancelledError())
        continue
      }
      if (queued.claim && (isMemoryBlocked || !this.tryClaim(queued))) {
        // `tryClaim` pode ter rejeitado a tarefa (o `claim` lançou): aí ela já saiu da fila.
        if (this.queue[index] !== queued) continue
        isMemoryBlocked = true
        this.markBlocked(queued)
        index++
        continue
      }
      this.dequeue(queued)
      queued.start()
    }
  }

  /** Chama o `claim`; se ele lançar, a tarefa é rejeitada com o erro (e não trava a fila). */
  private tryClaim(queued: QueuedTask): boolean {
    try {
      return queued.claim?.() ?? true
    } catch (error) {
      this.dequeue(queued)
      queued.reject(error instanceof Error ? error : new Error(String(error)))
      return false
    }
  }

  private markBlocked(queued: QueuedTask): void {
    if (queued.isBlocked) return
    queued.isBlocked = true
    this.budget?.addBlocked(1)
  }

  /** Tira a tarefa da fila e desfaz o que ela registrou (prazo, escuta do sinal, contagem de bloqueio). */
  private dequeue(queued: QueuedTask): void {
    const index = this.queue.indexOf(queued)
    if (index >= 0) this.queue.splice(index, 1)
    if (queued.timer) clearTimeout(queued.timer)
    if (queued.onAbort) queued.signal?.removeEventListener("abort", queued.onAbort)
    if (queued.isBlocked) {
      queued.isBlocked = false
      this.budget?.addBlocked(-1)
    }
  }

  /** Rejeita uma tarefa ainda na fila (cancelada ou com o prazo vencido) e reavalia as que ela segurava. */
  private fail(queued: QueuedTask, error: Error, beforeDrain?: () => void): void {
    if (!this.queue.includes(queued)) return
    this.dequeue(queued)
    queued.reject(error)
    beforeDrain?.()
    this.drain()
    // Sem ela na fila, o pool aquecido pode voltar a ser reabastecido.
    this.budget?.notify()
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
