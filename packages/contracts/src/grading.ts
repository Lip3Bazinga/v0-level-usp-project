import { z } from "zod"
import type { GrantedBadge } from "./gamification"

/**
 * Formato de correção ("casos declarativos").
 *
 * Princípio de segurança: os valores ESPERADOS ficam só na API. O executor
 * recebe apenas as entradas (sondas) e devolve o que o código do aluno
 * produziu; a comparação acontece fora do sandbox. Assim o aluno não consegue
 * ler o gabarito nem forjar o veredito sem já saber a resposta.
 *
 * Garantia residual (detalhada em docs/v2/motor-de-correcao.md): o código do
 * aluno divide o interpretador com o harness e com a preparação escrita pelo
 * professor, então pode alterar o que é OBSERVADO (trocar builtins, devolver
 * objetos hostis). Para isso virar aprovação, ele precisa produzir exatamente o
 * valor esperado — ou seja, precisa conhecer a resposta, que nunca entra no sandbox.
 */

/** Valor JSON arbitrário (entrada/saída de funções do aluno). */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }
export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonSchema), z.record(z.string(), jsonSchema)]),
)

const baseCase = {
  id: z.string().trim().min(1).max(64),
  /** Nome exibido ao aluno quando o caso falha. */
  name: z.string().trim().max(160).optional(),
  /** Dica mostrada em caso de falha (nunca revela o valor esperado, a menos que o professor escreva). */
  hint: z.string().trim().max(500).optional(),
  /** Se true, a mensagem de falha mostra entrada e valor esperado. Padrão: false. */
  reveal: z.boolean().optional(),
}

const PYTHON_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/
/** Nome qualificado: `funcao` ou `Classe.metodo`. */
const PYTHON_DOTTED_NAME = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/

/** Tipos Python verificáveis (o JSON não distingue int de float, nem list de tuple). */
export const pyTypeSchema = z.enum(["int", "float", "str", "bool", "list", "tuple", "dict", "set", "NoneType"])
/** Tipo Python exigido de um valor, quando o JSON sozinho não basta. */
export type PyType = z.infer<typeof pyTypeSchema>

/**
 * Tipos embutidos do CPython 3.14 (módulos `builtins` e `types`). O executor só
 * informa um destes nomes "puros" quando o tipo observado É o objeto embutido
 * (checagem por identidade); classes do aluno chegam qualificadas pelo módulo
 * (`__main__.Tarefa`). Assim uma classe do aluno chamada `ValueError` nunca se
 * passa pela exceção embutida.
 */
export const PY_BUILTIN_TYPE_NAMES: ReadonlySet<string> = new Set([
  "ArithmeticError", "AssertionError", "AttributeError", "BaseException", "BaseExceptionGroup", "BlockingIOError",
  "BrokenPipeError", "BufferError", "BytesWarning", "ChildProcessError", "ConnectionAbortedError", "ConnectionError",
  "ConnectionRefusedError", "ConnectionResetError", "DeprecationWarning", "EOFError", "EncodingWarning", "Exception",
  "ExceptionGroup", "FileExistsError", "FileNotFoundError", "FloatingPointError", "FutureWarning", "GeneratorExit",
  "ImportError", "ImportWarning", "IndentationError", "IndexError", "InterruptedError", "IsADirectoryError", "KeyError",
  "KeyboardInterrupt", "LookupError", "MemoryError", "ModuleNotFoundError", "NameError", "NotADirectoryError",
  "NotImplementedError", "OSError", "OverflowError", "PendingDeprecationWarning", "PermissionError",
  "ProcessLookupError", "PythonFinalizationError", "RecursionError", "ReferenceError", "ResourceWarning",
  "RuntimeError", "RuntimeWarning", "StopAsyncIteration", "StopIteration", "SyntaxError", "SyntaxWarning",
  "SystemError", "SystemExit", "TabError", "TimeoutError", "TypeError", "UnboundLocalError", "UnicodeDecodeError",
  "UnicodeEncodeError", "UnicodeError", "UnicodeTranslateError", "UnicodeWarning", "UserWarning", "ValueError",
  "Warning", "ZeroDivisionError", "bool", "bytearray", "bytes", "classmethod", "complex", "dict", "enumerate",
  "filter", "float", "frozenset", "int", "list", "map", "memoryview", "object", "property", "range", "reversed",
  "set", "slice", "staticmethod", "str", "super", "tuple", "type", "zip", "NoneType", "NotImplementedType",
  "PyCapsule", "async_generator", "builtin_function_or_method", "cell", "classmethod_descriptor", "code",
  "coroutine", "ellipsis", "frame", "function", "generator", "getset_descriptor", "mappingproxy",
  "member_descriptor", "method", "method-wrapper", "method_descriptor", "module", "traceback",
  "wrapper_descriptor",
])

/** Nome de tipo ou classe: embutido (`int`, `generator`, `ValueError`) ou do aluno (`Tarefa`). */
export const pyTypeNameSchema = z.string().trim().max(120).regex(PYTHON_DOTTED_NAME, "nome de tipo inválido")

/** Chama uma função definida pelo aluno e compara o retorno. */
export const callCaseSchema = z.object({
  ...baseCase,
  kind: z.literal("call"),
  function: z.string().regex(PYTHON_DOTTED_NAME),
  args: z.array(jsonSchema).max(20).default([]),
  kwargs: z.record(z.string(), jsonSchema).default({}),
  expected: jsonSchema,
  /** Tipo Python exigido do retorno (opcional). */
  type: pyTypeSchema.optional(),
  /** Tolerância absoluta para números de ponto flutuante. */
  tolerance: z.number().min(0).max(1).optional(),
})

export const OUTPUT_MATCH_MODES = ["exact", "trimmed", "contains", "regex"] as const
export const outputMatchModeSchema = z.enum(OUTPUT_MATCH_MODES)
/** Como a saída do programa é comparada com a esperada. */
export type OutputMatchMode = z.infer<typeof outputMatchModeSchema>

/** Padrões `regex` são curtos: a validação abaixo e o guarda da API medem o padrão inteiro. */
export const MAX_REGEX_PATTERN_LENGTH = 1_000

/**
 * Heurística (linear) para padrões com backtracking catastrófico: um grupo
 * que contém quantificador e é repetido de novo (`(a+)+`, `(\d+\s*)*`,
 * `(.*,){2,}`). Não pega tudo (ex.: alternativas sobrepostas `(a|a)*`) — a API
 * ainda limita o tempo de cada comparação.
 */
export function isLikelyCatastrophicRegex(pattern: string): boolean {
  const enclosing: boolean[] = []
  let hasQuantifier = false
  let isInClass = false
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index]
    if (char === "\\") {
      index++
    } else if (isInClass) {
      if (char === "]") isInClass = false
    } else if (char === "[") {
      isInClass = true
    } else if (char === "(") {
      enclosing.push(hasQuantifier)
      hasQuantifier = false
    } else if (char === ")") {
      const next = pattern[index + 1]
      if (hasQuantifier && (next === "*" || next === "+" || next === "{")) return true
      hasQuantifier = (enclosing.pop() ?? false) || hasQuantifier
    } else if (char === "*" || char === "+" || char === "{") {
      hasQuantifier = true
    }
  }
  return false
}

/** Problema de um padrão `regex` do professor, ou `null` se ele é aceitável. */
export function describeRegexProblem(pattern: string): string | null {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) return `expressão regular longa demais (máx. ${MAX_REGEX_PATTERN_LENGTH} caracteres)`
  try {
    new RegExp(pattern, "m")
  } catch {
    return "expressão regular inválida"
  }
  if (isLikelyCatastrophicRegex(pattern)) return "quantificador aninhado (ex.: (a+)+) pode travar a correção; reescreva sem repetir um grupo que já se repete"
  return null
}

function checkOutputPattern(match: OutputMatchMode, pattern: string | undefined, ctx: z.RefinementCtx): void {
  if (match !== "regex" || pattern === undefined) return
  const problem = describeRegexProblem(pattern)
  if (problem) ctx.addIssue({ code: "custom", path: ["expected_stdout"], message: problem })
}

/** Executa o programa (main.py) com uma entrada e compara a saída padrão. */
export const ioCaseSchema = z
  .object({
    ...baseCase,
    kind: z.literal("io"),
    stdin: z.string().max(100_000).default(""),
    expected_stdout: z.string().max(100_000),
    match: outputMatchModeSchema.default("trimmed"),
  })
  .superRefine((ioCase, ctx) => checkOutputPattern(ioCase.match, ioCase.expected_stdout, ctx))

/** Lê variáveis globais após executar main.py. */
export const variableCaseSchema = z.object({
  ...baseCase,
  kind: z.literal("variable"),
  variable: z.string().regex(PYTHON_IDENTIFIER),
  expected: jsonSchema,
  type: pyTypeSchema.optional(),
  tolerance: z.number().min(0).max(1).optional(),
})

/** Restringe uma regra de construção ao corpo de uma função (`achatar` deve usar list comprehension). */
const ruleFunctionScope = z.string().regex(PYTHON_IDENTIFIER).max(64).optional()

export const sourceRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("uses"),
    construct: z.enum([
      "lambda", "for", "while", "if", "def", "class", "list_comprehension",
      "dict_comprehension", "f_string", "try", "with", "return", "import", "recursion", "yield",
    ]),
    function: ruleFunctionScope,
  }),
  z.object({
    type: z.literal("not_uses"),
    construct: z.enum(["for", "while", "import", "list_comprehension"]),
    function: ruleFunctionScope,
  }),
  z.object({ type: z.literal("calls"), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal("not_calls"), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal("defines_function"), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal("defines_class"), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal("imports"), module: z.string().min(1).max(64) }),
  /** Usa o decorator pelo nome (`@property`, `@staticmethod`; `@functools.wraps(f)` conta como `wraps`). */
  z.object({ type: z.literal("decorator"), name: z.string().min(1).max(64) }),
  /** Tem um `except` que captura a exceção pelo nome (`except ValueError`, `except (A, B)`). */
  z.object({ type: z.literal("catches"), exception: z.string().min(1).max(64) }),
])
/** Regra estrutural sobre o código do aluno, verificada pela AST. */
export type SourceRule = z.infer<typeof sourceRuleSchema>

/** Verifica a estrutura do código (análise de AST, sem executar). */
export const sourceCaseSchema = z.object({
  ...baseCase,
  kind: z.literal("source"),
  rule: sourceRuleSchema,
})

/**
 * Avalia uma expressão do professor no namespace do aluno, depois de executar
 * o main.py e um código de preparação (`setup`) opcional. O executor devolve o
 * valor serializado (só tipos embutidos) e o tipo — ou a exceção levantada — e
 * a API compara com o esperado. Cobre classes, métodos, properties, dunders,
 * exceções, context managers, generators, decorators, arquivos e pacotes.
 * O código do professor roda no sandbox; o VALOR esperado, não.
 */
export const exprCaseSchema = z
  .object({
    ...baseCase,
    kind: z.literal("expr"),
    /** Comandos Python executados antes da expressão (criam objetos, arquivos...). */
    setup: z.string().max(20_000).default(""),
    /** Uma expressão Python (ex.: `conta.saldo`, `list(pares_ate(8))`). */
    expr: z.string().trim().min(1).max(2_000),
    /** Entrada padrão do main.py e da expressão. */
    stdin: z.string().max(100_000).default(""),
    /** Valor esperado em JSON. Omitido = o valor não é comparado. */
    expected: jsonSchema.optional(),
    /** Tipo exigido do valor: embutido (`int`, `generator`) ou classe (`Tarefa`). */
    type: pyTypeNameSchema.optional(),
    tolerance: z.number().min(0).max(1).optional(),
    /** Exceção que a preparação ou a expressão deve levantar (subclasses valem). */
    raises: pyTypeNameSchema.optional(),
    /** Trecho que a mensagem da exceção deve conter. */
    message_contains: z.string().max(500).optional(),
    /** Saída impressa durante a preparação e a expressão. */
    expected_stdout: z.string().max(100_000).optional(),
    match: outputMatchModeSchema.default("trimmed"),
  })
  .superRefine((exprCase, ctx) => {
    const checksValue = exprCase.expected !== undefined || exprCase.type !== undefined
    if (exprCase.raises !== undefined && checksValue) {
      ctx.addIssue({ code: "custom", path: ["raises"], message: "use valor/tipo esperado OU exceção esperada, não os dois" })
    }
    if (exprCase.message_contains !== undefined && exprCase.raises === undefined) {
      ctx.addIssue({ code: "custom", path: ["message_contains"], message: "a mensagem só é verificada quando há exceção esperada" })
    }
    if (exprCase.tolerance !== undefined && exprCase.expected === undefined) {
      ctx.addIssue({ code: "custom", path: ["tolerance"], message: "a tolerância exige um valor esperado" })
    }
    if (!checksValue && exprCase.raises === undefined && exprCase.expected_stdout === undefined) {
      ctx.addIssue({ code: "custom", path: ["expected"], message: "informe o valor, o tipo, a exceção ou a saída esperada" })
    }
    checkOutputPattern(exprCase.match, exprCase.expected_stdout, ctx)
  })

export const UNITTEST_EXPECTATIONS = ["pass", "fail"] as const

/**
 * Corrige a SUÍTE unittest escrita pelo aluno: roda os testes dele contra uma
 * implementação — a de referência, um mutante com defeito, ou a do próprio
 * aluno quando `implementation` é omitido. O executor devolve só contagens
 * (rodados/falhas/erros); a API decide. A referência precisa passar e cada
 * mutante precisa ser reprovado (a suíte "mata" o mutante).
 */
export const unittestCaseSchema = z
  .object({
    ...baseCase,
    kind: z.literal("unittest"),
    /** Classe TestCase a rodar; omitida = todas as definidas no main.py. */
    test_class: z.string().regex(PYTHON_IDENTIFIER).max(64).optional(),
    /** Nome (função ou classe) do main.py substituído pela implementação. */
    target: z.string().regex(PYTHON_IDENTIFIER).max(64).optional(),
    /** Código Python que define `target`. Omitido = implementação do aluno. */
    implementation: z.string().min(1).max(50_000).optional(),
    /** `pass`: a suíte deve passar; `fail`: deve acusar o defeito (falha ou erro). */
    expect: z.enum(UNITTEST_EXPECTATIONS),
    /** Mínimo de testes que a suíte deve ter. */
    min_tests: z.number().int().min(1).max(100).optional(),
  })
  .superRefine((unittestCase, ctx) => {
    if ((unittestCase.implementation === undefined) !== (unittestCase.target === undefined)) {
      const path = unittestCase.target === undefined ? "target" : "implementation"
      ctx.addIssue({ code: "custom", path: [path], message: "implementação e nome substituído andam juntos" })
    }
  })

/**
 * Testes legados (hidden_tests unittest/assert migrados do Supabase).
 * Rodam DENTRO do sandbox, junto com o código do aluno: correção mais fraca,
 * marcada como "legacy". Converter para os tipos acima assim que possível.
 */
export const legacyCaseSchema = z.object({
  ...baseCase,
  kind: z.literal("legacy"),
  code: z.string().min(1).max(100_000),
})

export const testCaseSchema = z.discriminatedUnion("kind", [
  callCaseSchema,
  ioCaseSchema,
  variableCaseSchema,
  sourceCaseSchema,
  exprCaseSchema,
  unittestCaseSchema,
  legacyCaseSchema,
])
/** Caso de teste do gabarito, discriminado por `kind`. Nunca sai da API para o aluno. */
export type TestCase = z.infer<typeof testCaseSchema>
/** Caso que chama uma função do aluno e compara o retorno. */
export type CallCase = z.infer<typeof callCaseSchema>
/** Caso que roda o programa com uma entrada e compara a saída padrão. */
export type IoCase = z.infer<typeof ioCaseSchema>
/** Caso que lê uma variável global depois de executar o programa. */
export type VariableCase = z.infer<typeof variableCaseSchema>
/** Caso que só analisa a estrutura do código (sem executar). */
export type SourceCase = z.infer<typeof sourceCaseSchema>
/** Caso que avalia uma expressão do professor no namespace do aluno (valor ou exceção comparados na API). */
export type ExprCase = z.infer<typeof exprCaseSchema>
/** Caso que roda a suíte unittest do aluno contra uma implementação (referência ou mutante). */
export type UnittestCase = z.infer<typeof unittestCaseSchema>
/** Caso legado: código de teste unittest importado do avaliador antigo. */
export type LegacyCase = z.infer<typeof legacyCaseSchema>

export const testCasesSchema = z
  .array(testCaseSchema)
  .max(100)
  .superRefine((cases, ctx) => {
    const seenIds = new Set<string>()
    cases.forEach((testCase, index) => {
      if (seenIds.has(testCase.id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: `id duplicado: ${testCase.id}` })
      seenIds.add(testCase.id)
    })
  })

/** `strong`: só casos declarativos; `legacy`: algum caso legado (correção mais fraca). */
export type GradingStrength = "strong" | "legacy"

/** Resultado de um caso, como o aluno vê. */
export interface CaseResult {
  id: string
  name: string
  passed: boolean
  message: string | null
}

/**
 * Resultado de correção. Mantém os campos de `TestResult` (contrato antigo do
 * IDE) e acrescenta o detalhamento por caso.
 */
export interface TestResult {
  testsRun: number
  passed: number
  failures: number
  errors: number
  allPassed: boolean
  failureDetails: string[]
}

/** Veredito de uma correção, com o resultado de cada caso visível ao aluno. */
export interface GradeResult extends TestResult {
  cases: CaseResult[]
  strength: GradingStrength
  /** Tempo total gasto no executor (ms). */
  durationMs: number
}

/** Efeito de concluir uma lição (XP, badges, nível) devolvido após o veredito. */
export interface LessonCompletion {
  lesson_completed: boolean
  xp_awarded: number
  /** Badges recém-conquistadas nesta conclusão. */
  new_badges: GrantedBadge[]
  level_up: boolean
  new_level: number
}

/** Resposta de `POST /lessons/:id/submissions`: veredito, efeito na gamificação e id da submissão. */
export interface SubmissionResult extends GradeResult, LessonCompletion {
  submission_id: string
}
