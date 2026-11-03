/**
 * Classe 3 (robustez da correção na API): a comparação roda no processo da API
 * sobre dados do ALUNO (saída, valores, mensagens). Nada aqui pode travar o
 * event loop, estourar a pilha, ler do protótipo ou derrubar a gravação.
 */
import { describe, expect, it } from "vitest"
import {
  describeRegexProblem, isLikelyCatastrophicRegex, testCasesSchema,
  type AstFeatures, type IoCase, type Json, type ProbeObservation, type TestCase, type UnittestCase,
} from "@levelusp/contracts"
import { buildProbes, checkRule, grade, matchOutput } from "./grading.domain"
import { jsonEquals, normalizeOutput, pyRepr } from "./compare"
import { REGEX_GRADING_BUDGET_MS, REGEX_MATCH_TIMEOUT_MS, createRegexBudget, testRegexWithinBudget } from "./regex-guard"

/** Folga para máquinas lentas de CI (o pior caso antigo levava segundos). */
const FAST_MS = 200
const MAX_STUDENT_TEXT = 64_000

const ioCase = (id: string, expected: string, match: IoCase["match"]): IoCase => ({ id, kind: "io", stdin: "", expected_stdout: expected, match })
const stdoutOf = (id: string, stdout: string): ProbeObservation => ({ id: `run:${id}`, ok: true, stdout })

function elapsed(action: () => unknown): number {
  const startedAt = performance.now()
  action()
  return performance.now() - startedAt
}

function nested(depth: number): Json {
  let value: Json = 1
  for (let level = 0; level < depth; level++) value = [value]
  return value
}

describe("ReDoS: a saída do aluno não trava o event loop", () => {
  it("normalização 'trimmed'/'contains' é linear (64 000 espaços seguidos de 'x')", () => {
    const hostile = `${" ".repeat(MAX_STUDENT_TEXT - 1)}x`
    expect(elapsed(() => normalizeOutput(hostile))).toBeLessThan(FAST_MS)
    const cases = Array.from({ length: 20 }, (_, index) => ioCase(`t${index}`, "ok", index % 2 ? "trimmed" : "contains"))
    const observations = cases.map((testCase) => stdoutOf(testCase.id, hostile))
    expect(elapsed(() => grade(cases, observations))).toBeLessThan(FAST_MS * 5)
  })

  it("regex catastrófica do professor contra saída hostil: cada comparação e a correção têm teto de tempo", () => {
    // Gravado antes da validação (gabarito antigo/importado): o guarda ainda protege.
    const cases = Array.from({ length: 30 }, (_, index) => ioCase(`r${index}`, "^(a+)+$", "regex"))
    const hostile = `${"a".repeat(40)}b`
    let result = grade(cases, cases.map((testCase) => stdoutOf(testCase.id, hostile)))
    const ms = elapsed(() => {
      result = grade(cases, cases.map((testCase) => stdoutOf(testCase.id, hostile)))
    })
    expect(ms).toBeLessThan(REGEX_GRADING_BUDGET_MS + REGEX_MATCH_TIMEOUT_MS + FAST_MS)
    expect(result.allPassed).toBe(false)
  })

  it("estouro de tempo falha fechado (não casa) e consome o orçamento", () => {
    const budget = createRegexBudget(100)
    expect(testRegexWithinBudget("^(a+)+$", `${"a".repeat(40)}b`, budget)).toBe(false)
    expect(budget.remainingMs).toBeLessThan(100 - REGEX_MATCH_TIMEOUT_MS / 2)
    expect(testRegexWithinBudget("^ok$", "ok", createRegexBudget(0))).toBe(false)
    expect(matchOutput("regex", "^\\d+ itens$", "lista\n3 itens\n")).toBe(true)
    expect(matchOutput("regex", "(", "qualquer")).toBe(false)
  })

  it("no cadastro: regex inválida, longa ou com quantificador aninhado é recusada", () => {
    for (const pattern of ["^(a+)+$", "(\\d+\\s*)*$", "(.*,){2,}x", "((ab)*c)+", "(", "a".repeat(1_001)]) {
      expect(describeRegexProblem(pattern), pattern).not.toBeNull()
      const parsed = testCasesSchema.safeParse([{ id: "x", kind: "io", expected_stdout: pattern, match: "regex" }])
      expect(parsed.success, pattern).toBe(false)
      const expr = testCasesSchema.safeParse([{ id: "y", kind: "expr", expr: "f()", expected_stdout: pattern, match: "regex" }])
      expect(expr.success, pattern).toBe(false)
    }
    for (const pattern of ["^\\d+$", "(ab)?c+", "[(]+\\)", "\\(a+\\)+", "^Olá, (Ana|Bia)!$", "(\\w+) tem \\d+ anos"]) {
      expect(describeRegexProblem(pattern), pattern).toBeNull()
    }
    expect(isLikelyCatastrophicRegex("(a|aa)*")).toBe(false) // não detectado: o guarda de tempo cobre
    // O texto de "contains"/"trimmed" não é regex: nada a validar.
    expect(testCasesSchema.safeParse([{ id: "z", kind: "io", expected_stdout: "(a+)+", match: "contains" }]).success).toBe(true)
  })
})

describe("valores do aluno na comparação", () => {
  it("chaves __proto__/constructor do esperado não casam com o protótipo do observado", () => {
    const observedWithOtherKey = JSON.parse('{"x": 1}') as Json
    expect(jsonEquals(JSON.parse('{"__proto__": {}}') as Json, observedWithOtherKey)).toBe(false)
    expect(jsonEquals({ constructor: {} }, { x: 1 })).toBe(false)
    expect(jsonEquals({ toString: {} }, { x: 1 })).toBe(false)
    // Uma chave __proto__ PRÓPRIA (dict do aluno) é só uma chave.
    expect(jsonEquals(JSON.parse('{"__proto__": 1}') as Json, JSON.parse('{"__proto__": 1}') as Json)).toBe(true)
    expect(jsonEquals({ a: 1 }, JSON.parse('{"__proto__": {"a": 1}}') as Json)).toBe(false)
  })

  it("aninhamento absurdo (runner comprometido) falha em vez de estourar a pilha", () => {
    const deep = nested(200_000)
    expect(() => jsonEquals(deep, deep)).not.toThrow()
    expect(jsonEquals(deep, deep)).toBe(false)
    expect(jsonEquals(nested(50), nested(50))).toBe(true)
    expect(() => pyRepr(deep)).not.toThrow()
  })

  it("NaN, infinito, -0, bool × int, inteiros grandes e tolerância", () => {
    expect(jsonEquals({ $float: "nan" }, { $float: "nan" })).toBe(true)
    expect(jsonEquals(0, { $float: "nan" })).toBe(false)
    expect(jsonEquals({ $float: "inf" }, { $float: "-inf" })).toBe(false)
    expect(jsonEquals(0, -0)).toBe(true)
    expect(jsonEquals(1, true)).toBe(false)
    expect(jsonEquals(true, 1)).toBe(false)
    expect(jsonEquals(0, false)).toBe(false)
    // 2^53+1 chega como texto: o número do professor (já arredondado pelo JSON) não casa por engano.
    expect(jsonEquals(9007199254740993, { $int: "9007199254740993" })).toBe(false)
    expect(jsonEquals({ $int: "9007199254740993" }, { $int: "9007199254740993" })).toBe(true)
    expect(jsonEquals(0.1 + 0.2, 0.3)).toBe(true)
    expect(jsonEquals(1.0, 1.1, 0.05)).toBe(false)
    expect(jsonEquals(1.0, 1.04, 0.05)).toBe(true)
    expect(jsonEquals(1e300, 1.0000000000001e300)).toBe(true)
    expect(jsonEquals(1e-300, 2e-300, 0)).toBe(false)
    // Valor marcado do aluno ($repr) nunca casa com um valor comum do professor.
    expect(jsonEquals("42", { $repr: "42" })).toBe(false)
    expect(jsonEquals({ k: 1 }, { $dict: [["k", 1]] })).toBe(false)
  })

  it("texto: sem normalização Unicode (NFC × NFD diferem) e 'trimmed' só mexe em espaço à direita", () => {
    const nfc = "é"
    const nfd = "é"
    expect(matchOutput("exact", nfc, nfd)).toBe(false)
    expect(matchOutput("trimmed", `${nfc}\n`, `${nfd}\n`)).toBe(false)
    expect(matchOutput("trimmed", "a\nb", "a  \r\nb\n\n")).toBe(true)
    expect(matchOutput("trimmed", "a b", "a  b")).toBe(false)
  })

  it("\\u0000 do aluno não chega à mensagem (o jsonb do PostgreSQL recusaria e a submissão daria 500)", () => {
    const cases: TestCase[] = [
      { id: "c", kind: "call", function: "f", args: [], kwargs: {}, expected: "ok" },
      { id: "e", kind: "expr", setup: "", expr: "g()", stdin: "", raises: "ValueError", match: "trimmed" },
    ]
    const result = grade(cases, [
      { id: "call:c", ok: true, value: "a\u0000b", type: "str" },
      { id: "expr:e", ok: true, raised: { type: "KeyError", mro: ["KeyError"], message: "\u0000", stage: "expr" } },
    ])
    expect(result.allPassed).toBe(false)
    expect(JSON.stringify(result)).not.toContain("\\u0000")
  })
})

describe("unittest: contagens que o aluno controla", () => {
  const unittestCase = (id: string, extra: Partial<UnittestCase>): UnittestCase => ({ id, kind: "unittest", expect: "pass", ...extra })
  const outcome = (id: string, run: number, failures: number, skipped = 0): ProbeObservation =>
    ({ id, ok: true, tests: { run, failures, errors: 0, skipped, failed: [] } })

  it("testes pulados não contam para min_tests nem como 'ao menos um teste'", () => {
    const cases = [unittestCase("a", { min_tests: 4 })]
    expect(grade(cases, [outcome("unittest:a", 6, 0, 3)]).failureDetails[0]).toContain("pelo menos 4")
    expect(grade([unittestCase("b", {})], [outcome("unittest:b", 2, 0, 2)]).allPassed).toBe(false)
  })

  it("suíte não determinística (resultados diferentes nas duas execuções) é reprovada", () => {
    const cases = [unittestCase("m", { expect: "fail", target: "f", implementation: "def f(): ..." })]
    expect(grade(cases, [outcome("unittest:m", 4, 1), outcome("unittest:m:repeticao", 4, 0)]).failureDetails[0]).toContain("não determinísticos")
    expect(grade(cases, [outcome("unittest:m", 4, 1)]).allPassed).toBe(false)
    expect(grade(cases, [outcome("unittest:m", 4, 1), outcome("unittest:m:repeticao", 4, 2)]).allPassed).toBe(true)
  })

  it("suíte que 'chuta': chance de aprovação por envio cai de 2^-k para 2^-2k", () => {
    const cases = [
      unittestCase("ref", { expect: "pass", target: "f", implementation: "r" }),
      ...["m1", "m2", "m3", "m4", "m5"].map((id) => unittestCase(id, { expect: "fail", target: "f", implementation: id })),
    ]
    const executions = buildProbes(cases).length
    expect(executions).toBe(2 * cases.length)
    // Sorteio exaustivo de uma suíte aleatória: aprova só quando TODAS as execuções acertam.
    let approved = 0
    const total = 2 ** executions
    for (let mask = 0; mask < total; mask++) {
      const observations = buildProbes(cases).map((probe, index) => outcome(probe.id, 4, (mask >> index) & 1))
      if (grade(cases, observations).allPassed) approved++
    }
    expect(approved / total).toBe(2 ** -executions)
  })
})

describe("regras de estrutura negativas", () => {
  const features = (extra: Partial<AstFeatures>): AstFeatures => ({
    constructs: [], calls: [], functions: [], classes: [], imports: [], recursive_functions: [], decorators: [], handlers: [],
    function_constructs: {}, ...extra,
  })

  it("'não use max' falha com apelido (maior = max) e com busca dinâmica (getattr/eval)", () => {
    const rule = { type: "not_calls", name: "max" } as const
    expect(checkRule(rule, features({ calls: ["maior"], names: ["maior", "max"], dynamic: [] }))).toBe(false)
    expect(checkRule(rule, features({ calls: ["getattr"], names: ["getattr", "builtins"], dynamic: ["getattr", "builtins"] }))).toBe(false)
    expect(checkRule(rule, features({ calls: ["sorted"], names: ["sorted", "x"], dynamic: [] }))).toBe(true)
    // Observação de harness antigo (sem names/dynamic): continua valendo a regra pelas chamadas.
    expect(checkRule(rule, features({ calls: ["sorted"] }))).toBe(true)
  })

  it("'não use for' falha quando o código executa texto (exec/eval)", () => {
    const rule = { type: "not_uses", construct: "for" } as const
    expect(checkRule(rule, features({ constructs: ["def"], dynamic: ["exec"] }))).toBe(false)
    expect(checkRule(rule, features({ constructs: ["def", "list_comprehension"], dynamic: [] }))).toBe(true)
  })
})

describe("observações forjadas ou malformadas", () => {
  it("observação sem valor, com exceção inesperada ou com id trocado não aprova", () => {
    const cases: TestCase[] = [{ id: "c", kind: "call", function: "f", args: [], kwargs: {}, expected: null }]
    expect(grade(cases, [{ id: "call:c", ok: true }]).allPassed).toBe(false)
    expect(grade(cases, [{ id: "call:outro", ok: true, value: null }]).allPassed).toBe(false)
    expect(grade(cases, [{ id: "call:c", ok: false, value: null }]).allPassed).toBe(false)
    const exprCases: TestCase[] = [{ id: "e", kind: "expr", setup: "", expr: "f()", stdin: "", expected: 1, match: "trimmed" }]
    expect(grade(exprCases, [{ id: "expr:e", ok: true, value: 1, raised: { type: "ValueError", mro: [], message: "", stage: "expr" } }]).allPassed).toBe(false)
  })
})
