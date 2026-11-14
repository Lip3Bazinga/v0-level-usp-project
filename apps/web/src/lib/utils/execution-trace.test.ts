import { describe, expect, it } from "vitest"
import { MAX_TRACE_STEPS, type ProjectTrace, type TraceStep } from "@/lib/python/project-execution"
import { changedVariables, clampStepIndex, describeTraceStep, limitTrace, stdoutAtStep, stepIndexForKey } from "./execution-trace"

function traceStep(line: number, globals: Record<string, string>, extra: Partial<TraceStep> = {}): TraceStep {
  return {
    line, event: "line", function_name: null, locals: null, stdout_length: 0,
    globals: Object.entries(globals).map(([name, value]) => ({ name, value })),
    ...extra,
  }
}

const locals = (values: Record<string, string>): TraceStep["locals"] => Object.entries(values).map(([name, value]) => ({ name, value }))

describe("variáveis que mudaram entre dois passos", () => {
  it("no primeiro passo tudo o que existe é novidade", () => {
    expect([...changedVariables(undefined, traceStep(1, { total: "0" }))]).toEqual(["global:total"])
  })

  it("marca só as que apareceram ou trocaram de valor", () => {
    const before = traceStep(3, { notas: "[6, 8]", total: "0" })
    const after = traceStep(4, { notas: "[6, 8]", total: "6", nota: "6" })
    expect([...changedVariables(before, after)].sort()).toEqual(["global:nota", "global:total"])
    expect(changedVariables(after, after).size).toBe(0)
  })

  it("compara as locais só dentro da mesma função", () => {
    const inside = traceStep(2, {}, { function_name: "dobro", locals: locals({ x: "3" }) })
    const next = traceStep(3, {}, { function_name: "dobro", locals: locals({ x: "3", y: "6" }) })
    expect([...changedVariables(inside, next)]).toEqual(["local:y"])
    const other = traceStep(7, {}, { function_name: "triplo", locals: locals({ x: "3" }) })
    expect([...changedVariables(next, other)]).toEqual(["local:x"])
    expect([...changedVariables(traceStep(5, {}), inside)]).toEqual(["local:x"])
  })

  it("não confunde a global e a local de mesmo nome", () => {
    const before = traceStep(2, { x: "1" }, { function_name: "f", locals: locals({ x: "1" }) })
    const after = traceStep(3, { x: "1" }, { function_name: "f", locals: locals({ x: "2" }) })
    expect([...changedVariables(before, after)]).toEqual(["local:x"])
  })
})

describe("limite de passos e navegação", () => {
  const longTrace: ProjectTrace = {
    steps: Array.from({ length: MAX_TRACE_STEPS + 20 }, (_unused, index) => traceStep(index + 1, {})),
    stdout: "", error: null, truncated: false,
  }

  it("corta o registro em 500 passos e avisa que foi cortado", () => {
    const limited = limitTrace(longTrace)
    expect(MAX_TRACE_STEPS).toBe(500)
    expect(limited.steps).toHaveLength(500)
    expect(limited.truncated).toBe(true)
    expect(limited.steps.at(-1)?.line).toBe(500)
  })

  it("não mexe em um registro dentro do limite", () => {
    const short: ProjectTrace = { steps: [traceStep(1, {})], stdout: "", error: null, truncated: false }
    expect(limitTrace(short)).toBe(short)
  })

  it("mostra só a saída impressa até o passo", () => {
    const trace: ProjectTrace = {
      steps: [traceStep(1, {}), traceStep(2, {}, { stdout_length: 2 }), traceStep(2, {}, { event: "end", stdout_length: 4 })],
      stdout: "7\n9\n", error: null, truncated: false,
    }
    expect(stdoutAtStep(trace, 0)).toBe("")
    expect(stdoutAtStep(trace, 1)).toBe("7\n")
    expect(stdoutAtStep(trace, 2)).toBe("7\n9\n")
    expect(stdoutAtStep(trace, 9)).toBe("")
  })

  it("mantém o passo dentro dos limites e entende os atalhos de teclado", () => {
    expect(clampStepIndex(-3, 5)).toBe(0)
    expect(clampStepIndex(9, 5)).toBe(4)
    expect(clampStepIndex(2, 0)).toBe(0)
    expect(stepIndexForKey("ArrowRight", 0, 3)).toBe(1)
    expect(stepIndexForKey("ArrowRight", 2, 3)).toBe(2)
    expect(stepIndexForKey("ArrowLeft", 0, 3)).toBe(0)
    expect(stepIndexForKey("Home", 2, 3)).toBe(0)
    expect(stepIndexForKey("End", 0, 3)).toBe(2)
    expect(stepIndexForKey("a", 0, 3)).toBeNull()
  })

  it("descreve o passo para o leitor de tela", () => {
    expect(describeTraceStep(traceStep(4, {}), 2, 12)).toBe("Passo 3 de 12: prestes a executar a linha 4")
    expect(describeTraceStep(traceStep(3, {}, { function_name: "dobro", locals: [] }), 0, 2)).toBe("Passo 1 de 2: prestes a executar a linha 3, na função dobro")
    expect(describeTraceStep(traceStep(6, {}, { event: "end" }), 11, 12)).toBe("Passo 12 de 12: fim do programa")
  })
})
