import { describe, expect, it } from "vitest"
import type { AstFeatures, CallCase, ExprCase, Json, ProbeObservation, RaisedException, TestCase, UnittestCase } from "@levelusp/contracts"
import { buildProbes, checkRule, grade, matchOutput, typeMatches } from "./grading.domain"
import { jsonEquals, pyRepr } from "./compare"

const callCase = (id: string, functionName: string, args: Json[], expected: Json, extra: Partial<CallCase> = {}): CallCase =>
  ({ id, kind: "call", function: functionName, args, kwargs: {}, expected, ...extra })
const exprCase = (id: string, expr: string, extra: Partial<ExprCase>): ExprCase =>
  ({ id, kind: "expr", setup: "", expr, stdin: "", match: "trimmed", ...extra })
const unittestCase = (id: string, extra: Partial<UnittestCase> & Pick<UnittestCase, "expect">): UnittestCase =>
  ({ id, kind: "unittest", ...extra })

describe("buildProbes", () => {
  it("nunca envia valores esperados ao executor", () => {
    const cases: TestCase[] = [
      callCase("a", "soma", [1, 2], 3),
      { id: "b", kind: "io", stdin: "1\n", expected_stdout: "SEGREDO", match: "trimmed" },
      { id: "c", kind: "variable", variable: "x", expected: "SEGREDO2" },
      { id: "d", kind: "source", rule: { type: "uses", construct: "lambda" } },
    ]
    const probes = buildProbes(cases)
    const serialized = JSON.stringify(probes)
    expect(serialized).not.toContain("SEGREDO")
    expect(serialized).not.toContain("expected")
    expect(probes.map((probe) => probe.kind).sort()).toEqual(["ast", "call", "globals", "run"])
  })

  it("casos expr e unittest só levam código e entradas (nunca o esperado)", () => {
    const cases: TestCase[] = [
      exprCase("e1", "conta.saldo", { setup: "conta = Conta(100)", expected: "SEGREDO", type: "int" }),
      exprCase("e2", "conta.sacar(999)", { raises: "ValueError", message_contains: "SEGREDO3" }),
      exprCase("e3", "mostrar()", { expected_stdout: "SEGREDO4" }),
      unittestCase("u1", { expect: "fail", target: "validar", implementation: "def validar(s):\n    return True\n", min_tests: 4 }),
      unittestCase("u2", { expect: "pass", test_class: "TestValidar" }),
    ]
    const probes = buildProbes(cases)
    const serialized = JSON.stringify(probes)
    for (const secret of ["SEGREDO", "ValueError", "expect", "min_tests", "raises", "\"pass\"", "\"fail\""]) {
      expect(serialized).not.toContain(secret)
    }
    expect(probes).toContainEqual({ id: "expr:e1", kind: "expr", setup: "conta = Conta(100)", expr: "conta.saldo", stdin: "" })
    expect(probes).toContainEqual({ id: "unittest:u2", kind: "unittest", test_class: "TestValidar" })
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
  const observed = (id: string, extra: Partial<ProbeObservation>): ProbeObservation => ({ id, ok: true, ...extra })

  it("aprova quando todas as observações batem", () => {
    const cases = [callCase("a", "soma", [2, 3], 5)]
    const result = grade(cases, [observed("call:a", { value: 5, type: "int" })])
    expect(result).toMatchObject({ allPassed: true, testsRun: 1, passed: 1, failures: 0, errors: 0, strength: "strong" })
  })

  it("reprova sem revelar o esperado por padrão", () => {
    const result = grade([callCase("a", "soma", [2, 3], 5)], [observed("call:a", { value: -1 })])
    expect(result.allPassed).toBe(false)
    expect(result.failureDetails[0]).toContain("soma(2, 3) retornou -1")
    expect(result.failureDetails[0]).not.toContain("5")
  })

  it("revela o esperado quando o professor permite", () => {
    const result = grade([callCase("a", "soma", [2, 3], 5, { reveal: true })], [observed("call:a", { value: -1 })])
    expect(result.failureDetails[0]).toContain("esperado 5")
  })

  it("um objeto com __eq__ trapaceiro não passa: a comparação é por valor serializado", () => {
    // No avaliador antigo, `class X: __eq__ = lambda *a: True` aprovava qualquer assert.
    const result = grade([callCase("a", "soma", [2, 3], 5)], [observed("call:a", { value: { $repr: "<X object>" }, type: "X" })])
    expect(result.allPassed).toBe(false)
  })

  it("verifica o tipo quando exigido", () => {
    const cases: TestCase[] = [{ id: "v", kind: "variable", variable: "versao", expected: 3.12, type: "float" }]
    expect(grade(cases, [observed("globals", { values: { versao: 3.12 }, types: { versao: "float" } })]).allPassed).toBe(true)
    expect(grade(cases, [observed("globals", { values: { versao: "3.12" }, types: { versao: "str" } })]).allPassed).toBe(false)
  })

  it("trata erro e timeout como erro de execução", () => {
    const result = grade(
      [callCase("a", "f", [], 1), callCase("b", "g", [], 1)],
      [
        { id: "call:a", ok: false, error: "ZeroDivisionError: division by zero" },
        { id: "call:b", ok: false, timedOut: true },
      ],
    )
    expect(result).toMatchObject({ allPassed: false, errors: 2, failures: 0 })
    expect(result.failureDetails.join()).toContain("ZeroDivisionError")
    expect(result.failureDetails.join()).toContain("tempo limite")
  })

  it("acrescenta a dica do professor na falha", () => {
    const result = grade([callCase("a", "f", [], 1, { hint: "lembre do return" })], [observed("call:a", { value: null })])
    expect(result.failureDetails[0]).toContain("dica: lembre do return")
  })

  it("marca correção legada como fraca e conta cada assert", () => {
    const cases: TestCase[] = [{ id: "l", kind: "legacy", code: "assert True\nassert True" }]
    const result = grade(cases, [observed("legacy:l", { legacy: { testsRun: 2, failures: 0, errors: 0, details: [] } })])
    expect(result).toMatchObject({ allPassed: true, testsRun: 2, passed: 2, strength: "legacy" })
  })

  it("sem casos de teste nunca aprova", () => {
    expect(grade([], []).allPassed).toBe(false)
  })
})

describe("grade (expr)", () => {
  const observed = (id: string, extra: Partial<ProbeObservation>): ProbeObservation => ({ id, ok: true, ...extra })
  const raised = (type: string, mro: string[], message = ""): RaisedException => ({ type, mro, message, stage: "expr" })

  it("compara valor e tipo observados", () => {
    const testCase = exprCase("e", "r.eh_quadrado()", { expected: false, type: "bool" })
    expect(grade([testCase], [observed("expr:e", { value: false, type: "bool" })]).allPassed).toBe(true)
    expect(grade([testCase], [observed("expr:e", { value: 0, type: "int" })]).allPassed).toBe(false)
  })

  it("verifica só o tipo quando não há valor esperado (ex.: generator)", () => {
    const testCase = exprCase("e", "pares_ate(4)", { type: "generator" })
    expect(grade([testCase], [observed("expr:e", { value: { $repr: "<generator>" }, type: "generator" })]).allPassed).toBe(true)
    const fake = grade([testCase], [observed("expr:e", { value: { $repr: "<x>" }, type: "__main__.generator" })])
    expect(fake.allPassed).toBe(false)
    expect(fake.failureDetails[0]).toContain("deveria ser do tipo generator")
  })

  it("aceita a exceção esperada ou subclasse, e confere a mensagem", () => {
    const testCase = exprCase("e", "c.sacar(999)", { raises: "ValueError", message_contains: "insuficiente" })
    const mro = ["__main__.SaldoError", "ValueError", "Exception", "BaseException", "object"]
    expect(grade([testCase], [observed("expr:e", { raised: raised("__main__.SaldoError", mro, "saldo insuficiente") })]).allPassed).toBe(true)
    const wrongMessage = grade([testCase], [observed("expr:e", { raised: raised("ValueError", mro.slice(1), "valor inválido") })])
    expect(wrongMessage.allPassed).toBe(false)
    expect(wrongMessage.failureDetails[0]).not.toContain("insuficiente")
    expect(grade([testCase], [observed("expr:e", { value: null, type: "NoneType" })]).failureDetails[0]).toContain("não levantou")
  })

  it("classe do aluno com nome de exceção embutida não conta como a embutida", () => {
    const testCase = exprCase("e", "f()", { raises: "ValueError" })
    const fake = observed("expr:e", { raised: raised("__main__.ValueError", ["__main__.ValueError", "Exception", "BaseException", "object"]) })
    expect(grade([testCase], [fake]).allPassed).toBe(false)
  })

  it("aceita exceção customizada do aluno pelo nome da classe", () => {
    const testCase = exprCase("e", "registrar('Al', 20)", { raises: "NomeCurtoError" })
    const mro = ["__main__.NomeCurtoError", "Exception", "BaseException", "object"]
    expect(grade([testCase], [observed("expr:e", { raised: raised(mro[0] ?? "", mro) })]).allPassed).toBe(true)
  })

  it("exceção inesperada vira erro de execução", () => {
    const testCase = exprCase("e", "r.area()", { expected: 12 })
    const result = grade([testCase], [observed("expr:e", { raised: raised("AttributeError", ["AttributeError"], "sem largura") })])
    expect(result).toMatchObject({ allPassed: false, errors: 1 })
    expect(result.failureDetails[0]).toContain("AttributeError: sem largura")
  })

  it("confere a saída impressa durante a expressão", () => {
    const testCase = exprCase("e", "mostrar()", { expected_stdout: "Olá", match: "contains" })
    expect(grade([testCase], [observed("expr:e", { value: null, type: "NoneType", stdout: "Olá, mundo\n" })]).allPassed).toBe(true)
    expect(grade([testCase], [observed("expr:e", { value: null, type: "NoneType", stdout: "" })]).allPassed).toBe(false)
  })
})

describe("grade (unittest)", () => {
  const suite = (id: string, run: number, failures: number, errors = 0): ProbeObservation =>
    ({ id, ok: true, tests: { run, failures, errors, skipped: 0, failed: failures + errors ? ["test_curta"] : [] } })

  it("referência precisa passar e mutante precisa ser reprovado", () => {
    const cases = [
      unittestCase("ref", { expect: "pass", target: "f", implementation: "def f(): ...", min_tests: 4 }),
      unittestCase("mut", { expect: "fail", target: "f", implementation: "def f(): ..." }),
    ]
    // Cada implementação do professor roda duas vezes (instâncias separadas).
    const twice = (id: string, run: number, failures: number, errors = 0): ProbeObservation[] =>
      [suite(`unittest:${id}`, run, failures, errors), suite(`unittest:${id}:repeticao`, run, failures, errors)]
    expect(buildProbes(cases).map((probe) => probe.id)).toEqual(["unittest:ref", "unittest:ref:repeticao", "unittest:mut", "unittest:mut:repeticao"])
    expect(grade(cases, [...twice("ref", 4, 0), ...twice("mut", 4, 1)]).allPassed).toBe(true)
    const weak = grade(cases, [...twice("ref", 4, 0), ...twice("mut", 4, 0)])
    expect(weak.allPassed).toBe(false)
    expect(weak.failureDetails[0]).toContain("deveriam detectar")
    const broken = grade(cases, [...twice("ref", 4, 0, 1), ...twice("mut", 4, 1)])
    expect(broken.failureDetails[0]).toContain("test_curta")
  })

  it("exige o mínimo de testes e ao menos um teste", () => {
    const cases = [unittestCase("ref", { expect: "pass", min_tests: 4 })]
    expect(grade(cases, [suite("unittest:ref", 3, 0)]).failureDetails[0]).toContain("pelo menos 4")
    expect(grade([unittestCase("x", { expect: "pass" })], [suite("unittest:x", 0, 0)]).allPassed).toBe(false)
    expect(grade([unittestCase("y", { expect: "fail" })], [suite("unittest:y", 0, 0)]).allPassed).toBe(false)
  })
})

describe("typeMatches", () => {
  it("nome embutido exige o tipo embutido; classe do aluno casa pelo sufixo", () => {
    expect(typeMatches("int", "int")).toBe(true)
    expect(typeMatches("int", "__main__.int")).toBe(false)
    expect(typeMatches("Tarefa", "__main__.Tarefa")).toBe(true)
    expect(typeMatches("Tarefa", "__main__.OutraTarefa")).toBe(false)
    expect(typeMatches("Tarefa", undefined)).toBe(false)
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
  const features: AstFeatures = {
    constructs: ["def", "lambda", "yield"], calls: ["print", "max"], functions: ["soma"], classes: [], imports: ["math"],
    recursive_functions: [], decorators: ["property"], handlers: ["ValueError"],
    function_constructs: { soma: ["def", "return"], achatar: ["def", "list_comprehension", "return"] },
  }
  it("avalia regras estruturais", () => {
    expect(checkRule({ type: "uses", construct: "lambda" }, features)).toBe(true)
    expect(checkRule({ type: "not_calls", name: "max" }, features)).toBe(false)
    expect(checkRule({ type: "imports", module: "math" }, features)).toBe(true)
    expect(checkRule({ type: "defines_function", name: "soma" }, features)).toBe(true)
    expect(checkRule({ type: "uses", construct: "yield" }, features)).toBe(true)
    expect(checkRule({ type: "decorator", name: "property" }, features)).toBe(true)
    expect(checkRule({ type: "decorator", name: "staticmethod" }, features)).toBe(false)
    expect(checkRule({ type: "catches", exception: "ValueError" }, features)).toBe(true)
    expect(checkRule({ type: "catches", exception: "KeyError" }, features)).toBe(false)
  })

  it("regra de construção pode valer só dentro de uma função", () => {
    expect(checkRule({ type: "uses", construct: "list_comprehension", function: "achatar" }, features)).toBe(true)
    expect(checkRule({ type: "uses", construct: "list_comprehension", function: "soma" }, features)).toBe(false)
    expect(checkRule({ type: "uses", construct: "def", function: "nao_existe" }, features)).toBe(false)
    expect(checkRule({ type: "not_uses", construct: "for", function: "soma" }, features)).toBe(true)
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
