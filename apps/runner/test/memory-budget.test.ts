import { describe, expect, it } from "vitest"
import { MemoryBudget } from "../src/memory-budget"

describe("MemoryBudget", () => {
  it("reserva até o limite, recusa o que passa e acompanha uso, pico e livre", () => {
    const budget = new MemoryBudget(1000)
    expect(budget.tryReserve(600)).toBe(true)
    expect(budget.tryReserve(500)).toBe(false)
    expect(budget.usedMb).toBe(600)
    expect(budget.freeMb).toBe(400)
    expect(budget.tryReserve(400)).toBe(true)
    budget.release(600)
    expect(budget.usedMb).toBe(400)
    expect(budget.peakUsedMb).toBe(1000)
    expect(budget.snapshot()).toEqual({ limitMb: 1000, usedMb: 400, peakUsedMb: 1000, blocked: 0 })
  })

  it("peso zero sempre cabe e não ocupa nada, mesmo com o orçamento cheio", () => {
    const budget = new MemoryBudget(100)
    expect(budget.tryReserve(100)).toBe(true)
    expect(budget.tryReserve(0)).toBe(true)
    expect(budget.usedMb).toBe(100)
  })

  it("sem limite (padrão) aceita tudo e informa limitMb nulo", () => {
    const budget = new MemoryBudget()
    for (let index = 0; index < 8; index++) expect(budget.tryReserve(1229)).toBe(true)
    expect(budget.isLimited).toBe(false)
    expect(budget.freeMb).toBe(Number.POSITIVE_INFINITY)
    expect(budget.slotsFor(1229)).toBe(Number.POSITIVE_INFINITY)
    expect(budget.snapshot()).toMatchObject({ limitMb: null, usedMb: 8 * 1229, peakUsedMb: 8 * 1229 })
  })

  it("informa quantas instâncias de um peso cabem no orçamento", () => {
    const budget = new MemoryBudget(3584)
    expect(budget.slotsFor(1229)).toBe(2)
    expect(budget.slotsFor(256)).toBe(14)
    expect(budget.slotsFor(4000)).toBe(0)
    expect(budget.slotsFor(0)).toBe(Number.POSITIVE_INFINITY)
  })

  it("recusa limite inválido", () => {
    expect(() => new MemoryBudget(-1)).toThrow(RangeError)
    expect(() => new MemoryBudget(Number.NaN)).toThrow(RangeError)
  })

  it("avisa os ouvintes, na ordem de registro, quando memória é liberada ou alguém chama notify", () => {
    const budget = new MemoryBudget(100)
    const calls: string[] = []
    budget.onChange(() => calls.push("fila"))
    const unsubscribe = budget.onChange(() => calls.push("pool"))
    budget.tryReserve(50)
    expect(calls).toEqual([])
    budget.release(50)
    expect(calls).toEqual(["fila", "pool"])
    unsubscribe()
    budget.notify()
    expect(calls).toEqual(["fila", "pool", "fila"])
  })

  it("um aviso disparado dentro de um ouvinte vira outra rodada, sem recursão", () => {
    const budget = new MemoryBudget(100)
    let depth = 0
    let maxDepth = 0
    let rounds = 0
    budget.onChange(() => {
      depth++
      maxDepth = Math.max(maxDepth, depth)
      rounds++
      if (rounds === 1) budget.notify()
      depth--
    })
    budget.notify()
    expect(rounds).toBe(2)
    expect(maxDepth).toBe(1)
  })

  it("conta os lotes bloqueados por memória sem ficar negativo", () => {
    const budget = new MemoryBudget(100)
    budget.addBlocked(1)
    budget.addBlocked(1)
    expect(budget.blocked).toBe(2)
    budget.addBlocked(-1)
    budget.addBlocked(-1)
    budget.addBlocked(-1)
    expect(budget.blocked).toBe(0)
  })
})
