import { z } from "zod"
import { DEFAULT_ENTRY_FILE, projectFileSchema } from "./lessons"
import { jsonSchema, type Json } from "./grading"

/**
 * Protocolo API → executor (rede interna, nunca exposto à internet).
 * O executor não tem segredos nem acesso ao banco: recebe arquivos e sondas,
 * devolve observações. Nenhuma sonda carrega o valor esperado.
 */
/** Orçamento padrão de uma execução no executor. */
export const DEFAULT_RUNNER_LIMITS = { timeoutMs: 10_000, memoryMb: 128 } as const

export const probeSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("run"), stdin: z.string().max(100_000).default("") }),
  z.object({
    id: z.string(),
    kind: z.literal("call"),
    function: z.string().max(200),
    args: z.array(jsonSchema).default([]),
    kwargs: z.record(z.string(), jsonSchema).default({}),
  }),
  z.object({ id: z.string(), kind: z.literal("globals"), names: z.array(z.string().max(64)).max(50) }),
  z.object({ id: z.string(), kind: z.literal("ast") }),
  /** Preparação + expressão do professor no namespace do aluno (casos `expr`). */
  z.object({
    id: z.string(),
    kind: z.literal("expr"),
    setup: z.string().max(20_000).default(""),
    expr: z.string().max(2_000),
    stdin: z.string().max(100_000).default(""),
  }),
  /** Suíte unittest do aluno contra uma implementação (casos `unittest`). */
  z.object({
    id: z.string(),
    kind: z.literal("unittest"),
    test_class: z.string().max(64).optional(),
    target: z.string().max(64).optional(),
    implementation: z.string().max(50_000).optional(),
  }),
  z.object({ id: z.string(), kind: z.literal("legacy"), code: z.string().max(100_000) }),
])
/** Sonda que o executor roda; nenhuma carrega o valor esperado (a comparação é na API). */
export type Probe = z.infer<typeof probeSchema>
/** Tipo de sonda aceito pelo executor (discriminante de `Probe`). */
export type ProbeKind = Probe["kind"]

/**
 * Sondas que exigem o modo estrito do harness (instância própria, introspecção
 * de frames/gc bloqueada): o veredito delas depende de algo que nasce dentro
 * do sandbox (resultado de asserts legados, contagem de testes do aluno).
 */
export const STRICT_PROBE_KINDS: ReadonlySet<ProbeKind> = new Set<ProbeKind>(["legacy", "unittest"])

export const runnerJobSchema = z.object({
  files: z.array(projectFileSchema).min(1).max(30),
  entry: z.string().default(DEFAULT_ENTRY_FILE),
  probes: z.array(probeSchema).min(1).max(100),
  limits: z
    .object({
      timeoutMs: z.number().int().min(500).max(30_000).default(DEFAULT_RUNNER_LIMITS.timeoutMs),
      memoryMb: z.number().int().min(32).max(512).default(DEFAULT_RUNNER_LIMITS.memoryMb),
    })
    .default({ ...DEFAULT_RUNNER_LIMITS }),
})
/** Pedido da API ao executor: o projeto, o arquivo de entrada, as sondas e os limites. */
export type RunnerJob = z.infer<typeof runnerJobSchema>
/** Orçamento de tempo e memória de uma execução. */
export type RunnerLimits = RunnerJob["limits"]

/** Construções encontradas na AST do código do aluno (base das regras de `source`). */
export interface AstFeatures {
  constructs: string[]
  calls: string[]
  functions: string[]
  classes: string[]
  imports: string[]
  recursive_functions: string[]
  /** Nomes dos decorators usados (`property`, `wraps`, `setter`...). */
  decorators: string[]
  /** Nomes das exceções capturadas em `except`. */
  handlers: string[]
  /** Construções usadas dentro de cada função (inclui funções aninhadas). */
  function_constructs: Record<string, string[]>
}

/** Exceção levantada pela preparação ou pela expressão de um caso `expr`. */
export interface RaisedException {
  /** Tipo da exceção: nome puro se embutido, `modulo.Classe` se do aluno. */
  type: string
  /** Tipos da hierarquia (MRO), no mesmo formato de `type`. */
  mro: string[]
  message: string
  stage: "setup" | "expr"
}

/** Resultado da suíte unittest do aluno contra uma implementação. */
export interface UnittestOutcome {
  run: number
  failures: number
  errors: number
  skipped: number
  /** Nomes (truncados) dos testes que falharam ou deram erro. */
  failed: string[]
}

/** O que o executor observou ao rodar uma sonda; os campos preenchidos dependem do `kind` da sonda. */
export interface ProbeObservation {
  id: string
  ok: boolean
  /** Saída padrão do programa (run). */
  stdout?: string
  stderr?: string
  /** Valor retornado (call) ou valores lidos (globals), em JSON canônico. */
  value?: Json
  values?: Record<string, Json>
  /** Nome do tipo Python do valor (call) ou de cada variável (globals). */
  type?: string
  types?: Record<string, string>
  /** Variáveis pedidas que não existem (globals). */
  missing?: string[]
  features?: AstFeatures
  /** Exceção levantada (expr). */
  raised?: RaisedException
  /** Resultado da suíte do aluno (unittest). */
  tests?: UnittestOutcome
  /** Resultado de teste legado. */
  legacy?: { testsRun: number; failures: number; errors: number; details: string[] }
  /** Erro do código do aluno (tipo + mensagem), sem traceback do executor. */
  error?: string
  timedOut?: boolean
  /** Saída do executor truncada por tamanho. */
  truncated?: boolean
}

/** Resposta do executor: uma observação por sonda, versões do motor e duração total. */
export interface RunnerResult {
  observations: ProbeObservation[]
  engine: { python: string; runtime: string }
  durationMs: number
}
