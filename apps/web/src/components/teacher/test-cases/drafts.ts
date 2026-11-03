import {
  OUTPUT_MATCH_MODES,
  UNITTEST_EXPECTATIONS,
  jsonSchema,
  pyTypeSchema,
  testCaseSchema,
  type Json,
  type OutputMatchMode,
  type PyType,
  type SourceRule,
  type TestCase,
} from "@levelusp/contracts"
import { isOneOf } from "@/lib/utils"

/**
 * Rascunho editável de um caso de teste.
 *
 * O formulário guarda tudo como texto (inclusive os valores JSON de
 * argumentos/esperado), para que o professor possa digitar livremente e ver o
 * erro de validação na hora. A conversão para `TestCase` (contrato da API)
 * acontece em `compileDraft`, usando os schemas de `@levelusp/contracts`.
 *
 * É "plano" (todos os campos de todos os tipos) de propósito: trocar o tipo de
 * um caso preserva o que já foi digitado nos campos compartilhados.
 */
export interface TestCaseDraft {
  /** Chave estável para o React (não vai para a API). */
  key: string
  kind: TestCaseKind
  id: string
  name: string
  hint: string
  reveal: boolean
  // call
  fn: string
  args: string
  kwargs: string
  // call + variable + expr
  expected: string
  pyType: PyType | ""
  tolerance: string
  // io + expr
  stdin: string
  expectedStdout: string
  match: OutputMatchMode
  // variable
  variable: string
  // source
  ruleType: SourceRuleType
  ruleValue: string
  /** Função à qual a regra de construção se restringe (vazio = projeto todo). */
  ruleFunction: string
  // expr
  setup: string
  expression: string
  exprCheck: ExprCheck
  /** Tipo exigido do valor da expressão (texto livre: `int`, `generator`, `Tarefa`). */
  typeName: string
  raises: string
  messageContains: string
  // unittest
  suiteTarget: SuiteTarget
  target: string
  implementation: string
  suiteExpect: SuiteExpectation
  testClass: string
  minTests: string
  // legacy
  code: string
}

export type TestCaseKind = TestCase["kind"]
export type SourceRuleType = SourceRule["type"]
export type DraftField = Exclude<keyof TestCaseDraft, "key">
export type DraftErrors = Partial<Record<DraftField, string>>
/** O que um caso `expr` verifica: o valor/tipo resultante ou a exceção levantada. */
export type ExprCheck = "value" | "raises"
/** Contra qual implementação a suíte do aluno roda. */
export type SuiteTarget = "student" | "teacher"
export type SuiteExpectation = (typeof UNITTEST_EXPECTATIONS)[number]

export interface CompiledDraft {
  testCase: TestCase | null
  errors: DraftErrors
}

export interface CompiledDrafts {
  cases: TestCase[]
  /** Erros por `key` do rascunho. */
  errors: Record<string, DraftErrors>
  valid: boolean
  errorCount: number
}

const MAX_CASES_PER_LESSON = 100

export const KIND_LABELS: Record<TestCaseKind, string> = {
  call: "Chamar função",
  io: "Entrada e saída",
  variable: "Valor de variável",
  source: "Estrutura do código",
  expr: "Avaliar expressão",
  unittest: "Testes do aluno (unittest)",
  legacy: "Teste legado (assert/unittest)",
}

export const KIND_DESCRIPTIONS: Record<TestCaseKind, string> = {
  call: "Chama uma função do aluno com argumentos e compara o valor retornado.",
  io: "Roda o main.py com uma entrada (stdin) e compara o que foi impresso.",
  variable: "Roda o main.py e confere o valor final de uma variável global.",
  source: "Analisa o código (sem executar) para exigir ou proibir uma construção.",
  expr:
    "Roda o main.py, executa a sua preparação (ex.: criar objetos, arquivos) e avalia uma expressão: compara o valor, " +
    "o tipo, a exceção levantada ou o que foi impresso. Serve para classes, métodos, exceções, generators e arquivos.",
  unittest:
    "Roda a suíte unittest escrita pelo aluno contra uma implementação: a correta deve passar e uma com defeito " +
    "(mutante) deve ser reprovada pelos testes dele.",
  legacy: "Código assert/unittest antigo, executado junto com o código do aluno.",
}

/** Tipos oferecidos ao criar um caso novo (legado só aparece em lições importadas). */
export const CREATABLE_KINDS = ["call", "io", "variable", "source", "expr", "unittest"] as const satisfies readonly TestCaseKind[]
export const ALL_KINDS = [...CREATABLE_KINDS, "legacy"] as const satisfies readonly TestCaseKind[]

export const PY_TYPES: readonly PyType[] = pyTypeSchema.options

/** Sugestões para o tipo do valor de uma expressão (o campo aceita qualquer nome de classe). */
export const EXPR_TYPE_SUGGESTIONS = [
  ...PY_TYPES, "frozenset", "generator", "function", "property", "type", "range", "bytes", "complex",
] as const

export const EXPR_CHECK_LABELS: Record<ExprCheck, string> = {
  value: "O valor (e/ou o tipo) da expressão",
  raises: "Uma exceção levantada",
}
export const EXPR_CHECKS = ["value", "raises"] as const satisfies readonly ExprCheck[]

export const SUITE_TARGET_LABELS: Record<SuiteTarget, string> = {
  teacher: "Uma implementação escrita por você (correta ou com defeito)",
  student: "A implementação do próprio aluno",
}
export const SUITE_TARGETS = ["teacher", "student"] as const satisfies readonly SuiteTarget[]

export const SUITE_EXPECTATION_LABELS: Record<SuiteExpectation, string> = {
  pass: "Os testes do aluno devem passar",
  fail: "Os testes do aluno devem reprovar (detectar o defeito)",
}

export const MATCH_LABELS: Record<OutputMatchMode, string> = {
  trimmed: "Igual (ignora espaços nas pontas e no fim das linhas)",
  exact: "Exatamente igual",
  contains: "Contém o texto",
  regex: "Expressão regular",
}

/** Ordem do seletor: o modo mais tolerante (e padrão) primeiro. */
export const MATCH_MODES = ["trimmed", "exact", "contains", "regex"] as const satisfies readonly OutputMatchMode[]

export function isMatchMode(value: string): value is OutputMatchMode {
  return isOneOf(OUTPUT_MATCH_MODES, value)
}

export const RULE_LABELS: Record<SourceRuleType, string> = {
  uses: "Deve usar",
  not_uses: "Não pode usar",
  calls: "Deve chamar a função",
  not_calls: "Não pode chamar a função",
  defines_function: "Deve definir a função",
  defines_class: "Deve definir a classe",
  imports: "Deve importar o módulo",
  decorator: "Deve usar o decorator",
  catches: "Deve capturar a exceção (except)",
}

export const RULE_TYPES = [
  "uses", "not_uses", "calls", "not_calls", "defines_function", "defines_class", "imports", "decorator", "catches",
] as const satisfies readonly SourceRuleType[]

/** Rótulo e exemplo do campo de valor de cada regra (as de construção usam um seletor). */
export const RULE_VALUE_FIELDS: Record<SourceRuleType, { label: string; placeholder: string }> = {
  uses: { label: "Construção", placeholder: "for" },
  not_uses: { label: "Construção", placeholder: "for" },
  calls: { label: "Função", placeholder: "sorted" },
  not_calls: { label: "Função", placeholder: "max" },
  defines_function: { label: "Função", placeholder: "calcular_media" },
  defines_class: { label: "Classe", placeholder: "Conta" },
  imports: { label: "Módulo", placeholder: "math" },
  decorator: { label: "Decorator (sem @)", placeholder: "property" },
  catches: { label: "Exceção", placeholder: "ValueError" },
}

export const USES_CONSTRUCTS = [
  "for", "while", "if", "def", "class", "lambda", "list_comprehension", "dict_comprehension",
  "f_string", "try", "with", "return", "import", "recursion", "yield",
] as const
export const NOT_USES_CONSTRUCTS = ["for", "while", "import", "list_comprehension"] as const

export const CONSTRUCT_LABELS: Record<string, string> = {
  lambda: "função lambda",
  for: "laço for",
  while: "laço while",
  if: "if",
  def: "função (def)",
  class: "classe",
  list_comprehension: "list comprehension",
  dict_comprehension: "dict comprehension",
  f_string: "f-string",
  try: "try/except",
  with: "bloco with",
  return: "return",
  import: "import",
  recursion: "recursão",
  yield: "yield (generator)",
}

/** Regras que escolhem uma construção da linguagem (as demais recebem um nome livre). */
export function isConstructRule(ruleType: SourceRuleType): ruleType is "uses" | "not_uses" {
  return ruleType === "uses" || ruleType === "not_uses"
}

/** Construções aceitas por uma regra `uses`/`not_uses`. */
export function constructsFor(ruleType: "uses" | "not_uses"): readonly string[] {
  return ruleType === "not_uses" ? NOT_USES_CONSTRUCTS : USES_CONSTRUCTS
}

let draftKeySequence = 0
function newDraftKey(): string {
  draftKeySequence += 1
  return `tc-${Date.now().toString(36)}-${draftKeySequence}`
}

/** Próximo id livre no formato `caso-N`. */
export function nextCaseId(drafts: Pick<TestCaseDraft, "id">[]): string {
  const takenIds = new Set(drafts.map((draft) => draft.id))
  for (let number = drafts.length + 1; ; number++) {
    const id = `caso-${number}`
    if (!takenIds.has(id)) return id
  }
}

export function emptyDraft(kind: TestCaseKind, id: string): TestCaseDraft {
  return {
    key: newDraftKey(),
    kind,
    id,
    name: "",
    hint: "",
    reveal: false,
    fn: "",
    args: "[]",
    kwargs: "{}",
    expected: "",
    pyType: "",
    tolerance: "",
    stdin: "",
    expectedStdout: "",
    match: "trimmed",
    variable: "",
    ruleType: "uses",
    ruleValue: "for",
    ruleFunction: "",
    setup: "",
    expression: "",
    exprCheck: "value",
    typeName: "",
    raises: "",
    messageContains: "",
    suiteTarget: "teacher",
    target: "",
    implementation: "",
    suiteExpect: "pass",
    testClass: "",
    minTests: "",
    code: "",
  }
}

const toJsonText = (value: unknown): string => JSON.stringify(value)
const optionalText = (value: string | undefined): string => value ?? ""
const optionalNumberText = (value: number | undefined): string => (value === undefined ? "" : String(value))

function ruleValueOf(rule: SourceRule): string {
  if ("construct" in rule) return rule.construct
  if ("module" in rule) return rule.module
  if ("exception" in rule) return rule.exception
  return rule.name
}

/** Campos específicos de cada tipo, lidos de um caso salvo. */
const DRAFT_READERS: { [Kind in TestCaseKind]: (testCase: Extract<TestCase, { kind: Kind }>) => Partial<TestCaseDraft> } = {
  call: (testCase) => ({
    fn: testCase.function,
    args: toJsonText(testCase.args),
    kwargs: toJsonText(testCase.kwargs),
    expected: toJsonText(testCase.expected),
    pyType: testCase.type ?? "",
    tolerance: optionalNumberText(testCase.tolerance),
  }),
  io: (testCase) => ({ stdin: testCase.stdin, expectedStdout: testCase.expected_stdout, match: testCase.match }),
  variable: (testCase) => ({
    variable: testCase.variable,
    expected: toJsonText(testCase.expected),
    pyType: testCase.type ?? "",
    tolerance: optionalNumberText(testCase.tolerance),
  }),
  source: (testCase) => ({
    ruleType: testCase.rule.type,
    ruleValue: ruleValueOf(testCase.rule),
    ruleFunction: "function" in testCase.rule ? optionalText(testCase.rule.function) : "",
  }),
  expr: (testCase) => ({
    setup: testCase.setup,
    expression: testCase.expr,
    stdin: testCase.stdin,
    exprCheck: testCase.raises === undefined ? "value" : "raises",
    expected: testCase.expected === undefined ? "" : toJsonText(testCase.expected),
    typeName: optionalText(testCase.type),
    tolerance: optionalNumberText(testCase.tolerance),
    raises: optionalText(testCase.raises),
    messageContains: optionalText(testCase.message_contains),
    expectedStdout: optionalText(testCase.expected_stdout),
    match: testCase.match,
  }),
  unittest: (testCase) => ({
    suiteTarget: testCase.implementation === undefined ? "student" : "teacher",
    target: optionalText(testCase.target),
    implementation: optionalText(testCase.implementation),
    suiteExpect: testCase.expect,
    testClass: optionalText(testCase.test_class),
    minTests: optionalNumberText(testCase.min_tests),
  }),
  legacy: (testCase) => ({ code: testCase.code }),
}

function readDraftFields<Kind extends TestCaseKind>(kind: Kind, testCase: Extract<TestCase, { kind: Kind }>): Partial<TestCaseDraft> {
  return DRAFT_READERS[kind](testCase)
}

/** Converte um caso salvo (vindo da API) em rascunho editável. */
export function draftFromCase(testCase: TestCase): TestCaseDraft {
  const draft = emptyDraft(testCase.kind, testCase.id)
  return {
    ...draft,
    name: testCase.name ?? "",
    hint: testCase.hint ?? "",
    reveal: testCase.reveal ?? false,
    ...readDraftFields(testCase.kind, testCase),
  }
}

export function draftsFromCases(cases: TestCase[] | null | undefined): TestCaseDraft[] {
  return (cases ?? []).map(draftFromCase)
}

/** Troca o tipo do caso mantendo id/nome/dica e os campos já preenchidos. */
export function changeDraftKind(draft: TestCaseDraft, kind: TestCaseKind): TestCaseDraft {
  if (draft.kind === kind) return draft
  const next = { ...draft, kind }
  // Valor coerente com o tipo de regra atual.
  if (kind === "source" && isConstructRule(next.ruleType)) {
    const constructs = constructsFor(next.ruleType)
    if (!constructs.includes(next.ruleValue)) next.ruleValue = constructs[0] ?? "for"
  }
  return next
}

/** Troca o tipo de regra de AST ajustando o valor padrão. */
export function changeRuleType(draft: TestCaseDraft, ruleType: SourceRuleType): TestCaseDraft {
  let ruleValue = draft.ruleValue
  if (isConstructRule(ruleType)) {
    if (!constructsFor(ruleType).includes(ruleValue)) ruleValue = "for"
  } else if (isConstructRule(draft.ruleType)) {
    ruleValue = ""
  }
  return { ...draft, ruleType, ruleValue }
}

const PYTHON_LITERAL_HINT = /\b(True|False|None)\b|'/

type JsonParse = { ok: true; value: Json } | { ok: false; error: string }

interface JsonFieldOptions {
  required?: boolean
  expect?: "array" | "object"
}

function emptyJsonValue(expect: JsonFieldOptions["expect"]): Json {
  if (expect === "array") return []
  if (expect === "object") return {}
  return null
}

/** Lê um valor JSON digitado pelo professor, com mensagem amigável em pt-BR. */
export function parseJsonField(text: string, { required, expect }: JsonFieldOptions = {}): JsonParse {
  const trimmed = text.trim()
  if (!trimmed) {
    if (required) return { ok: false, error: "Informe um valor em JSON (ex.: 5, \"texto\", [1, 2], true, null)." }
    return { ok: true, value: emptyJsonValue(expect) }
  }
  let raw: unknown
  try {
    raw = JSON.parse(trimmed)
  } catch {
    const tip = PYTHON_LITERAL_HINT.test(trimmed) ? " Dica: em JSON use true/false/null (minúsculos) e aspas duplas em textos." : ""
    return { ok: false, error: `JSON inválido.${tip}` }
  }
  const checked = jsonSchema.safeParse(raw)
  if (!checked.success) return { ok: false, error: "Valor não suportado: use apenas números, textos, listas, objetos, true/false ou null." }
  const value = checked.data
  if (expect === "array" && !Array.isArray(value)) {
    return { ok: false, error: "Os argumentos devem ser uma lista JSON, ex.: [2, 3] ou [\"ana\"]." }
  }
  if (expect === "object" && (value === null || typeof value !== "object" || Array.isArray(value))) {
    return { ok: false, error: "Os argumentos nomeados devem ser um objeto JSON, ex.: {\"base\": 2}." }
  }
  return { ok: true, value }
}

/** Campo do formulário de cada chave do contrato (quando o nome difere). */
const FIELD_BY_CONTRACT_KEY: Partial<Record<string, DraftField>> = {
  function: "fn",
  expected_stdout: "expectedStdout",
  expr: "expression",
  message_contains: "messageContains",
  test_class: "testClass",
  min_tests: "minTests",
  expect: "suiteExpect",
}

const SAME_NAME_FIELDS: readonly DraftField[] = [
  "id", "name", "hint", "args", "kwargs", "expected", "tolerance", "stdin", "match", "variable", "code", "setup",
  "raises", "target", "implementation",
]

/** Mapeia o caminho de um erro do Zod para o campo do formulário. */
function fieldForIssue(kind: TestCaseKind, path: readonly PropertyKey[]): DraftField {
  const [head, sub] = path
  if (typeof head !== "string") return "id"
  if (head === "type") return kind === "expr" ? "typeName" : "pyType"
  if (head === "rule") return sub === "type" ? "ruleType" : sub === "function" ? "ruleFunction" : "ruleValue"
  const renamed = FIELD_BY_CONTRACT_KEY[head]
  if (renamed) return renamed
  return isOneOf(SAME_NAME_FIELDS, head) ? head : "id"
}

const IDENTIFIER_MESSAGE = "Use um nome Python válido (letras, números e _; sem começar por número)."

const FRIENDLY_MESSAGES: DraftErrors = {
  fn: `${IDENTIFIER_MESSAGE} Para métodos, use ponto: Classe.metodo.`,
  variable: IDENTIFIER_MESSAGE,
  target: IDENTIFIER_MESSAGE,
  testClass: IDENTIFIER_MESSAGE,
  ruleFunction: IDENTIFIER_MESSAGE,
  id: "Identificador obrigatório (até 64 caracteres).",
  code: "Escreva o código do teste.",
  expectedStdout: "Informe a saída esperada.",
  ruleValue: "Preencha o nome usado pela regra.",
  tolerance: "A tolerância deve estar entre 0 e 1.",
  expression: "Escreva a expressão a avaliar (ex.: conta.saldo).",
  typeName: "Use um nome de tipo ou classe (ex.: int, generator, Tarefa).",
  raises: "Informe a exceção esperada (ex.: ValueError ou NomeCurtoError).",
  implementation: "Escreva o código que define a função ou classe substituída.",
  minTests: "Informe um número inteiro entre 1 e 100.",
}

function friendlyIssue(field: DraftField, fallback: string): string {
  return FRIENDLY_MESSAGES[field] ?? fallback
}

/** Monta a regra de AST no formato do contrato (o nome do campo depende do tipo). */
function buildSourceRule(ruleType: SourceRuleType, value: string, functionName: string): Record<string, string> {
  if (isConstructRule(ruleType)) {
    return functionName ? { type: ruleType, construct: value, function: functionName } : { type: ruleType, construct: value }
  }
  if (ruleType === "imports") return { type: ruleType, module: value }
  if (ruleType === "catches") return { type: ruleType, exception: value }
  return { type: ruleType, name: value }
}

/** Coleta os campos do caso a partir do rascunho, registrando erros de leitura (JSON, números). */
class CandidateBuilder {
  readonly errors: DraftErrors = {}
  readonly candidate: Record<string, unknown>

  constructor(private readonly draft: TestCaseDraft) {
    this.candidate = { id: draft.id.trim(), kind: draft.kind }
    if (draft.name.trim()) this.candidate.name = draft.name.trim()
    if (draft.hint.trim()) this.candidate.hint = draft.hint.trim()
    if (draft.reveal) this.candidate.reveal = true
  }

  setJson(field: "args" | "kwargs" | "expected", options: JsonFieldOptions): void {
    const parsed = parseJsonField(this.draft[field], options)
    if (parsed.ok) this.candidate[field] = parsed.value
    else this.errors[field] = parsed.error
  }

  setTolerance(): void {
    if (!this.draft.tolerance.trim()) return
    const tolerance = Number(this.draft.tolerance.replace(",", "."))
    if (Number.isFinite(tolerance)) this.candidate.tolerance = tolerance
    else this.errors.tolerance = "Tolerância deve ser um número (ex.: 0.001)."
  }

  setInteger(key: string, field: DraftField, text: string): void {
    if (!text.trim()) return
    const value = Number(text.trim())
    if (Number.isInteger(value)) this.candidate[key] = value
    else this.errors[field] = "Informe um número inteiro."
  }

  /** Texto opcional: só entra no caso se o professor preencheu. */
  setOptionalText(key: string, text: string): void {
    if (text.trim()) this.candidate[key] = text.trim()
  }

  checkRegex(field: "expectedStdout", pattern: string): void {
    if (this.draft.match !== "regex" || !pattern) return
    try {
      new RegExp(pattern, "m")
    } catch {
      this.errors[field] = "Expressão regular inválida."
    }
  }
}

const CANDIDATE_FILLERS: Record<TestCaseKind, (builder: CandidateBuilder, draft: TestCaseDraft) => void> = {
  call: (builder, draft) => {
    builder.candidate.function = draft.fn.trim()
    builder.setJson("args", { expect: "array" })
    builder.setJson("kwargs", { expect: "object" })
    builder.setJson("expected", { required: true })
    if (draft.pyType) builder.candidate.type = draft.pyType
    builder.setTolerance()
  },
  io: (builder, draft) => {
    builder.candidate.stdin = draft.stdin
    builder.candidate.expected_stdout = draft.expectedStdout
    builder.candidate.match = draft.match
    if (!draft.expectedStdout.length) builder.errors.expectedStdout = "Informe a saída esperada."
    builder.checkRegex("expectedStdout", draft.expectedStdout)
  },
  variable: (builder, draft) => {
    builder.candidate.variable = draft.variable.trim()
    builder.setJson("expected", { required: true })
    if (draft.pyType) builder.candidate.type = draft.pyType
    builder.setTolerance()
  },
  source: (builder, draft) => {
    builder.candidate.rule = buildSourceRule(draft.ruleType, draft.ruleValue.trim(), draft.ruleFunction.trim())
  },
  expr: fillExprCandidate,
  unittest: (builder, draft) => {
    builder.candidate.expect = draft.suiteExpect
    builder.setOptionalText("test_class", draft.testClass)
    builder.setInteger("min_tests", "minTests", draft.minTests)
    if (draft.suiteTarget === "student") return
    builder.candidate.target = draft.target.trim()
    builder.candidate.implementation = draft.implementation
    if (!draft.implementation.trim()) builder.errors.implementation = FRIENDLY_MESSAGES.implementation
  },
  legacy: (builder, draft) => {
    builder.candidate.code = draft.code
  },
}

function fillExprCandidate(builder: CandidateBuilder, draft: TestCaseDraft): void {
  builder.candidate.expr = draft.expression
  builder.candidate.setup = draft.setup
  builder.candidate.stdin = draft.stdin
  builder.candidate.match = draft.match
  if (draft.expectedStdout) builder.candidate.expected_stdout = draft.expectedStdout
  builder.checkRegex("expectedStdout", draft.expectedStdout)
  if (draft.exprCheck === "raises") {
    builder.candidate.raises = draft.raises.trim()
    if (!draft.raises.trim()) builder.errors.raises = FRIENDLY_MESSAGES.raises
    builder.setOptionalText("message_contains", draft.messageContains)
    return
  }
  if (draft.expected.trim()) builder.setJson("expected", { required: true })
  builder.setOptionalText("type", draft.typeName)
  builder.setTolerance()
}

/** Converte e valida um rascunho; devolve o caso pronto ou os erros por campo. */
export function compileDraft(draft: TestCaseDraft): CompiledDraft {
  const builder = new CandidateBuilder(draft)
  CANDIDATE_FILLERS[draft.kind](builder, draft)
  const { errors, candidate } = builder
  if (Object.keys(errors).length) return { testCase: null, errors }

  // Validado por `testCaseSchema` (fonte única das regras, a mesma da API).
  const parsed = testCaseSchema.safeParse(candidate)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldForIssue(draft.kind, issue.path)
      errors[field] ??= friendlyIssue(field, issue.message)
    }
    return { testCase: null, errors }
  }
  return { testCase: parsed.data, errors: {} }
}

/** Valida a lista inteira (inclui ids duplicados). */
export function compileDrafts(drafts: TestCaseDraft[]): CompiledDrafts {
  const errors: Record<string, DraftErrors> = {}
  const cases: TestCase[] = []
  const idCounts = new Map<string, number>()
  for (const draft of drafts) idCounts.set(draft.id.trim(), (idCounts.get(draft.id.trim()) ?? 0) + 1)

  for (const draft of drafts) {
    const { testCase, errors: draftErrors } = compileDraft(draft)
    const id = draft.id.trim()
    if (!draftErrors.id && id && (idCounts.get(id) ?? 0) > 1) draftErrors.id = `Identificador repetido: ${id}`
    if (Object.keys(draftErrors).length) errors[draft.key] = draftErrors
    else if (testCase) cases.push(testCase)
  }
  const lastDraft = drafts.at(-1)
  if (drafts.length > MAX_CASES_PER_LESSON && lastDraft) {
    errors[lastDraft.key] = { ...errors[lastDraft.key], id: "Limite de 100 casos por lição." }
  }
  const errorCount = Object.values(errors).reduce((total, draftErrors) => total + Object.keys(draftErrors).length, 0)
  return { cases, errors, valid: errorCount === 0, errorCount }
}
