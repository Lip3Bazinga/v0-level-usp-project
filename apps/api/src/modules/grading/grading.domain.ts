import {
  PY_BUILTIN_TYPE_NAMES,
  type AstFeatures, type CaseResult, type GradeResult, type LegacyCase, type OutputMatchMode, type Probe,
  type ProbeObservation, type RaisedException, type SourceRule, type TestCase,
} from "@levelusp/contracts"
import { jsonEquals, normalizeOutput, pyRepr } from "./compare"

/**
 * Motor de correção (domínio puro, sem I/O):
 *   1. `buildProbes` transforma casos de teste em sondas SEM valores esperados;
 *   2. o executor roda as sondas no sandbox e devolve observações;
 *   3. `grade` compara observações com o esperado — fora do alcance do aluno.
 */

type CaseKind = TestCase["kind"]
type CaseOf<Kind extends CaseKind> = Extract<TestCase, { kind: Kind }>
/** Casos comparados na API; os legados trazem o veredito pronto do sandbox. */
type DeclarativeKind = Exclude<CaseKind, "legacy">
type RuleType = SourceRule["type"]
type RuleOf<Type extends RuleType> = Extract<SourceRule, { type: Type }>

/** Todas as variáveis vão numa única sonda; a análise de AST também é única. */
const GLOBALS_PROBE_ID = "globals"
const AST_PROBE_ID = "ast"
const callProbeId = (caseId: string) => `call:${caseId}`
const runProbeId = (caseId: string) => `run:${caseId}`
const legacyProbeId = (caseId: string) => `legacy:${caseId}`
const exprProbeId = (caseId: string) => `expr:${caseId}`
const unittestProbeId = (caseId: string) => `unittest:${caseId}`

/** Argumentos ficam curtos na mensagem para não esconder o que importa. */
const MAX_ARGUMENT_REPR = 40
const MAX_REVEALED_STDOUT = 200
const MAX_EXPRESSION_REPR = 60
const MAX_EXCEPTION_MESSAGE = 120
const MAX_FAILED_TEST_NAMES = 5

type ObservationIndex = ReadonlyMap<string, ProbeObservation>

interface CaseVerdict {
  result: CaseResult
  /** O código do aluno nem chegou a produzir o que era verificado (erro, timeout). */
  isExecutionError: boolean
}

interface ProbePlan {
  probes: Probe[]
  variables: Set<string>
  needsAst: boolean
}

const PROBE_PLANNERS: { [Kind in CaseKind]: (testCase: CaseOf<Kind>, plan: ProbePlan) => void } = {
  call: (testCase, plan) => {
    plan.probes.push({ id: callProbeId(testCase.id), kind: "call", function: testCase.function, args: testCase.args, kwargs: testCase.kwargs })
  },
  io: (testCase, plan) => {
    plan.probes.push({ id: runProbeId(testCase.id), kind: "run", stdin: testCase.stdin })
  },
  variable: (testCase, plan) => {
    plan.variables.add(testCase.variable)
  },
  source: (_testCase, plan) => {
    plan.needsAst = true
  },
  expr: (testCase, plan) => {
    plan.probes.push({ id: exprProbeId(testCase.id), kind: "expr", setup: testCase.setup, expr: testCase.expr, stdin: testCase.stdin })
  },
  unittest: (testCase, plan) => {
    const { test_class: testClass, target, implementation } = testCase
    plan.probes.push({
      id: unittestProbeId(testCase.id),
      kind: "unittest",
      ...(testClass === undefined ? {} : { test_class: testClass }),
      ...(target === undefined || implementation === undefined ? {} : { target, implementation }),
    })
  },
  legacy: (testCase, plan) => {
    plan.probes.push({ id: legacyProbeId(testCase.id), kind: "legacy", code: testCase.code })
  },
}

function planCase<Kind extends CaseKind>(kind: Kind, testCase: CaseOf<Kind>, plan: ProbePlan): void {
  PROBE_PLANNERS[kind](testCase, plan)
}

export function buildProbes(cases: TestCase[]): Probe[] {
  const plan: ProbePlan = { probes: [], variables: new Set(), needsAst: false }
  for (const testCase of cases) planCase(testCase.kind, testCase, plan)
  if (plan.variables.size) plan.probes.push({ id: GLOBALS_PROBE_ID, kind: "globals", names: [...plan.variables] })
  if (plan.needsAst) plan.probes.push({ id: AST_PROBE_ID, kind: "ast" })
  return plan.probes
}

interface GradeTally {
  results: CaseResult[]
  testsRun: number
  failedTests: number
  errors: number
}

export function grade(cases: TestCase[], observations: ProbeObservation[], durationMs = 0): GradeResult {
  const observationById: ObservationIndex = new Map(observations.map((observation) => [observation.id, observation]))
  const tally: GradeTally = { results: [], testsRun: 0, failedTests: 0, errors: 0 }
  for (const testCase of cases) {
    if (testCase.kind === "legacy") tallyLegacy(tally, testCase, observationById.get(legacyProbeId(testCase.id)))
    else tallyVerdict(tally, gradeDeclarative(testCase.kind, testCase, observationById))
  }

  const failed = tally.results.filter((result) => !result.passed)
  return {
    testsRun: tally.testsRun,
    passed: tally.testsRun - tally.failedTests,
    failures: Math.max(0, tally.failedTests - tally.errors),
    errors: tally.errors,
    allPassed: cases.length > 0 && failed.length === 0,
    failureDetails: failed.map((result) => (result.message ? `${result.name}: ${result.message}` : result.name)),
    cases: tally.results,
    strength: cases.some((testCase) => testCase.kind === "legacy") ? "legacy" : "strong",
    durationMs,
  }
}

function tallyVerdict(tally: GradeTally, verdict: CaseVerdict): void {
  tally.testsRun++
  if (!verdict.result.passed) tally.failedTests++
  if (verdict.isExecutionError) tally.errors++
  tally.results.push(verdict.result)
}

/** Um caso legado pode conter vários asserts: cada um conta como teste. */
function tallyLegacy(tally: GradeTally, testCase: LegacyCase, observation: ProbeObservation | undefined): void {
  const legacy = observation?.legacy
  if (!legacy) {
    tallyVerdict(tally, { result: fail(testCase, describeError(observation)), isExecutionError: true })
    return
  }
  tally.testsRun += legacy.testsRun
  tally.failedTests += legacy.failures + legacy.errors
  tally.errors += legacy.errors
  const passed = legacy.failures + legacy.errors === 0
  tally.results.push({ id: testCase.id, name: label(testCase), passed, message: passed ? null : legacy.details.join("\n") || "Resposta incorreta." })
}

const CASE_GRADERS: { [Kind in DeclarativeKind]: (testCase: CaseOf<Kind>, observations: ObservationIndex) => CaseVerdict } = {
  call: gradeCall,
  io: gradeOutput,
  variable: gradeVariable,
  source: gradeSource,
  expr: gradeExpression,
  unittest: gradeTestSuite,
}

function gradeDeclarative<Kind extends DeclarativeKind>(kind: Kind, testCase: CaseOf<Kind>, observations: ObservationIndex): CaseVerdict {
  return CASE_GRADERS[kind](testCase, observations)
}

const passed = (testCase: TestCase): CaseVerdict => ({ result: pass(testCase), isExecutionError: false })
const failed = (testCase: TestCase, message: string): CaseVerdict => ({ result: fail(testCase, message), isExecutionError: false })
const crashed = (testCase: TestCase, message: string): CaseVerdict => ({ result: fail(testCase, message), isExecutionError: true })

function describeCall(testCase: CaseOf<"call">): string {
  const positional = testCase.args.map((arg) => pyRepr(arg, MAX_ARGUMENT_REPR))
  const named = Object.entries(testCase.kwargs).map(([name, value]) => `${name}=${pyRepr(value, MAX_ARGUMENT_REPR)}`)
  return `${testCase.function}(${[...positional, ...named].join(", ")})`
}

function gradeCall(testCase: CaseOf<"call">, observations: ObservationIndex): CaseVerdict {
  const observation = observations.get(callProbeId(testCase.id))
  const call = describeCall(testCase)
  if (!observation?.ok) return crashed(testCase, `${call} → ${describeError(observation)}`)
  if (testCase.type && observation.type !== testCase.type) {
    return failed(testCase, `${call} deveria retornar ${testCase.type}, mas retornou ${observation.type}`)
  }
  if (observation.value === undefined || !jsonEquals(testCase.expected, observation.value, testCase.tolerance)) {
    const returned = pyRepr(observation.value)
    return failed(testCase, testCase.reveal ? `${call} retornou ${returned}; esperado ${pyRepr(testCase.expected)}` : `${call} retornou ${returned}, que não é o esperado`)
  }
  return passed(testCase)
}

function gradeOutput(testCase: CaseOf<"io">, observations: ObservationIndex): CaseVerdict {
  const observation = observations.get(runProbeId(testCase.id))
  if (!observation?.ok) return crashed(testCase, describeError(observation))
  const stdout = observation.stdout ?? ""
  if (matchOutput(testCase.match, testCase.expected_stdout, stdout)) return passed(testCase)
  return failed(
    testCase,
    testCase.reveal
      ? `esperado ${JSON.stringify(testCase.expected_stdout)}, obtido ${JSON.stringify(stdout.slice(0, MAX_REVEALED_STDOUT))}`
      : "a saída do programa não é a esperada",
  )
}

function gradeVariable(testCase: CaseOf<"variable">, observations: ObservationIndex): CaseVerdict {
  const observation = observations.get(GLOBALS_PROBE_ID)
  if (!observation?.ok) return crashed(testCase, describeError(observation))
  const { variable } = testCase
  const actual = observation.missing?.includes(variable) ? undefined : observation.values?.[variable]
  if (actual === undefined) return failed(testCase, `a variável ${variable} não foi definida`)
  const actualType = observation.types?.[variable]
  if (testCase.type && actualType !== testCase.type) return failed(testCase, `${variable} deveria ser ${testCase.type}, mas é ${actualType}`)
  if (!jsonEquals(testCase.expected, actual, testCase.tolerance)) {
    const current = pyRepr(actual)
    return failed(testCase, testCase.reveal ? `${variable} = ${current}; esperado ${pyRepr(testCase.expected)}` : `${variable} = ${current}, que não é o esperado`)
  }
  return passed(testCase)
}

function gradeSource(testCase: CaseOf<"source">, observations: ObservationIndex): CaseVerdict {
  const observation = observations.get(AST_PROBE_ID)
  if (!observation?.ok || !observation.features) return crashed(testCase, describeError(observation))
  return checkRule(testCase.rule, observation.features) ? passed(testCase) : failed(testCase, describeRule(testCase.rule))
}

/**
 * O executor só escreve um nome puro (`int`, `ValueError`) quando o tipo É o
 * embutido; classes do aluno chegam como `modulo.Classe`. Nome embutido exige
 * igualdade exata; nome de classe do aluno casa pelo sufixo `.Classe`.
 */
export function typeMatches(expected: string, observed: string | undefined): boolean {
  if (observed === undefined) return false
  if (observed === expected) return true
  return !PY_BUILTIN_TYPE_NAMES.has(expected) && observed.endsWith(`.${expected}`)
}

/** Nome legível para o aluno: `__main__.Tarefa` → `Tarefa`. */
function displayType(observed: string | undefined): string {
  if (observed === undefined) return "?"
  return observed.startsWith("__main__.") ? observed.slice("__main__.".length) : observed
}

function describeExpression(testCase: CaseOf<"expr">): string {
  const expression = testCase.expr.replace(/\s+/g, " ")
  return expression.length > MAX_EXPRESSION_REPR ? `${expression.slice(0, MAX_EXPRESSION_REPR - 1)}…` : expression
}

function describeRaised(raised: RaisedException): string {
  const message = raised.message.length > MAX_EXCEPTION_MESSAGE ? `${raised.message.slice(0, MAX_EXCEPTION_MESSAGE - 1)}…` : raised.message
  return message ? `${displayType(raised.type)}: ${message}` : displayType(raised.type)
}

function gradeExpression(testCase: CaseOf<"expr">, observations: ObservationIndex): CaseVerdict {
  const observation = observations.get(exprProbeId(testCase.id))
  const subject = describeExpression(testCase)
  if (!observation?.ok) return crashed(testCase, `${subject} → ${describeError(observation)}`)
  if (testCase.raises !== undefined) return gradeExpectedException(testCase, observation, subject)
  if (observation.raised) return crashed(testCase, `${subject} levantou ${describeRaised(observation.raised)}`)
  const valueProblem = describeValueProblem(testCase, observation, subject)
  if (valueProblem) return failed(testCase, valueProblem)
  return checkExpressionOutput(testCase, observation)
}

function describeValueProblem(testCase: CaseOf<"expr">, observation: ProbeObservation, subject: string): string | null {
  if (testCase.type !== undefined && !typeMatches(testCase.type, observation.type)) {
    return `${subject} deveria ser do tipo ${testCase.type}, mas é ${displayType(observation.type)}`
  }
  if (testCase.expected === undefined) return null
  if (observation.value !== undefined && jsonEquals(testCase.expected, observation.value, testCase.tolerance)) return null
  const obtained = pyRepr(observation.value)
  return testCase.reveal ? `${subject} → ${obtained}; esperado ${pyRepr(testCase.expected)}` : `${subject} → ${obtained}, que não é o esperado`
}

function gradeExpectedException(testCase: CaseOf<"expr">, observation: ProbeObservation, subject: string): CaseVerdict {
  const expected = testCase.raises ?? ""
  const { raised } = observation
  if (!raised) return failed(testCase, `${subject} deveria levantar ${expected}, mas não levantou nenhuma exceção`)
  if (!raised.mro.some((entry) => typeMatches(expected, entry))) {
    return failed(testCase, `${subject} deveria levantar ${expected}, mas levantou ${describeRaised(raised)}`)
  }
  const fragment = testCase.message_contains
  if (fragment !== undefined && !raised.message.includes(fragment)) {
    return failed(
      testCase,
      testCase.reveal
        ? `a mensagem de ${expected} deveria conter ${JSON.stringify(fragment)}; obtida ${JSON.stringify(raised.message)}`
        : `a mensagem de ${expected} (${JSON.stringify(raised.message)}) não é a esperada`,
    )
  }
  return checkExpressionOutput(testCase, observation)
}

function checkExpressionOutput(testCase: CaseOf<"expr">, observation: ProbeObservation): CaseVerdict {
  if (testCase.expected_stdout === undefined) return passed(testCase)
  const stdout = observation.stdout ?? ""
  if (matchOutput(testCase.match, testCase.expected_stdout, stdout)) return passed(testCase)
  return failed(
    testCase,
    testCase.reveal
      ? `saída esperada ${JSON.stringify(testCase.expected_stdout)}, obtida ${JSON.stringify(stdout.slice(0, MAX_REVEALED_STDOUT))}`
      : "o que foi impresso não é o esperado",
  )
}

/** A suíte do aluno contra uma implementação: a API decide se passar era o certo. */
function gradeTestSuite(testCase: CaseOf<"unittest">, observations: ObservationIndex): CaseVerdict {
  const observation = observations.get(unittestProbeId(testCase.id))
  const tests = observation?.tests
  if (!observation?.ok || !tests) return crashed(testCase, describeError(observation))
  const target = testCase.implementation === undefined ? "a sua implementação" : "esta implementação"
  if (testCase.min_tests !== undefined && tests.run < testCase.min_tests) {
    return failed(testCase, `sua suíte rodou ${tests.run} teste(s); são necessários pelo menos ${testCase.min_tests}`)
  }
  if (tests.run === 0) return failed(testCase, "nenhum teste foi encontrado na sua suíte")
  const hasDetectedDefect = tests.failures + tests.errors > 0
  if (testCase.expect === "pass") {
    if (!hasDetectedDefect) return passed(testCase)
    const names = tests.failed.slice(0, MAX_FAILED_TEST_NAMES).join(", ")
    return failed(testCase, `seus testes falharam contra ${target}${names ? ` (${names})` : ""}`)
  }
  if (hasDetectedDefect) return passed(testCase)
  return failed(testCase, `seus testes passaram contra ${target}, mas ela tem um defeito que eles deveriam detectar`)
}

const OUTPUT_MATCHERS: Record<OutputMatchMode, (expected: string, actual: string) => boolean> = {
  exact: (expected, actual) => actual === expected,
  trimmed: (expected, actual) => normalizeOutput(actual) === normalizeOutput(expected),
  contains: (expected, actual) => normalizeOutput(actual).includes(normalizeOutput(expected)),
  regex: (pattern, actual) => {
    try {
      return new RegExp(pattern, "m").test(actual)
    } catch {
      return false
    }
  },
}

export function matchOutput(mode: OutputMatchMode, expected: string, actual: string): boolean {
  return OUTPUT_MATCHERS[mode](expected, actual)
}

const CONSTRUCT_NAMES: Record<string, string> = {
  lambda: "uma função lambda", for: "um laço for", while: "um laço while", if: "um if", def: "uma função (def)",
  class: "uma classe", list_comprehension: "uma list comprehension", dict_comprehension: "uma dict comprehension",
  f_string: "uma f-string", try: "um bloco try/except", with: "um bloco with", return: "return", import: "import",
  recursion: "recursão", yield: "yield (generator)",
}

const constructName = (construct: string) => CONSTRUCT_NAMES[construct] ?? construct

/** Construções do projeto inteiro, ou só do corpo da função (vazio se ela não existe). */
function constructsIn(features: AstFeatures, functionName: string | undefined): string[] {
  if (functionName === undefined) return features.constructs
  return features.function_constructs[functionName] ?? []
}

function inFunction(functionName: string | undefined): string {
  return functionName === undefined ? "" : ` na função ${functionName}`
}

interface SourceRuleStrategy<Type extends RuleType> {
  check(rule: RuleOf<Type>, features: AstFeatures): boolean
  /** O que o aluno precisa fazer, mostrado quando a regra falha. */
  describe(rule: RuleOf<Type>): string
}

const SOURCE_RULES: { [Type in RuleType]: SourceRuleStrategy<Type> } = {
  uses: {
    check: (rule, features) => constructsIn(features, rule.function).includes(rule.construct),
    describe: (rule) => `use ${constructName(rule.construct)}${inFunction(rule.function)}`,
  },
  not_uses: {
    check: (rule, features) => !constructsIn(features, rule.function).includes(rule.construct),
    describe: (rule) => `não use ${constructName(rule.construct)}${inFunction(rule.function)}`,
  },
  calls: { check: (rule, features) => features.calls.includes(rule.name), describe: (rule) => `use a função ${rule.name}()` },
  not_calls: { check: (rule, features) => !features.calls.includes(rule.name), describe: (rule) => `não use a função ${rule.name}()` },
  defines_function: { check: (rule, features) => features.functions.includes(rule.name), describe: (rule) => `defina a função ${rule.name}` },
  defines_class: { check: (rule, features) => features.classes.includes(rule.name), describe: (rule) => `defina a classe ${rule.name}` },
  imports: { check: (rule, features) => features.imports.includes(rule.module), describe: (rule) => `importe o módulo ${rule.module}` },
  decorator: { check: (rule, features) => features.decorators.includes(rule.name), describe: (rule) => `use o decorator @${rule.name}` },
  catches: { check: (rule, features) => features.handlers.includes(rule.exception), describe: (rule) => `capture ${rule.exception} com except` },
}

function ruleStrategy<Type extends RuleType>(type: Type): SourceRuleStrategy<Type> {
  return SOURCE_RULES[type]
}

export function checkRule(rule: SourceRule, features: AstFeatures): boolean {
  return ruleStrategy(rule.type).check(rule, features)
}

function describeRule(rule: SourceRule): string {
  return ruleStrategy(rule.type).describe(rule)
}

function describeError(observation: ProbeObservation | undefined): string {
  if (!observation) return "não foi possível executar o código"
  if (observation.timedOut) return "tempo limite excedido (verifique laços infinitos)"
  return observation.error ? `erro: ${observation.error}` : "não foi possível executar o código"
}

function label(testCase: TestCase): string {
  return testCase.name ?? `Teste ${testCase.id}`
}

function pass(testCase: TestCase): CaseResult {
  return { id: testCase.id, name: label(testCase), passed: true, message: null }
}

function fail(testCase: TestCase, message: string): CaseResult {
  const hint = testCase.hint ? ` — dica: ${testCase.hint}` : ""
  return { id: testCase.id, name: label(testCase), passed: false, message: `${message}${hint}` }
}
