import {
  OUTPUT_MATCH_MODES,
  jsonSchema,
  pyTypeSchema,
  testCaseSchema,
  type Json,
  type OutputMatchMode,
  type PyType,
  type SourceRule,
  type TestCase,
} from "@levelusp/contracts"
import { isNonEmpty, isOneOf, lastOf } from "@/lib/utils"

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
  // call + variable
  expected: string
  pyType: PyType | ""
  tolerance: string
  // io
  stdin: string
  expectedStdout: string
  match: OutputMatchMode
  // variable
  variable: string
  // source
  ruleType: SourceRuleType
  ruleValue: string
  // legacy
  code: string
}

export type TestCaseKind = TestCase["kind"]
export type SourceRuleType = SourceRule["type"]
export type DraftField = Exclude<keyof TestCaseDraft, "key">
export type DraftErrors = Partial<Record<DraftField, string>>

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
  legacy: "Teste legado (assert/unittest)",
}

export const KIND_DESCRIPTIONS: Record<TestCaseKind, string> = {
  call: "Chama uma função do aluno com argumentos e compara o valor retornado.",
  io: "Roda o main.py com uma entrada (stdin) e compara o que foi impresso.",
  variable: "Roda o main.py e confere o valor final de uma variável global.",
  source: "Analisa o código (sem executar) para exigir ou proibir uma construção.",
  legacy: "Código assert/unittest antigo, executado junto com o código do aluno.",
}

/** Tipos oferecidos ao criar um caso novo (legado só aparece em lições importadas). */
export const CREATABLE_KINDS = ["call", "io", "variable", "source"] as const satisfies readonly TestCaseKind[]
export const ALL_KINDS = [...CREATABLE_KINDS, "legacy"] as const satisfies readonly TestCaseKind[]

export const PY_TYPES: readonly PyType[] = pyTypeSchema.options

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
}

export const RULE_TYPES = [
  "uses", "not_uses", "calls", "not_calls", "defines_function", "defines_class", "imports",
] as const satisfies readonly SourceRuleType[]

export const USES_CONSTRUCTS = [
  "for", "while", "if", "def", "class", "lambda", "list_comprehension", "dict_comprehension",
  "f_string", "try", "with", "return", "import", "recursion",
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
    code: "",
  }
}

const toJsonText = (value: unknown): string => JSON.stringify(value)

function ruleValueOf(rule: SourceRule): string {
  if ("construct" in rule) return rule.construct
  if ("module" in rule) return rule.module
  return rule.name
}

/** Converte um caso salvo (vindo da API) em rascunho editável. */
export function draftFromCase(testCase: TestCase): TestCaseDraft {
  const draft = emptyDraft(testCase.kind, testCase.id)
  draft.name = testCase.name ?? ""
  draft.hint = testCase.hint ?? ""
  draft.reveal = testCase.reveal ?? false
  switch (testCase.kind) {
    case "call":
      draft.fn = testCase.function
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- casos do seed/importação são gravados sem passar pelo schema (campos com default podem faltar)
      draft.args = toJsonText(testCase.args ?? [])
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- casos do seed/importação são gravados sem passar pelo schema (campos com default podem faltar)
      draft.kwargs = toJsonText(testCase.kwargs ?? {})
      draft.expected = toJsonText(testCase.expected)
      draft.pyType = testCase.type ?? ""
      draft.tolerance = testCase.tolerance === undefined ? "" : String(testCase.tolerance)
      break
    case "io":
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- casos do seed/importação são gravados sem passar pelo schema (campos com default podem faltar)
      draft.stdin = testCase.stdin ?? ""
      draft.expectedStdout = testCase.expected_stdout
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- casos do seed/importação são gravados sem passar pelo schema (campos com default podem faltar)
      draft.match = testCase.match ?? "trimmed"
      break
    case "variable":
      draft.variable = testCase.variable
      draft.expected = toJsonText(testCase.expected)
      draft.pyType = testCase.type ?? ""
      draft.tolerance = testCase.tolerance === undefined ? "" : String(testCase.tolerance)
      break
    case "source":
      draft.ruleType = testCase.rule.type
      draft.ruleValue = ruleValueOf(testCase.rule)
      break
    case "legacy":
      draft.code = testCase.code
      break
  }
  return draft
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
    const [firstConstruct] = constructs
    if (firstConstruct !== undefined && !constructs.includes(next.ruleValue)) next.ruleValue = firstConstruct
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

/** Mapeia o caminho de um erro do Zod para o campo do formulário. */
function fieldForIssue(path: PropertyKey[]): DraftField {
  const [head, sub] = path
  switch (head) {
    case "function": return "fn"
    case "expected_stdout": return "expectedStdout"
    case "type": return "pyType"
    case "rule": return sub === "type" ? "ruleType" : "ruleValue"
    case "id":
    case "name":
    case "hint":
    case "args":
    case "kwargs":
    case "expected":
    case "tolerance":
    case "stdin":
    case "match":
    case "variable":
    case "code":
      return head
    default:
      return "id"
  }
}

const IDENTIFIER_MESSAGE = "Use um nome Python válido (letras, números e _; sem começar por número)."

function friendlyIssue(field: DraftField, fallback: string): string {
  switch (field) {
    case "fn": return `${IDENTIFIER_MESSAGE} Para métodos, use ponto: Classe.metodo.`
    case "variable": return IDENTIFIER_MESSAGE
    case "id": return "Identificador obrigatório (até 64 caracteres)."
    case "code": return "Escreva o código do teste."
    case "expectedStdout": return "Informe a saída esperada."
    case "ruleValue": return "Preencha o nome usado pela regra."
    case "tolerance": return "A tolerância deve estar entre 0 e 1."
    default: return fallback
  }
}

/** Monta a regra de AST no formato do contrato (o nome do campo depende do tipo). */
function buildSourceRule(ruleType: SourceRuleType, value: string): Record<string, string> {
  if (isConstructRule(ruleType)) return { type: ruleType, construct: value }
  if (ruleType === "imports") return { type: ruleType, module: value }
  return { type: ruleType, name: value }
}

/** Converte e valida um rascunho; devolve o caso pronto ou os erros por campo. */
export function compileDraft(draft: TestCaseDraft): CompiledDraft {
  const errors: DraftErrors = {}
  // Montado solto e validado por `testCaseSchema` logo abaixo (fonte única das regras).
  const candidate: Record<string, unknown> = { id: draft.id.trim(), kind: draft.kind }
  if (draft.name.trim()) candidate.name = draft.name.trim()
  if (draft.hint.trim()) candidate.hint = draft.hint.trim()
  if (draft.reveal) candidate.reveal = true

  const readJson = (field: "args" | "kwargs" | "expected", options: JsonFieldOptions): Json | undefined => {
    const parsed = parseJsonField(draft[field], options)
    if (!parsed.ok) errors[field] = parsed.error
    return parsed.ok ? parsed.value : undefined
  }
  const readTolerance = (): number | undefined => {
    if (!draft.tolerance.trim()) return undefined
    const tolerance = Number(draft.tolerance.replace(",", "."))
    if (!Number.isFinite(tolerance)) {
      errors.tolerance = "Tolerância deve ser um número (ex.: 0.001)."
      return undefined
    }
    return tolerance
  }

  switch (draft.kind) {
    case "call":
      candidate.function = draft.fn.trim()
      candidate.args = readJson("args", { expect: "array" })
      candidate.kwargs = readJson("kwargs", { expect: "object" })
      candidate.expected = readJson("expected", { required: true })
      if (draft.pyType) candidate.type = draft.pyType
      candidate.tolerance = readTolerance()
      break
    case "io":
      candidate.stdin = draft.stdin
      candidate.expected_stdout = draft.expectedStdout
      candidate.match = draft.match
      if (!draft.expectedStdout.length) errors.expectedStdout = "Informe a saída esperada."
      if (draft.match === "regex" && draft.expectedStdout) {
        try {
          new RegExp(draft.expectedStdout, "m")
        } catch {
          errors.expectedStdout = "Expressão regular inválida."
        }
      }
      break
    case "variable":
      candidate.variable = draft.variable.trim()
      candidate.expected = readJson("expected", { required: true })
      if (draft.pyType) candidate.type = draft.pyType
      candidate.tolerance = readTolerance()
      break
    case "source":
      candidate.rule = buildSourceRule(draft.ruleType, draft.ruleValue.trim())
      break
    case "legacy":
      candidate.code = draft.code
      break
  }

  if (candidate.tolerance === undefined) delete candidate.tolerance
  if (Object.keys(errors).length) return { testCase: null, errors }

  const parsed = testCaseSchema.safeParse(candidate)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldForIssue(issue.path)
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
  if (drafts.length > MAX_CASES_PER_LESSON && isNonEmpty(drafts)) {
    const lastDraft = lastOf(drafts)
    errors[lastDraft.key] = { ...errors[lastDraft.key], id: "Limite de 100 casos por lição." }
  }
  const errorCount = Object.values(errors).reduce((total, draftErrors) => total + Object.keys(draftErrors).length, 0)
  return { cases, errors, valid: errorCount === 0, errorCount }
}
