import { z } from "zod"
import { projectFileSchema } from "./lessons"
import { jsonSchema, type Json } from "./grading"

/**
 * Protocolo API → executor (rede interna, nunca exposto à internet).
 * O executor não tem segredos nem acesso ao banco: recebe arquivos e sondas,
 * devolve observações. Nenhuma sonda carrega o valor esperado.
 */
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
  z.object({ id: z.string(), kind: z.literal("legacy"), code: z.string().max(100_000) }),
])
export type Probe = z.infer<typeof probeSchema>

export const runnerJobSchema = z.object({
  files: z.array(projectFileSchema).min(1).max(30),
  entry: z.string().default("main.py"),
  probes: z.array(probeSchema).min(1).max(100),
  limits: z
    .object({
      timeoutMs: z.number().int().min(500).max(30_000).default(10_000),
      memoryMb: z.number().int().min(32).max(512).default(128),
    })
    .default({ timeoutMs: 10_000, memoryMb: 128 }),
})
export type RunnerJob = z.infer<typeof runnerJobSchema>

export interface AstFeatures {
  constructs: string[]
  calls: string[]
  functions: string[]
  classes: string[]
  imports: string[]
  recursive_functions: string[]
}

export interface ProbeObservation {
  id: string
  ok: boolean
  /** Saída padrão do programa (run) */
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
  /** Resultado de teste legado. */
  legacy?: { testsRun: number; failures: number; errors: number; details: string[] }
  /** Erro do código do aluno (tipo + mensagem), sem traceback do executor. */
  error?: string
  timedOut?: boolean
  /** Saída do executor truncada por tamanho. */
  truncated?: boolean
}

export interface RunnerResult {
  observations: ProbeObservation[]
  engine: { python: string; runtime: string }
  durationMs: number
}
