import { z } from "zod"

/**
 * Formato de correção ("casos declarativos").
 *
 * Princípio de segurança: os valores ESPERADOS ficam só na API. O executor
 * recebe apenas as entradas (sondas) e devolve o que o código do aluno
 * produziu; a comparação acontece fora do sandbox. Assim o aluno não consegue
 * ler o gabarito nem forjar o veredito.
 */

/** Valor JSON arbitrário (entrada/saída de funções do aluno). */
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json }
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

/** Tipos Python verificáveis (o JSON não distingue int de float, nem list de tuple). */
export const pyTypeSchema = z.enum(["int", "float", "str", "bool", "list", "tuple", "dict", "set", "NoneType"])
export type PyType = z.infer<typeof pyTypeSchema>

/** Chama uma função definida pelo aluno e compara o retorno. */
export const callCaseSchema = z.object({
  ...baseCase,
  kind: z.literal("call"),
  function: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/),
  args: z.array(jsonSchema).max(20).default([]),
  kwargs: z.record(z.string(), jsonSchema).default({}),
  expected: jsonSchema,
  /** Tipo Python exigido do retorno (opcional). */
  type: pyTypeSchema.optional(),
  /** Tolerância absoluta para números de ponto flutuante. */
  tolerance: z.number().min(0).max(1).optional(),
})

/** Executa o programa (main.py) com uma entrada e compara a saída padrão. */
export const ioCaseSchema = z.object({
  ...baseCase,
  kind: z.literal("io"),
  stdin: z.string().max(100_000).default(""),
  expected_stdout: z.string().max(100_000),
  match: z.enum(["exact", "trimmed", "contains", "regex"]).default("trimmed"),
})

/** Lê variáveis globais após executar main.py. */
export const variableCaseSchema = z.object({
  ...baseCase,
  kind: z.literal("variable"),
  variable: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  expected: jsonSchema,
  type: pyTypeSchema.optional(),
  tolerance: z.number().min(0).max(1).optional(),
})

export const sourceRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("uses"),
    construct: z.enum([
      "lambda", "for", "while", "if", "def", "class", "list_comprehension",
      "dict_comprehension", "f_string", "try", "with", "return", "import", "recursion",
    ]),
  }),
  z.object({ type: z.literal("not_uses"), construct: z.enum(["for", "while", "import", "list_comprehension"]) }),
  z.object({ type: z.literal("calls"), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal("not_calls"), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal("defines_function"), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal("defines_class"), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal("imports"), module: z.string().min(1).max(64) }),
])
export type SourceRule = z.infer<typeof sourceRuleSchema>

/** Verifica a estrutura do código (análise de AST, sem executar). */
export const sourceCaseSchema = z.object({
  ...baseCase,
  kind: z.literal("source"),
  rule: sourceRuleSchema,
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
  legacyCaseSchema,
])
export type TestCase = z.infer<typeof testCaseSchema>
export type CallCase = z.infer<typeof callCaseSchema>
export type IoCase = z.infer<typeof ioCaseSchema>
export type VariableCase = z.infer<typeof variableCaseSchema>
export type SourceCase = z.infer<typeof sourceCaseSchema>
export type LegacyCase = z.infer<typeof legacyCaseSchema>

export const testCasesSchema = z
  .array(testCaseSchema)
  .max(100)
  .superRefine((cases, ctx) => {
    const seen = new Set<string>()
    cases.forEach((c, i) => {
      if (seen.has(c.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `id duplicado: ${c.id}` })
      seen.add(c.id)
    })
  })

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

export interface GradeResult extends TestResult {
  cases: CaseResult[]
  strength: GradingStrength
  /** Tempo total gasto no executor (ms). */
  durationMs: number
}

export interface SubmissionResult extends GradeResult {
  submission_id: string
  lesson_completed: boolean
  xp_awarded: number
  /** Badges recém-conquistadas nesta submissão. */
  new_badges: { id: string; name: string; icon: string; rarity: string }[]
  level_up: boolean
  new_level: number
}
