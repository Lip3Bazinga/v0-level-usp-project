import { accessSync, constants, readdirSync } from "node:fs"
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
  /** Cota de disco por lote (MB gravados no projeto do aluno). */
  MAX_JOB_DISK_MB: z.coerce.number().int().min(1).max(1024).default(32),
  /** `production` recusa partir com a stdlib do Python gravável (ver `findWritableRuntimePaths`). */
  NODE_ENV: z.string().default("development"),
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

/** Teto de entradas verificadas na stdlib (a do CPython WASI tem ~700 arquivos). */
const MAX_RUNTIME_ENTRIES = 20_000

/**
 * Caminhos da stdlib (montada em `/lib` de TODO convidado) que ESTE processo
 * consegue alterar. O harness não entra: cada lote recebe uma cópia própria. Se o executor puder gravar
 * neles (rodando como root, ou dono de /opt/levelusp-python), o convidado
 * também pode — o WASI concede ao `--dir` as permissões do processo — e um
 * aluno troca, por exemplo, `json/__init__.py` para forjar as correções de
 * todos os jobs seguintes. Em produção a imagem roda como `node`, com a stdlib
 * do root e o sistema de arquivos somente leitura.
 *
 * @returns os caminhos graváveis (vazio = tudo somente leitura para este processo).
 */
export function findWritableRuntimePaths(pythonDir: string): string[] {
  const libDir = path.join(pythonDir, "lib")
  if (process.getuid?.() === 0) return [libDir]
  const writable: string[] = []
  const pending = [libDir]
  let visited = 0
  for (let current = pending.pop(); current !== undefined && visited < MAX_RUNTIME_ENTRIES; current = pending.pop()) {
    visited++
    if (isWritable(current)) writable.push(current)
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) pending.push(entryPath)
      else if (isWritable(entryPath)) writable.push(entryPath)
    }
  }
  return writable
}

function isWritable(file: string): boolean {
  try {
    accessSync(file, constants.W_OK)
    return true
  } catch {
    return false
  }
}
