import { accessSync, constants } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

const here = path.dirname(fileURLToPath(import.meta.url))

const schema = z.object({
  PORT: z.coerce.number().int().default(8081),
  HOST: z.string().default("0.0.0.0"),
  /** Segredo compartilhado com a API (defesa em profundidade; a rede já é interna). */
  RUNNER_TOKEN: z.string().min(24, "RUNNER_TOKEN precisa de 24+ caracteres"),
  WASMTIME_BIN: z.string().default("wasmtime"),
  PYTHON_WASI_DIR: z.string().default("/opt/levelusp-python"),
  HARNESS_PATH: z.string().default(path.resolve(here, "../python/harness.py")),
  WORK_DIR: z.string().default(os.tmpdir()),
  CONCURRENCY: z.coerce.number().int().min(1).max(64).default(Math.max(1, os.availableParallelism() - 1)),
  /** Fila curta: com 2 execuções simultâneas e 10 s cada, 20 jobs ≈ 100 s de espera no pior caso. */
  MAX_QUEUE: z.coerce.number().int().min(1).default(20),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
})

export type RunnerConfig = z.infer<typeof schema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RunnerConfig {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    throw new Error(`Configuração inválida do executor: ${msg}`)
  }
  return { ...parsed.data, WASMTIME_BIN: resolveBinary(parsed.data.WASMTIME_BIN, env.PATH) }
}

/**
 * O Wasmtime é iniciado com ambiente VAZIO (nem PATH), então resolvemos o
 * caminho absoluto do binário uma vez, na partida.
 */
export function resolveBinary(bin: string, pathEnv = ""): string {
  if (bin.includes("/")) return bin
  for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(dir, bin)
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // continua procurando
    }
  }
  throw new Error(`Binário "${bin}" não encontrado no PATH`)
}
