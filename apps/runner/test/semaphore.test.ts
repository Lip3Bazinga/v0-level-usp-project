import { describe, expect, it } from "vitest"
import { MemoryBudget } from "../src/memory-budget"
import { CancelledError, QueueFullError, Semaphore } from "../src/semaphore"

const sleep = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Tarefa que fica rodando até `finish()` e registra o nome quando começa. */
function gate(started: string[], name: string): { task: () => Promise<void>; finish: () => void } {
  let finish: () => void = () => undefined
  const done = new Promise<void>((resolve) => (finish = resolve))
  return {
    task: () => {
      started.push(name)
      return done
    },
    finish: () => finish(),
  }
}

/** Tarefa instantânea que só registra o nome quando começa. */
const mark = (started: string[], name: string) => (): Promise<void> => {
  started.push(name)
  return Promise.resolve()
}

/** `claim` que reserva `mb` no orçamento. */
const reserving = (budget: MemoryBudget, mb: number) => (): boolean => budget.tryReserve(mb)

describe("Semaphore", () => {
  it("nunca passa da capacidade", async () => {
    const semaphore = new Semaphore(2, 10)
    let active = 0
    let peak = 0
    const task = (): Promise<void> =>
      semaphore.run(async () => {
        active++
        peak = Math.max(peak, active)
        await sleep(10)
        active--
      })
    await Promise.all(Array.from({ length: 8 }, task))
    expect(peak).toBe(2)
  })

  it("rejeita quando a fila enche", async () => {
    const semaphore = new Semaphore(1, 1)
    const slowTask = (): Promise<void> => semaphore.run(() => sleep(50))
    const running = slowTask()
    const queued = slowTask()
    await expect(slowTask()).rejects.toBeInstanceOf(QueueFullError)
    await Promise.all([running, queued])
  })

  it("informa quantas tarefas novas ficariam na fila", async () => {
    const semaphore = new Semaphore(2, 10)
    expect(semaphore.queuedIfAdmitted(3)).toBe(1)
    const release: (() => void)[] = []
    const blocked = (): Promise<void> => semaphore.run(() => new Promise<void>((resolve) => release.push(resolve)))
    const tasks = [blocked(), blocked(), blocked()]
    expect(semaphore.active).toBe(2)
    expect(semaphore.pending).toBe(1)
    expect(semaphore.queuedIfAdmitted(2)).toBe(3)
    while (release.length) {
      release.shift()?.()
      await sleep(1)
    }
    await Promise.all(tasks)
    expect(semaphore.queuedIfAdmitted(2)).toBe(0)
  })

  it("mantém a ordem de chegada entre as tarefas na fila", async () => {
    const semaphore = new Semaphore(1, 10)
    const started: string[] = []
    const first = gate(started, "a")
    const tasks = [semaphore.run(first.task), ...["b", "c", "d"].map((name) => semaphore.run(mark(started, name)))]
    first.finish()
    await Promise.all(tasks)
    expect(started).toEqual(["a", "b", "c", "d"])
  })
})

describe("Semaphore: recurso além da vaga (claim)", () => {
  it("só começa com vaga de CPU E claim aceito; a memória liberada acorda a fila", async () => {
    const budget = new MemoryBudget(1000)
    const semaphore = new Semaphore(8, 10, budget)
    const started: string[] = []
    const first = gate(started, "ml-1")
    const second = gate(started, "ml-2")
    const runningFirst = semaphore.run(first.task, { claim: reserving(budget, 600) })
    const runningSecond = semaphore.run(second.task, { claim: reserving(budget, 600) })
    expect(started).toEqual(["ml-1"])
    expect(semaphore.active).toBe(1)
    expect(semaphore.pending).toBe(1)
    expect(semaphore.blocked).toBe(1)
    expect(budget.blocked).toBe(1)
    first.finish()
    await runningFirst
    // A vaga de CPU sobrou o tempo todo: quem destrava é a liberação da memória.
    expect(started).toEqual(["ml-1"])
    budget.release(600)
    expect(started).toEqual(["ml-1", "ml-2"])
    expect(budget.blocked).toBe(0)
    second.finish()
    await runningSecond
    expect(budget.peakUsedMb).toBe(600)
  })

  it("só tarefa sem claim ultrapassa uma bloqueada por memória (a cara não fica para trás)", async () => {
    const budget = new MemoryBudget(1000)
    const semaphore = new Semaphore(8, 10, budget)
    const started: string[] = []
    const holder = gate(started, "ml-1")
    const tasks = [
      semaphore.run(holder.task, { claim: reserving(budget, 800) }),
      // Bloqueada: precisa de 800 e só há 200.
      semaphore.run(mark(started, "ml-2"), { claim: reserving(budget, 800) }),
      // Caberia (100 ≤ 200), mas tem custo: espera atrás da bloqueada.
      semaphore.run(mark(started, "dados"), { claim: reserving(budget, 100) }),
      // Sem custo: passa.
      semaphore.run(mark(started, "wasi")),
    ]
    // Tudo síncrono: quem pode começar já começou ao entrar na fila.
    expect(started).toEqual(["ml-1", "wasi"])
    expect(budget.usedMb).toBe(800)
    expect(budget.blocked).toBe(2)
    holder.finish()
    await tasks[0]
    budget.release(800)
    await Promise.all(tasks)
    expect(started).toEqual(["ml-1", "wasi", "ml-2", "dados"])
    expect(budget.blocked).toBe(0)
  })

  it("tarefa com claim ainda na fila depois do prazo é recusada com a espera sugerida e libera as de trás", async () => {
    const budget = new MemoryBudget(1000)
    const semaphore = new Semaphore(8, 10, budget)
    const started: string[] = []
    const holder = gate(started, "ml-1")
    const running = semaphore.run(holder.task, { claim: reserving(budget, 800) })
    const expired = semaphore.run(mark(started, "ml-2"), { claim: reserving(budget, 800), deadline: { ms: 30, retryAfterSeconds: () => 7 } })
    const behind = semaphore.run(mark(started, "dados"), { claim: reserving(budget, 100) })
    const error: unknown = await expired.catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(QueueFullError)
    expect((error as QueueFullError).retryAfterSeconds).toBe(7)
    await behind
    expect(started).toEqual(["ml-1", "dados"])
    expect(budget.blocked).toBe(0)
    expect(semaphore.pending).toBe(0)
    holder.finish()
    await running
  })

  it("o prazo não vale para quem já começou", async () => {
    const budget = new MemoryBudget(1000)
    const semaphore = new Semaphore(1, 10, budget)
    const started: string[] = []
    const long = gate(started, "longa")
    const running = semaphore.run(long.task, { claim: reserving(budget, 100), deadline: { ms: 5, retryAfterSeconds: () => 2 } })
    expect(started).toEqual(["longa"])
    // Dez vezes o prazo depois, a tarefa continua rodando e termina normalmente.
    await sleep(50)
    long.finish()
    await expect(running).resolves.toBeUndefined()
  })

  it("lote com custo que espera só a vaga de CPU também conta como bloqueado (o pool não aquece por especulação)", async () => {
    const budget = new MemoryBudget(1000)
    const semaphore = new Semaphore(1, 10, budget)
    const started: string[] = []
    const holder = gate(started, "wasi")
    const running = semaphore.run(holder.task)
    const waiting = semaphore.run(mark(started, "dados"), { claim: reserving(budget, 100) })
    const free = semaphore.run(mark(started, "wasi-2"))
    // Há memória de sobra; o que falta é a vaga. Só a tarefa com custo conta.
    expect(budget.usedMb).toBe(0)
    expect(semaphore.pending).toBe(2)
    expect(semaphore.blocked).toBe(1)
    expect(budget.blocked).toBe(1)
    holder.finish()
    await Promise.all([running, waiting, free])
    expect(started).toEqual(["wasi", "dados", "wasi-2"])
    expect(budget.blocked).toBe(0)
  })

  it("cancelamento tira a tarefa da fila na hora, sem chamar o claim de novo", async () => {
    const budget = new MemoryBudget(1000)
    const semaphore = new Semaphore(8, 10, budget)
    const started: string[] = []
    const holder = gate(started, "ml-1")
    const running = semaphore.run(holder.task, { claim: reserving(budget, 800) })
    const abort = new AbortController()
    let claims = 0
    const cancelled = semaphore.run(mark(started, "ml-2"), {
      signal: abort.signal,
      claim: () => {
        claims++
        return budget.tryReserve(800)
      },
    })
    const behind = semaphore.run(mark(started, "dados"), { claim: reserving(budget, 100) })
    const claimsBeforeAbort = claims
    expect(claimsBeforeAbort).toBeGreaterThanOrEqual(1)
    abort.abort()
    await expect(cancelled).rejects.toBeInstanceOf(CancelledError)
    await behind
    expect(claims).toBe(claimsBeforeAbort)
    expect(started).toEqual(["ml-1", "dados"])
    expect(semaphore.pending).toBe(0)
    expect(budget.blocked).toBe(0)
    holder.finish()
    await running
  })

  it("sinal já abortado rejeita sem conferir o claim nem ocupar a fila", async () => {
    const semaphore = new Semaphore(1, 10)
    const abort = new AbortController()
    abort.abort()
    let claims = 0
    const outcome = semaphore.run(() => Promise.resolve("rodou"), {
      signal: abort.signal,
      claim: () => {
        claims++
        return true
      },
    })
    await expect(outcome).rejects.toBeInstanceOf(CancelledError)
    expect(claims).toBe(0)
    expect(semaphore.pending).toBe(0)
  })

  it("claim que lança rejeita só aquela tarefa e não trava a fila", async () => {
    const semaphore = new Semaphore(1, 10)
    const broken = semaphore.run(() => Promise.resolve("nunca"), {
      claim: () => {
        throw new Error("motor encerrando")
      },
    })
    await expect(broken).rejects.toThrow("motor encerrando")
    await expect(semaphore.run(() => Promise.resolve("ok"))).resolves.toBe("ok")
    expect(semaphore.active).toBe(0)
  })

  it("com orçamento, muitas tarefas caras simultâneas nunca passam do limite e todas terminam", async () => {
    const budget = new MemoryBudget(3584)
    const semaphore = new Semaphore(8, 50, budget)
    const outcomes = await Promise.all(
      Array.from({ length: 12 }, () =>
        semaphore.run(
          async () => {
            await sleep(5)
            budget.release(1229)
            return budget.usedMb
          },
          { claim: reserving(budget, 1229) },
        ),
      ),
    )
    expect(outcomes).toHaveLength(12)
    expect(budget.peakUsedMb).toBeLessThanOrEqual(3584)
    expect(budget.peakUsedMb).toBe(2 * 1229)
    expect(budget.usedMb).toBe(0)
  })
})
