import { describe, expect, it } from "vitest"
import type { Probe } from "@levelusp/contracts"
import { planBatches } from "../src/plan"

const probeOf: { [K in Probe["kind"]]: (id: string) => Extract<Probe, { kind: K }> } = {
  run: (id) => ({ id, kind: "run", stdin: "" }),
  call: (id) => ({ id, kind: "call", function: "f", args: [], kwargs: {} }),
  globals: (id) => ({ id, kind: "globals", names: [] }),
  ast: (id) => ({ id, kind: "ast" }),
  expr: (id) => ({ id, kind: "expr", setup: "", expr: "1", stdin: "" }),
  unittest: (id) => ({ id, kind: "unittest" }),
  legacy: (id) => ({ id, kind: "legacy", code: "assert True" }),
}

describe("planBatches", () => {
  it("isola a análise de AST numa instância sem execução, uma só para todas as regras", () => {
    const batches = planBatches([probeOf.call("a"), probeOf.ast("b"), probeOf.run("c"), probeOf.ast("d"), probeOf.ast("e")])
    expect(batches.map((batch) => batch.map((probe) => probe.id))).toEqual([["a", "c"], ["b", "d", "e"]])
  })

  it("nunca mistura AST com unittest ou legado", () => {
    const batches = planBatches([probeOf.ast("s"), probeOf.unittest("u"), probeOf.legacy("l")])
    expect(batches.map((batch) => batch.map((probe) => probe.kind))).toEqual([["legacy"], ["ast"], ["unittest"]])
  })

  it("separa testes legados das sondas normais", () => {
    const batches = planBatches([probeOf.call("a"), probeOf.legacy("l1"), probeOf.legacy("l2")])
    expect(batches.map((batch) => batch.map((probe) => probe.id))).toEqual([["a"], ["l1", "l2"]])
  })

  it("agrupa run/call/globals/expr numa única instância", () => {
    const batches = planBatches([probeOf.call("a"), probeOf.globals("b"), probeOf.run("c"), probeOf.expr("d")])
    expect(batches).toHaveLength(1)
  })

  it("roda cada sonda unittest numa instância própria (sem estado entre implementações)", () => {
    const batches = planBatches([probeOf.unittest("ref"), probeOf.expr("e"), probeOf.unittest("mutante")])
    expect(batches.map((batch) => batch.map((probe) => probe.id))).toEqual([["e"], ["ref"], ["mutante"]])
  })
})
