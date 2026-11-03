import { accessSync, constants } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

const sourceDir = path.dirname(fileURLToPath(import.meta.url))

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8081),
  HOST: z.string().default("0.0.0.0"),
  /** Segredo compartilhado com a API (defesa em profundidade; a rede já é interna). */
  RUNNER_TOKEN: z.string().min(24, "RUNNER_TOKEN precisa de 24+ caracteres"),
  WASMTIME_BIN: z.string().default("wasmtime"),
  PYTHON_WASI_DIR: z.string().default("/opt/levelusp-python"),
  HARNESS_PATH: z.string().default(path.resolve(sourceDir, "../python/harness.py")),
  WORK_DIR: z.string().default(os.tmpdir()),
  CONCURRENCY: z.coerce.number().int().min(1).max(64).default(Math.max(1, os.availableParallelism() - 1)),
  /** Fila curta: com 2 execuções simultâneas e 10 s cada, 20 jobs ≈ 100 s de espera no pior caso. */
  MAX_QUEUE: z.coerce.number().int().min(1).default(20),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
})

/** Configuração do executor lida do ambiente, com os padrões aplicados. */
export type RunnerConfig = z.infer<typeof envSchema>

/**
 * Lê e valida a configuração do ambiente e resolve o caminho absoluto do Wasmtime.
 *
 * @throws Error com todos os problemas encontrados quando alguma variável é inválida.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): RunnerConfig {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    throw new Error(`Configuração inválida do executor: ${details}`)
  }
  return { ...parsed.data, WASMTIME_BIN: resolveBinary(parsed.data.WASMTIME_BIN, env.PATH) }
}

/**
 * O Wasmtime é iniciado com ambiente VAZIO (nem PATH), então resolvemos o
 * caminho absoluto do binário uma vez, na partida.
 */
export function resolveBinary(binary: string, searchPath = ""): string {
  if (binary.includes("/")) return binary
  for (const dir of searchPath.split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(dir, binary)
    if (isExecutable(candidate)) return candidate
  }
  throw new Error(`Binário "${binary}" não encontrado no PATH`)
}

function isExecutable(file: string): boolean {
  try {
    accessSync(file, constants.X_OK)
    return true
  } catch {
    return false
  }
}
