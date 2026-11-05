import { accessSync, constants, existsSync, readdirSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { isPublishedSecret } from "@levelusp/contracts"
import { z } from "zod"
import { PYODIDE_PROFILE_NAMES, type PyodideProfileName } from "./pyodide-profiles.js"
import { PYODIDE_POLICIES } from "./pyodide-protocol.js"

const sourceDir = path.dirname(fileURLToPath(import.meta.url))

/** Valor booleano em variável de ambiente (`true`/`1`/`yes` ou `false`/`0`/`no`). */
const booleanFlag = z
  .union([z.boolean(), z.string()])
  .transform((value, ctx) => {
    if (typeof value === "boolean") return value
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "yes", "sim"].includes(normalized)) return true
    if (["false", "0", "no", "não", "nao"].includes(normalized)) return false
    ctx.addIssue({ code: "custom", message: "use true ou false" })
    return z.NEVER
  })

/**
 * Workers aquecidos por perfil: um número (vale para todos) ou `perfil:n,perfil:n`
 * (ex.: `dados:1,ml:0` — o perfil `ml` custa ~1,5 GB ocioso).
 */
export function parseWarmPool(value: string): Record<PyodideProfileName, number> {
  const pool: Record<PyodideProfileName, number> = { dados: 0, ml: 0 }
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) {
    for (const profile of PYODIDE_PROFILE_NAMES) pool[profile] = Number(trimmed)
    return pool
  }
  for (const entry of trimmed.split(",").filter((part) => part.trim() !== "")) {
    const [name, count] = entry.split(":").map((part) => part.trim())
    if (name === undefined || count === undefined || !/^\d+$/.test(count) || !isProfileName(name)) {
      throw new Error(`RUNNER_PYODIDE_WARM inválido: "${value}" (use um número ou dados:n,ml:n)`)
    }
    pool[name] = Number(count)
  }
  return pool
}

function isProfileName(name: string): name is PyodideProfileName {
  return (PYODIDE_PROFILE_NAMES as readonly string[]).includes(name)
}

const warmPoolSchema = z.string().default("dados:1,ml:0").transform((value, ctx) => {
  try {
    return parseWarmPool(value)
  } catch (error) {
    ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : String(error) })
    return z.NEVER
  }
})

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8081),
  HOST: z.string().default("0.0.0.0"),
  /** Segredo compartilhado com a API (defesa em profundidade; a rede já é interna). */
  RUNNER_TOKEN: z.string().min(24, "RUNNER_TOKEN precisa de 24+ caracteres"),
  WASMTIME_BIN: z.string().default("wasmtime"),
  PYTHON_WASI_DIR: z.string().default("/opt/levelusp-python"),
  HARNESS_PATH: z.string().default(path.resolve(sourceDir, "../python/harness.py")),
  WORK_DIR: z.string().default(os.tmpdir()),
  /**
   * Instâncias WASI simultâneas. Padrão: uma por CPU. Numa máquina de 2 vCPU com a pilha
   * inteira (docs/v2/desempenho-e-carga.md), 2 corrige 40 alunos em rajada com p95 de 0,7 s e
   * 1 leva 2,8 s; a API e a web quase não usam CPU durante a rajada.
   */
  CONCURRENCY: z.coerce.number().int().min(1).max(64).default(Math.max(1, os.availableParallelism())),
  /**
   * Teto rígido de LOTES (instâncias) esperando. O limite que vale na prática é o de tempo
   * (`MAX_QUEUE_WAIT_MS`); este só impede a fila de crescer sem limite em memória.
   */
  MAX_QUEUE: z.coerce.number().int().min(1).default(200),
  /**
   * Recusa (503 com Retry-After) o job cuja espera estimada até terminar passa disto. Fica
   * abaixo do prazo da API (3 × 10 s + 10 s), para o aluno receber "ocupado" em vez de esperar
   * e ver "indisponível".
   */
  MAX_QUEUE_WAIT_MS: z.coerce.number().int().min(1_000).max(120_000).default(20_000),
  /** Cota de disco por lote (MB gravados no projeto do aluno). */
  MAX_JOB_DISK_MB: z.coerce.number().int().min(1).max(1024).default(32),
  /** `production` recusa partir com a stdlib do Python gravável (ver `findWritableRuntimePaths`). */
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // ── Motor python-dados (Pyodide) ──────────────────────────────────────────
  /** Pasta com o núcleo do Pyodide e os wheels (`scripts/fetch-pyodide.sh`). */
  PYODIDE_DIR: z.string().default("/opt/levelusp-pyodide"),
  /** Liga o motor; ausente = ligado quando `PYODIDE_DIR` tem o `pyodide.asm.wasm`. */
  RUNNER_PYODIDE_ENABLED: booleanFlag.optional(),
  /** `fresh` (um lote por worker, padrão) ou `reuse` (worker atende vários lotes, com restauração). */
  RUNNER_PYODIDE_POLICY: z.enum(PYODIDE_POLICIES).default("fresh"),
  /** Workers aquecidos por perfil: número ou `dados:n,ml:n` (padrão `dados:1,ml:0`: ml ocioso custa ~1,3 GB). */
  RUNNER_PYODIDE_WARM: warmPoolSchema,
  /** Política `reuse`: lotes por worker antes de reciclá-lo. */
  RUNNER_PYODIDE_RECYCLE_AFTER: z.coerce.number().int().min(1).max(10_000).default(25),
  /** Teto da memória linear do wasm por worker (MB): crescer além disto dá `MemoryError`. */
  RUNNER_PYODIDE_MAX_HEAP_MB: z.coerce.number().int().min(128).max(4_096).default(512),
  /** Política `reuse`: worker cujo heap wasm fica acima disto depois do lote é reciclado (MB). */
  RUNNER_PYODIDE_RECYCLE_HEAP_MB: z.coerce.number().int().min(64).max(4_096).default(256),
  /** Teto do heap de JS do worker (`resourceLimits.maxOldGenerationSizeMb`); o perfil `ml` usa ~750 MB. */
  RUNNER_PYODIDE_JS_HEAP_MB: z.coerce.number().int().min(256).max(8_192).default(1_536),
  /** Prazo do aquecimento de um worker (carregar Pyodide + pacotes do perfil). */
  RUNNER_PYODIDE_BOOT_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(600_000).default(90_000),
  /** Script compilado do worker; ausente = `pyodide-worker.js` ao lado do `main.js` (ou em `dist/` no modo dev). */
  PYODIDE_WORKER_PATH: z.string().optional(),
}).superRefine((env, ctx) => {
  // Em produção, recusa os tokens de exemplo/dev/CI publicados no repositório (a API faz o mesmo).
  if (env.NODE_ENV === "production" && isPublishedSecret(env.RUNNER_TOKEN)) {
    ctx.addIssue({ code: "custom", path: ["RUNNER_TOKEN"], message: "parece o valor de exemplo/dev publicado no repositório; gere um novo (openssl rand -hex 24)" })
  }
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

/** O motor Pyodide fica ligado por configuração explícita ou, por padrão, quando a distribuição existe. */
export function isPyodideEnabled(config: Pick<RunnerConfig, "PYODIDE_DIR" | "RUNNER_PYODIDE_ENABLED">): boolean {
  return config.RUNNER_PYODIDE_ENABLED ?? existsSync(path.join(config.PYODIDE_DIR, "pyodide.asm.wasm"))
}

/**
 * Caminho do script do worker: configurado, ao lado deste módulo (`dist/`) ou, rodando
 * do código-fonte com `tsx`, o compilado em `dist/` (o worker é sempre JavaScript).
 */
export function resolvePyodideWorkerPath(configured: string | undefined): string {
  if (configured !== undefined) return configured
  const sibling = path.join(sourceDir, "pyodide-worker.js")
  if (existsSync(sibling)) return sibling
  return path.resolve(sourceDir, "../dist/pyodide-worker.js")
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
