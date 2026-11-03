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
})
