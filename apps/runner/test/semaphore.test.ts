import { describe, expect, it } from "vitest"
import { QueueFullError, Semaphore } from "../src/semaphore"

describe("Semaphore", () => {
  it("nunca passa da capacidade", async () => {
    const sem = new Semaphore(2, 10)
    let active = 0
    let peak = 0
    const task = () =>
      sem.run(async () => {
        active++
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 10))
        active--
      })
    await Promise.all(Array.from({ length: 8 }, task))
    expect(peak).toBe(2)
  })

  it("rejeita quando a fila enche", async () => {
    const sem = new Semaphore(1, 1)
    const slow = () => sem.run(() => new Promise((r) => setTimeout(r, 50)))
    const a = slow()
    const b = slow()
    await expect(slow()).rejects.toBeInstanceOf(QueueFullError)
    await Promise.all([a, b])
  })
})
