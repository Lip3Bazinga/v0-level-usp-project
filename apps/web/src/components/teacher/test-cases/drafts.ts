import {
  jsonSchema,
  testCaseSchema,
  type Json,
  type PyType,
  type SourceRule,
  type TestCase,
} from "@levelusp/contracts"

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
  kind: TestCase["kind"]
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
  match: "exact" | "trimmed" | "contains" | "regex"
  // variable
  variable: string
  // source
  ruleType: SourceRule["type"]
  ruleValue: string
  // legacy
  code: string
}

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

export const KIND_LABELS: Record<TestCase["kind"], string> = {
  call: "Chamar função",
  io: "Entrada e saída",
  variable: "Valor de variável",
  source: "Estrutura do código",
  legacy: "Teste legado (assert/unittest)",
}

export const KIND_DESCRIPTIONS: Record<TestCase["kind"], string> = {
  call: "Chama uma função do aluno com argumentos e compara o valor retornado.",
  io: "Roda o main.py com uma entrada (stdin) e compara o que foi impresso.",
  variable: "Roda o main.py e confere o valor final de uma variável global.",
  source: "Analisa o código (sem executar) para exigir ou proibir uma construção.",
  legacy: "Código assert/unittest antigo, executado junto com o código do aluno.",
}

/** Tipos oferecidos ao criar um caso novo (legado só aparece em lições importadas). */
export const CREATABLE_KINDS = ["call", "io", "variable", "source"] as const

export const PY_TYPES: PyType[] = ["int", "float", "str", "bool", "list", "tuple", "dict", "set", "NoneType"]

export const MATCH_LABELS: Record<TestCaseDraft["match"], string> = {
  trimmed: "Igual (ignora espaços nas pontas e no fim das linhas)",
  exact: "Exatamente igual",
  contains: "Contém o texto",
  regex: "Expressão regular",
}

export const RULE_LABELS: Record<SourceRule["type"], string> = {
  uses: "Deve usar",
  not_uses: "Não pode usar",
  calls: "Deve chamar a função",
  not_calls: "Não pode chamar a função",
  defines_function: "Deve definir a função",
  defines_class: "Deve definir a classe",
  imports: "Deve importar o módulo",
}

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

let keySeq = 0
function newKey(): string {
  keySeq += 1
  return `tc-${Date.now().toString(36)}-${keySeq}`
}

/** Próximo id livre no formato `caso-N`. */
export function nextCaseId(drafts: Pick<TestCaseDraft, "id">[]): string {
  const taken = new Set(drafts.map((d) => d.id))
  for (let n = drafts.length + 1; ; n++) {
    const id = `caso-${n}`
    if (!taken.has(id)) return id
  }
}

export function emptyDraft(kind: TestCase["kind"], id: string): TestCaseDraft {
  return {
    key: newKey(),
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

const pretty = (v: unknown) => JSON.stringify(v)

/** Converte um caso salvo (vindo da API) em rascunho editável. */
export function draftFromCase(c: TestCase): TestCaseDraft {
  const d = emptyDraft(c.kind, c.id)
  d.name = c.name ?? ""
  d.hint = c.hint ?? ""
  d.reveal = c.reveal ?? false
  switch (c.kind) {
    case "call":
      d.fn = c.function
      d.args = pretty(c.args ?? [])
      d.kwargs = pretty(c.kwargs ?? {})
      d.expected = pretty(c.expected)
      d.pyType = c.type ?? ""
      d.tolerance = c.tolerance === undefined ? "" : String(c.tolerance)
      break
    case "io":
      d.stdin = c.stdin ?? ""
      d.expectedStdout = c.expected_stdout
      d.match = c.match ?? "trimmed"
      break
    case "variable":
      d.variable = c.variable
      d.expected = pretty(c.expected)
      d.pyType = c.type ?? ""
      d.tolerance = c.tolerance === undefined ? "" : String(c.tolerance)
      break
    case "source":
      d.ruleType = c.rule.type
      d.ruleValue = "construct" in c.rule ? c.rule.construct : "module" in c.rule ? c.rule.module : c.rule.name
      break
    case "legacy":
      d.code = c.code
      break
  }
  return d
}

export function draftsFromCases(cases: TestCase[] | null | undefined): TestCaseDraft[] {
  return (cases ?? []).map(draftFromCase)
}

/** Troca o tipo do caso mantendo id/nome/dica e os campos já preenchidos. */
export function changeDraftKind(d: TestCaseDraft, kind: TestCase["kind"]): TestCaseDraft {
  if (d.kind === kind) return d
  const next = { ...d, kind }
  if (kind === "source") {
    // valor coerente com o tipo de regra atual
    const constructs: readonly string[] = next.ruleType === "not_uses" ? NOT_USES_CONSTRUCTS : USES_CONSTRUCTS
    if ((next.ruleType === "uses" || next.ruleType === "not_uses") && !constructs.includes(next.ruleValue)) {
      next.ruleValue = constructs[0]!
    }
  }
  return next
}

/** Troca o tipo de regra de AST ajustando o valor padrão. */
export function changeRuleType(d: TestCaseDraft, ruleType: SourceRule["type"]): TestCaseDraft {
  let ruleValue = d.ruleValue
  if (ruleType === "uses" && !(USES_CONSTRUCTS as readonly string[]).includes(ruleValue)) ruleValue = "for"
  else if (ruleType === "not_uses" && !(NOT_USES_CONSTRUCTS as readonly string[]).includes(ruleValue)) ruleValue = "for"
  else if ((ruleType !== "uses" && ruleType !== "not_uses") && (d.ruleType === "uses" || d.ruleType === "not_uses")) ruleValue = ""
  return { ...d, ruleType, ruleValue }
}

// ── Validação ────────────────────────────────────────────────────────────────

const PYTHON_LITERAL_HINT = /\b(True|False|None)\b|'/

type JsonParse = { ok: true; value: Json } | { ok: false; error: string }

/** Lê um valor JSON digitado pelo professor, com mensagem amigável em pt-BR. */
export function parseJsonField(text: string, opts: { required?: boolean; expect?: "array" | "object" } = {}): JsonParse {
  const trimmed = text.trim()
  if (!trimmed) {
    if (opts.required) return { ok: false, error: "Informe um valor em JSON (ex.: 5, \"texto\", [1, 2], true, null)." }
    return { ok: true, value: opts.expect === "array" ? [] : opts.expect === "object" ? {} : null }
  }
  let raw: unknown
  try {
    raw = JSON.parse(trimmed)
  } catch {
    const tip = PYTHON_LITERAL_HINT.test(trimmed)
      ? " Dica: em JSON use true/false/null (minúsculos) e aspas duplas em textos."
      : ""
    return { ok: false, error: `JSON inválido.${tip}` }
  }
  const checked = jsonSchema.safeParse(raw)
  if (!checked.success) return { ok: false, error: "Valor não suportado: use apenas números, textos, listas, objetos, true/false ou null." }
  const value = checked.data
  if (opts.expect === "array" && !Array.isArray(value)) {
    return { ok: false, error: "Os argumentos devem ser uma lista JSON, ex.: [2, 3] ou [\"ana\"]." }
  }
  if (opts.expect === "object" && (value === null || typeof value !== "object" || Array.isArray(value))) {
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

const IDENT_MSG = "Use um nome Python válido (letras, números e _; sem começar por número)."

function friendlyIssue(field: DraftField, fallback: string): string {
  switch (field) {
    case "fn": return `${IDENT_MSG} Para métodos, use ponto: Classe.metodo.`
    case "variable": return IDENT_MSG
    case "id": return "Identificador obrigatório (até 64 caracteres)."
    case "code": return "Escreva o código do teste."
    case "expectedStdout": return "Informe a saída esperada."
    case "ruleValue": return "Preencha o nome usado pela regra."
    case "tolerance": return "A tolerância deve estar entre 0 e 1."
    default: return fallback
  }
}

/** Converte e valida um rascunho; devolve o caso pronto ou os erros por campo. */
export function compileDraft(d: TestCaseDraft): CompiledDraft {
  const errors: DraftErrors = {}
  const base: Record<string, unknown> = { id: d.id.trim(), kind: d.kind }
  if (d.name.trim()) base.name = d.name.trim()
  if (d.hint.trim()) base.hint = d.hint.trim()
  if (d.reveal) base.reveal = true

  const json = (field: "args" | "kwargs" | "expected", opts: Parameters<typeof parseJsonField>[1]) => {
    const r = parseJsonField(d[field], opts)
    if (!r.ok) errors[field] = r.error
    return r.ok ? r.value : undefined
  }
  const tolerance = () => {
    if (!d.tolerance.trim()) return undefined
    const n = Number(d.tolerance.replace(",", "."))
    if (!Number.isFinite(n)) {
      errors.tolerance = "Tolerância deve ser um número (ex.: 0.001)."
      return undefined
    }
    return n
  }

  switch (d.kind) {
    case "call": {
      base.function = d.fn.trim()
      base.args = json("args", { expect: "array" })
      base.kwargs = json("kwargs", { expect: "object" })
      base.expected = json("expected", { required: true })
      if (d.pyType) base.type = d.pyType
      base.tolerance = tolerance()
      break
    }
    case "io":
      base.stdin = d.stdin
      base.expected_stdout = d.expectedStdout
      base.match = d.match
      if (!d.expectedStdout.length) errors.expectedStdout = "Informe a saída esperada."
      if (d.match === "regex" && d.expectedStdout) {
        try {
          new RegExp(d.expectedStdout, "m")
        } catch {
          errors.expectedStdout = "Expressão regular inválida."
        }
      }
      break
    case "variable":
      base.variable = d.variable.trim()
      base.expected = json("expected", { required: true })
      if (d.pyType) base.type = d.pyType
      base.tolerance = tolerance()
      break
    case "source": {
      const v = d.ruleValue.trim()
      const rule: Record<string, string> = { type: d.ruleType }
      if (d.ruleType === "uses" || d.ruleType === "not_uses") rule.construct = v
      else if (d.ruleType === "imports") rule.module = v
      else rule.name = v
      base.rule = rule
      break
    }
    case "legacy":
      base.code = d.code
      break
  }

  if (base.tolerance === undefined) delete base.tolerance
  if (Object.keys(errors).length) return { testCase: null, errors }

  const parsed = testCaseSchema.safeParse(base)
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
  const seen = new Map<string, number>()
  for (const d of drafts) seen.set(d.id.trim(), (seen.get(d.id.trim()) ?? 0) + 1)

  for (const d of drafts) {
    const { testCase, errors: e } = compileDraft(d)
    if (!e.id && d.id.trim() && (seen.get(d.id.trim()) ?? 0) > 1) e.id = `Identificador repetido: ${d.id.trim()}`
    if (Object.keys(e).length) errors[d.key] = e
    else if (testCase) cases.push(testCase)
  }
  if (drafts.length > 100) {
    const last = drafts[drafts.length - 1]!
    errors[last.key] = { ...errors[last.key], id: "Limite de 100 casos por lição." }
  }
  const errorCount = Object.values(errors).reduce((n, e) => n + Object.keys(e).length, 0)
  return { cases, errors, valid: errorCount === 0, errorCount }
}
