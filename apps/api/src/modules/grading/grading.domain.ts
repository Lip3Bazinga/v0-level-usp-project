import type {
  CaseResult, GradeResult, Json, Probe, ProbeObservation, SourceRule, TestCase,
} from "@levelusp/contracts"
import { jsonEquals, normalizeOutput, pyRepr } from "./compare"

/**
 * Motor de correção (domínio puro, sem I/O):
 *   1. `buildProbes` transforma casos de teste em sondas SEM valores esperados;
 *   2. o executor roda as sondas no sandbox e devolve observações;
 *   3. `grade` compara observações com o esperado — fora do alcance do aluno.
 */

const GLOBALS_PROBE = "globals"
const AST_PROBE = "ast"

export function buildProbes(cases: TestCase[]): Probe[] {
  const probes: Probe[] = []
  const variables = new Set<string>()
  let needsAst = false
  for (const c of cases) {
    switch (c.kind) {
      case "call":
        probes.push({ id: `call:${c.id}`, kind: "call", function: c.function, args: c.args, kwargs: c.kwargs })
        break
      case "io":
        probes.push({ id: `run:${c.id}`, kind: "run", stdin: c.stdin })
        break
      case "variable":
        variables.add(c.variable)
        break
      case "source":
        needsAst = true
        break
      case "legacy":
        probes.push({ id: `legacy:${c.id}`, kind: "legacy", code: c.code })
        break
    }
  }
  if (variables.size) probes.push({ id: GLOBALS_PROBE, kind: "globals", names: [...variables] })
  if (needsAst) probes.push({ id: AST_PROBE, kind: "ast" })
  return probes
}

export function grade(cases: TestCase[], observations: ProbeObservation[], durationMs = 0): GradeResult {
  const obs = new Map(observations.map((o) => [o.id, o]))
  const results: CaseResult[] = []
  let testsRun = 0
  let failedTests = 0
  let errors = 0

  for (const c of cases) {
    if (c.kind === "legacy") {
      const o = obs.get(`legacy:${c.id}`)
      const leg = o?.legacy
      if (!leg) {
        testsRun++
        failedTests++
        errors++
        results.push(fail(c, describeError(o)))
        continue
      }
      // Um caso legado pode conter vários asserts: cada um conta como teste.
      testsRun += leg.testsRun
      failedTests += leg.failures + leg.errors
      errors += leg.errors
      const passed = leg.failures + leg.errors === 0
      results.push({ id: c.id, name: label(c), passed, message: passed ? null : leg.details.join("\n") || "Resposta incorreta." })
      continue
    }
    const r = gradeCase(c, obs)
    testsRun++
    if (!r.result.passed) failedTests++
    if (r.error) errors++
    results.push(r.result)
  }

  const failed = results.filter((r) => !r.passed)
  return {
    testsRun,
    passed: testsRun - failedTests,
    failures: Math.max(0, failedTests - errors),
    errors,
    allPassed: cases.length > 0 && failed.length === 0,
    failureDetails: failed.map((r) => (r.message ? `${r.name}: ${r.message}` : r.name)),
    cases: results,
    strength: cases.some((c) => c.kind === "legacy") ? "legacy" : "strong",
    durationMs,
  }
}

function gradeCase(c: Exclude<TestCase, { kind: "legacy" }>, obs: Map<string, ProbeObservation>): { result: CaseResult; error: boolean } {
  switch (c.kind) {
    case "call": {
      const o = obs.get(`call:${c.id}`)
      const call = `${c.function}(${[...c.args.map((a) => pyRepr(a, 40)), ...Object.entries(c.kwargs).map(([k, v]) => `${k}=${pyRepr(v, 40)}`)].join(", ")})`
      if (!o?.ok) return { result: fail(c, `${call} → ${describeError(o)}`), error: true }
      if (c.type && o.type !== c.type) return { result: fail(c, `${call} deveria retornar ${c.type}, mas retornou ${o.type}`), error: false }
      if (!jsonEquals(c.expected, o.value as Json, c.tolerance)) {
        const msg = c.reveal ? `${call} retornou ${pyRepr(o.value)}; esperado ${pyRepr(c.expected)}` : `${call} retornou ${pyRepr(o.value)}, que não é o esperado`
        return { result: fail(c, msg), error: false }
      }
      return { result: pass(c), error: false }
    }
    case "io": {
      const o = obs.get(`run:${c.id}`)
      if (!o?.ok) return { result: fail(c, describeError(o)), error: true }
      const ok = matchOutput(c.match, c.expected_stdout, o.stdout ?? "")
      if (!ok) {
        const what = c.reveal ? `esperado ${JSON.stringify(c.expected_stdout)}, obtido ${JSON.stringify((o.stdout ?? "").slice(0, 200))}` : "a saída do programa não é a esperada"
        return { result: fail(c, what), error: false }
      }
      return { result: pass(c), error: false }
    }
    case "variable": {
      const o = obs.get(GLOBALS_PROBE)
      if (!o?.ok) return { result: fail(c, describeError(o)), error: true }
      if (o.missing?.includes(c.variable) || !o.values || !(c.variable in o.values)) {
        return { result: fail(c, `a variável ${c.variable} não foi definida`), error: false }
      }
      const actual = o.values[c.variable] as Json
      if (c.type && o.types?.[c.variable] !== c.type) {
        return { result: fail(c, `${c.variable} deveria ser ${c.type}, mas é ${o.types?.[c.variable]}`), error: false }
      }
      if (!jsonEquals(c.expected, actual, c.tolerance)) {
        const msg = c.reveal ? `${c.variable} = ${pyRepr(actual)}; esperado ${pyRepr(c.expected)}` : `${c.variable} = ${pyRepr(actual)}, que não é o esperado`
        return { result: fail(c, msg), error: false }
      }
      return { result: pass(c), error: false }
    }
    case "source": {
      const o = obs.get(AST_PROBE)
      if (!o?.ok || !o.features) return { result: fail(c, describeError(o)), error: true }
      const ok = checkRule(c.rule, o.features)
      return { result: ok ? pass(c) : fail(c, describeRule(c.rule)), error: false }
    }
  }
}

export function matchOutput(mode: "exact" | "trimmed" | "contains" | "regex", expected: string, actual: string): boolean {
  switch (mode) {
    case "exact":
      return actual === expected
    case "trimmed":
      return normalizeOutput(actual) === normalizeOutput(expected)
    case "contains":
      return normalizeOutput(actual).includes(normalizeOutput(expected))
    case "regex":
      try {
        return new RegExp(expected, "m").test(actual)
      } catch {
        return false
      }
  }
}

export function checkRule(rule: SourceRule, f: NonNullable<ProbeObservation["features"]>): boolean {
  switch (rule.type) {
    case "uses":
      return f.constructs.includes(rule.construct)
    case "not_uses":
      return !f.constructs.includes(rule.construct)
    case "calls":
      return f.calls.includes(rule.name)
    case "not_calls":
      return !f.calls.includes(rule.name)
    case "defines_function":
      return f.functions.includes(rule.name)
    case "defines_class":
      return f.classes.includes(rule.name)
    case "imports":
      return f.imports.includes(rule.module)
  }
}

const CONSTRUCT_NAMES: Record<string, string> = {
  lambda: "uma função lambda", for: "um laço for", while: "um laço while", if: "um if", def: "uma função (def)",
  class: "uma classe", list_comprehension: "uma list comprehension", dict_comprehension: "uma dict comprehension",
  f_string: "uma f-string", try: "um bloco try/except", with: "um bloco with", return: "return", import: "import",
  recursion: "recursão",
}

function describeRule(rule: SourceRule): string {
  switch (rule.type) {
    case "uses":
      return `use ${CONSTRUCT_NAMES[rule.construct] ?? rule.construct}`
    case "not_uses":
      return `não use ${CONSTRUCT_NAMES[rule.construct] ?? rule.construct}`
    case "calls":
      return `use a função ${rule.name}()`
    case "not_calls":
      return `não use a função ${rule.name}()`
    case "defines_function":
      return `defina a função ${rule.name}`
    case "defines_class":
      return `defina a classe ${rule.name}`
    case "imports":
      return `importe o módulo ${rule.module}`
  }
}

function describeError(o: ProbeObservation | undefined): string {
  if (!o) return "não foi possível executar o código"
  if (o.timedOut) return "tempo limite excedido (verifique laços infinitos)"
  return o.error ? `erro: ${o.error}` : "não foi possível executar o código"
}

function label(c: TestCase): string {
  return c.name ?? `Teste ${c.id}`
}

function pass(c: TestCase): CaseResult {
  return { id: c.id, name: label(c), passed: true, message: null }
}

function fail(c: TestCase, message: string): CaseResult {
  const hint = c.hint ? ` — dica: ${c.hint}` : ""
  return { id: c.id, name: label(c), passed: false, message: `${message}${hint}` }
}
