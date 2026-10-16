import { describe, expect, it } from "vitest"
import type { ProbeObservation, TestCase } from "@levelusp/contracts"
import { buildProbes, checkRule, grade, matchOutput } from "./grading.domain"
import { jsonEquals, pyRepr } from "./compare"

const call = (id: string, fn: string, args: unknown[], expected: unknown, extra: Partial<TestCase> = {}): TestCase =>
  ({ id, kind: "call", function: fn, args, kwargs: {}, expected, ...extra }) as TestCase

describe("buildProbes", () => {
  it("nunca envia valores esperados ao executor", () => {
    const cases: TestCase[] = [
      call("a", "soma", [1, 2], 3),
      { id: "b", kind: "io", stdin: "1\n", expected_stdout: "SEGREDO", match: "trimmed" },
      { id: "c", kind: "variable", variable: "x", expected: "SEGREDO2" },
      { id: "d", kind: "source", rule: { type: "uses", construct: "lambda" } },
    ]
    const probes = buildProbes(cases)
    const serialized = JSON.stringify(probes)
    expect(serialized).not.toContain("SEGREDO")
    expect(serialized).not.toContain("expected")
    expect(probes.map((p) => p.kind).sort()).toEqual(["ast", "call", "globals", "run"])
  })

  it("agrupa todas as variáveis numa única sonda globals", () => {
    const probes = buildProbes([
      { id: "a", kind: "variable", variable: "x", expected: 1 },
      { id: "b", kind: "variable", variable: "y", expected: 2 },
    ])
    expect(probes).toEqual([{ id: "globals", kind: "globals", names: ["x", "y"] }])
  })
})

describe("grade", () => {
  const ok = (id: string, extra: Partial<ProbeObservation>): ProbeObservation => ({ id, ok: true, ...extra })

  it("aprova quando todas as observações batem", () => {
    const cases = [call("a", "soma", [2, 3], 5)]
    const r = grade(cases, [ok("call:a", { value: 5, type: "int" })])
    expect(r).toMatchObject({ allPassed: true, testsRun: 1, passed: 1, failures: 0, errors: 0, strength: "strong" })
  })

  it("reprova sem revelar o esperado por padrão", () => {
    const r = grade([call("a", "soma", [2, 3], 5)], [ok("call:a", { value: -1 })])
    expect(r.allPassed).toBe(false)
    expect(r.failureDetails[0]).toContain("soma(2, 3) retornou -1")
    expect(r.failureDetails[0]).not.toContain("5")
  })

  it("revela o esperado quando o professor permite", () => {
    const r = grade([call("a", "soma", [2, 3], 5, { reveal: true })], [ok("call:a", { value: -1 })])
    expect(r.failureDetails[0]).toContain("esperado 5")
  })

  it("um objeto com __eq__ trapaceiro não passa: a comparação é por valor serializado", () => {
    // No avaliador antigo, `class X: __eq__ = lambda *a: True` aprovava qualquer assert.
    const r = grade([call("a", "soma", [2, 3], 5)], [ok("call:a", { value: { $repr: "<X object>" }, type: "X" })])
    expect(r.allPassed).toBe(false)
  })

  it("verifica o tipo quando exigido", () => {
    const cases: TestCase[] = [{ id: "v", kind: "variable", variable: "versao", expected: 3.12, type: "float" }]
    expect(grade(cases, [ok("globals", { values: { versao: 3.12 }, types: { versao: "float" } })]).allPassed).toBe(true)
    expect(grade(cases, [ok("globals", { values: { versao: "3.12" }, types: { versao: "str" } })]).allPassed).toBe(false)
  })

  it("trata erro e timeout como erro de execução", () => {
    const r = grade(
      [call("a", "f", [], 1), call("b", "g", [], 1)],
      [
        { id: "call:a", ok: false, error: "ZeroDivisionError: division by zero" },
        { id: "call:b", ok: false, timedOut: true },
      ],
    )
    expect(r).toMatchObject({ allPassed: false, errors: 2, failures: 0 })
    expect(r.failureDetails.join()).toContain("ZeroDivisionError")
    expect(r.failureDetails.join()).toContain("tempo limite")
  })

  it("acrescenta a dica do professor na falha", () => {
    const r = grade([call("a", "f", [], 1, { hint: "lembre do return" })], [ok("call:a", { value: null })])
    expect(r.failureDetails[0]).toContain("dica: lembre do return")
  })

  it("marca correção legada como fraca e conta cada assert", () => {
    const cases: TestCase[] = [{ id: "l", kind: "legacy", code: "assert True\nassert True" }]
    const r = grade(cases, [ok("legacy:l", { legacy: { testsRun: 2, failures: 0, errors: 0, details: [] } })])
    expect(r).toMatchObject({ allPassed: true, testsRun: 2, passed: 2, strength: "legacy" })
  })

  it("sem casos de teste nunca aprova", () => {
    expect(grade([], []).allPassed).toBe(false)
  })
})

describe("matchOutput", () => {
  it("ignora espaços à direita e quebras finais no modo trimmed", () => {
    expect(matchOutput("trimmed", "Olá\nMundo", "Olá  \r\nMundo\n\n")).toBe(true)
  })
  it("exact exige igualdade byte a byte", () => {
    expect(matchOutput("exact", "a\n", "a")).toBe(false)
  })
  it("regex inválida reprova em vez de quebrar", () => {
    expect(matchOutput("regex", "(", "qualquer")).toBe(false)
  })
})

describe("checkRule", () => {
  const f = { constructs: ["def", "lambda"], calls: ["print", "max"], functions: ["soma"], classes: [], imports: ["math"], recursive_functions: [] }
  it("avalia regras estruturais", () => {
    expect(checkRule({ type: "uses", construct: "lambda" }, f)).toBe(true)
    expect(checkRule({ type: "not_calls", name: "max" }, f)).toBe(false)
    expect(checkRule({ type: "imports", module: "math" }, f)).toBe(true)
    expect(checkRule({ type: "defines_function", name: "soma" }, f)).toBe(true)
  })
})

describe("jsonEquals / pyRepr", () => {
  it("compara floats com tolerância e inteiros com exatidão", () => {
    expect(jsonEquals(0.3, 0.1 + 0.2)).toBe(true)
    expect(jsonEquals(1, 2)).toBe(false)
    expect(jsonEquals(3.14, 3.15, 0.02)).toBe(true)
  })
  it("compara estruturas aninhadas", () => {
    expect(jsonEquals({ a: [1, { b: null }] }, { a: [1, { b: null }] })).toBe(true)
    expect(jsonEquals({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })
  it("formata como Python", () => {
    expect(pyRepr([true, null, "x"])).toBe("[True, None, 'x']")
  })
})
