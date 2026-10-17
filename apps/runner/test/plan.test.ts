import { describe, expect, it } from "vitest"
import type { Probe } from "@levelusp/contracts"
import { planBatches } from "../src/plan"

const p = (id: string, kind: Probe["kind"]): Probe =>
  ({ id, kind, ...(kind === "call" ? { function: "f", args: [], kwargs: {} } : {}), ...(kind === "run" ? { stdin: "" } : {}), ...(kind === "globals" ? { names: [] } : {}), ...(kind === "legacy" ? { code: "assert True" } : {}) }) as Probe

describe("planBatches", () => {
  it("isola a análise de AST em instâncias próprias", () => {
    const batches = planBatches([p("a", "call"), p("b", "ast"), p("c", "run")])
    expect(batches).toHaveLength(2)
    expect(batches.find((b) => b.some((x) => x.kind === "ast"))).toHaveLength(1)
  })

  it("separa testes legados das sondas normais", () => {
    const batches = planBatches([p("a", "call"), p("l1", "legacy"), p("l2", "legacy")])
    expect(batches.map((b) => b.map((x) => x.id))).toEqual([["a"], ["l1", "l2"]])
  })

  it("agrupa run/call/globals numa única instância", () => {
    const batches = planBatches([p("a", "call"), p("b", "globals"), p("c", "run")])
    expect(batches).toHaveLength(1)
  })
})
