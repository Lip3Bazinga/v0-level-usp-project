import { describe, expect, it } from "vitest"
import { QueueFullError, Semaphore } from "../src/semaphore"

const sleep = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms))

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
})
