import { accessSync, constants, existsSync, readdirSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { isPublishedSecret } from "@levelusp/contracts"
import { z } from "zod"
import { BATCH_MEMORY_KEYS, DEFAULT_BATCH_MEMORY_MB, type BatchMemoryKey, type BatchMemoryMb } from "./memory-budget.js"
import { NATIVE_ENGINE_MODES } from "./native-policy.js"
import { PYODIDE_PROFILE_NAMES, type PyodideProfileName } from "./pyodide-profiles.js"
import { PYODIDE_POLICIES, type PyodidePolicies, type PyodidePolicy } from "./pyodide-protocol.js"

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

function isPolicy(value: string): value is PyodidePolicy {
  return (PYODIDE_POLICIES as readonly string[]).includes(value)
}

/**
 * Política por perfil: `fresh` ou `reuse` (vale para todos) ou `perfil:política,...`
 * (ex.: `dados:fresh,ml:reuse`); perfil não citado fica em `fresh`.
 *
 * @throws Error para um perfil ou uma política desconhecidos.
 */
export function parsePyodidePolicy(value: string): PyodidePolicies {
  const policies: PyodidePolicies = { dados: "fresh", ml: "fresh" }
  const trimmed = value.trim().toLowerCase()
  if (isPolicy(trimmed)) {
    for (const profile of PYODIDE_PROFILE_NAMES) policies[profile] = trimmed
    return policies
  }
  const entries = trimmed.split(",").filter((part) => part.trim() !== "")
  if (entries.length === 0) throw new Error(`RUNNER_PYODIDE_POLICY inválido: "${value}" (use fresh, reuse ou dados:fresh,ml:reuse)`)
  for (const entry of entries) {
    const [name, policy] = entry.split(":").map((part) => part.trim())
    if (name === undefined || policy === undefined || !isProfileName(name) || !isPolicy(policy)) {
      throw new Error(`RUNNER_PYODIDE_POLICY inválido: "${value}" (use fresh, reuse ou dados:fresh,ml:reuse)`)
    }
    policies[name] = policy
  }
  return policies
}

const BYTES_PER_MIB = 1024 * 1024
/** Multiplicador de cada sufixo do formato de memória do Docker (`b`, `k`, `m`, `g`). */
const MEMORY_UNIT_BYTES: Readonly<Record<string, number>> = { "": 1, b: 1, k: 1024, m: BYTES_PER_MIB, g: 1024 * BYTES_PER_MIB }

/**
 * Tamanho de memória no formato do Docker (`6g`, `1536m`, `2097152k`, bytes sem sufixo),
 * convertido para MB. `unlimited` desliga o orçamento (devolve `Infinity`).
 *
 * @throws Error para um valor fora do formato ou não positivo.
 */
export function parseMemorySize(value: string): number {
  const trimmed = value.trim().toLowerCase()
  if (trimmed === "unlimited") return Number.POSITIVE_INFINITY
  const match = /^(\d+(?:\.\d+)?)\s*([bkmg]?)(?:i?b)?$/.exec(trimmed)
  const amount = Number(match?.[1])
  const unit = MEMORY_UNIT_BYTES[match?.[2] ?? ""]
  if (match === null || unit === undefined || !(amount > 0)) throw new Error(`RUNNER_MEMORY inválido: "${value}" (use o formato do Docker: 6g, 1536m; ou unlimited)`)
  return Math.floor((amount * unit) / BYTES_PER_MIB)
}

function isBatchMemoryKey(name: string): name is BatchMemoryKey {
  return (BATCH_MEMORY_KEYS as readonly string[]).includes(name)
}

/**
 * Peso em MB de uma instância de cada perfil: `python:0,dados:256,ml:1229`. Perfil não
 * citado fica com o padrão (`DEFAULT_BATCH_MEMORY_MB`).
 *
 * @throws Error para um perfil desconhecido ou um peso que não é inteiro ≥ 0.
 */
export function parseBatchMemory(value: string): BatchMemoryMb {
  const weights: BatchMemoryMb = { ...DEFAULT_BATCH_MEMORY_MB }
  for (const entry of value.split(",").filter((part) => part.trim() !== "")) {
    const [name, megabytes] = entry.split(":").map((part) => part.trim().toLowerCase())
    if (name === undefined || megabytes === undefined || !/^\d+$/.test(megabytes) || !isBatchMemoryKey(name)) {
      throw new Error(`RUNNER_BATCH_MEMORY_MB inválido: "${value}" (use python:0,dados:256,ml:1229)`)
    }
    weights[name] = Number(megabytes)
  }
  return weights
}

/** Adapta um analisador que lança a um `transform` do Zod (a mensagem do erro vira a do campo). */
function parsedString<T>(parse: (value: string) => T): (value: string, ctx: z.RefinementCtx) => T {
  return (value, ctx) => {
    try {
      return parse(value)
    } catch (error) {
      ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : String(error) })
      return z.NEVER
    }
  }
}

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

  // ── Orçamento de memória ──────────────────────────────────────────────────
  /**
   * Memória do contêiner no formato do Docker (`6g`, `1536m`), em MB depois de lida; `unlimited`
   * desliga o orçamento. Ausente = limite do cgroup (`process.constrainedMemory()`) ou, sem
   * ele, a memória da máquina (ver `detectMemoryLimitMb`).
   */
  RUNNER_MEMORY: z.string().optional().transform((value, ctx) => (value === undefined || value.trim() === "" ? undefined : parsedString(parseMemorySize)(value, ctx))),
  /**
   * Parte do limite que fica fora do orçamento (MB): o processo do Node, o WASI, a folga do
   * sistema e o crescimento dos workers durante os lotes (os pesos padrão são o RSS medido, não
   * o pior caso). Com vários workers `ml` crescendo ao mesmo tempo até o teto do heap, 512 MB
   * podem não bastar: aumente a reserva ou use pesos de pior caso em `RUNNER_BATCH_MEMORY_MB`.
   */
  RUNNER_MEMORY_RESERVE_MB: z.coerce.number().int().min(0).max(1_048_576).default(512),
  /**
   * Peso de uma instância por perfil, em MB (`python:0,dados:256,ml:1229`): quanto cada worker
   * vivo ocupa do orçamento. O padrão é o RSS medido de um worker; o heap wasm ainda pode
   * crescer durante o lote até `RUNNER_PYODIDE_MAX_HEAP_MB`. Pesos de pior caso (RSS + teto do
   * heap − heap pós-aquecimento) seriam cerca de `dados:700,ml:1560`: garantia rígida, menos
   * lotes simultâneos.
   */
  RUNNER_BATCH_MEMORY_MB: z.string().default("").transform(parsedString(parseBatchMemory)),

  // ── Motor python-dados (Pyodide) ──────────────────────────────────────────
  /** Pasta com o núcleo do Pyodide e os wheels (`scripts/fetch-pyodide.sh`). */
  PYODIDE_DIR: z.string().default("/opt/levelusp-pyodide"),
  /** Liga o motor; ausente = ligado quando `PYODIDE_DIR` tem o `pyodide.asm.wasm`. */
  RUNNER_PYODIDE_ENABLED: booleanFlag.optional(),
  /**
   * `fresh` (um lote por worker, padrão) ou `reuse` (worker atende vários lotes, com restauração);
   * um valor vale para todos os perfis, ou por perfil: `dados:fresh,ml:reuse`.
   */
  RUNNER_PYODIDE_POLICY: z.string().default("fresh").transform(parsedString(parsePyodidePolicy)),
  /** Workers aquecidos por perfil: número ou `dados:n,ml:n` (padrão `dados:1,ml:0`: ml ocioso custa ~1,3 GB). */
  RUNNER_PYODIDE_WARM: warmPoolSchema,
  /** Política `reuse`: lotes por worker antes de reciclá-lo. */
  RUNNER_PYODIDE_RECYCLE_AFTER: z.coerce.number().int().min(1).max(10_000).default(25),
  /** Teto da memória linear do wasm por worker (MB): crescer além disto dá `MemoryError`. */
  RUNNER_PYODIDE_MAX_HEAP_MB: z.coerce.number().int().min(128).max(4_096).default(512),
  /**
   * Política `reuse`: worker cujo heap wasm fica acima disto depois do lote é reciclado (MB).
   * Teto absoluto; o `ml` aquece com 187 MB (ver as medições em `PyodideEngineOptions.recycleHeapMb`).
   */
  RUNNER_PYODIDE_RECYCLE_HEAP_MB: z.coerce.number().int().min(64).max(4_096).default(256),
  /** Teto do heap de JS do worker (`resourceLimits.maxOldGenerationSizeMb`); o perfil `ml` usa ~750 MB. */
  RUNNER_PYODIDE_JS_HEAP_MB: z.coerce.number().int().min(256).max(8_192).default(1_536),
  /** Prazo do aquecimento de um worker (carregar Pyodide + pacotes do perfil). */
  RUNNER_PYODIDE_BOOT_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(600_000).default(90_000),
  /** Script compilado do worker; ausente = `pyodide-worker.js` ao lado do `main.js` (ou em `dist/` no modo dev). */
  PYODIDE_WORKER_PATH: z.string().optional(),

  // ── Motor python-completo (CPython nativo em contêiner gVisor) ─────────────
  /**
   * `off` (padrão) ou `gvisor`. Desligado, o runtime `python-completo` responde 501. Ligado, o
   * executor precisa do binário `docker` e de acesso a um daemon: leia os riscos em
   * `docs/v2/seguranca.md` antes (o socket do Docker equivale a root na máquina do daemon).
   */
  RUNNER_NATIVE_ENGINE: z.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() || "off" : value), z.enum(NATIVE_ENGINE_MODES)).default("off"),
  /**
   * Aceita subir o motor com `runc` quando o Docker não tem `runsc`. Só vale com
   * `NODE_ENV=development` (ver `decideNativeRuntime`): em qualquer outro ambiente o motor não sobe.
   */
  RUNNER_ALLOW_INSECURE_NATIVE: booleanFlag.default(false),
  /** Imagem do motor (`infra/docker/python-completo.Dockerfile`). O motor nunca baixa imagem (`--pull=never`). */
  RUNNER_NATIVE_IMAGE: z.string().min(1).default("levelusp/python-completo:local"),
  /** Binário do Docker (nome no PATH ou caminho). */
  DOCKER_BIN: z.string().min(1).default("docker"),
  /** Contêineres prontos esperando um lote (cada um segura a memória do interpretador e das bibliotecas importadas). */
  RUNNER_NATIVE_WARM: z.coerce.number().int().min(0).max(16).default(1),
  /** Teto de memória de cada contêiner (MB), sem swap. O PyTorch importado ocupa ~250 MB. */
  RUNNER_NATIVE_MEMORY_MB: z.coerce.number().int().min(128).max(16_384).default(1_024),
  /** CPUs de cada contêiner (pode ser fração). */
  RUNNER_NATIVE_CPUS: z.coerce.number().min(0.25).max(16).default(1),
  /** Processos e threads simultâneos por contêiner (barra fork bomb). */
  RUNNER_NATIVE_PIDS_LIMIT: z.coerce.number().int().min(8).max(1_024).default(64),
  /** Prazo para um contêiner novo ficar pronto (partida do gVisor + importações). */
  RUNNER_NATIVE_BOOT_TIMEOUT_MS: z.coerce.number().int().min(2_000).max(300_000).default(60_000),
  /** Módulos importados no aquecimento, separados por vírgula (os que a imagem não tiver são ignorados). */
  RUNNER_NATIVE_PRELOAD: z.string().default("numpy,pandas").transform((value) => value.split(",").map((name) => name.trim()).filter((name) => name !== "")),
  /** Script de partida do contêiner; ausente = `native_bootstrap.py` ao lado do harness. */
  NATIVE_BOOTSTRAP_PATH: z.string().optional(),
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

/**
 * Limite de memória visto pelo processo, em MB: o do cgroup do contêiner quando existe
 * (`process.constrainedMemory()` > 0 e menor que a máquina), senão a memória total da máquina.
 */
export function detectMemoryLimitMb(): number {
  const total = os.totalmem()
  const constrained = process.constrainedMemory()
  return Math.floor((constrained > 0 && constrained < total ? constrained : total) / BYTES_PER_MIB)
}

/**
 * Orçamento de memória para instâncias (MB): o limite (`RUNNER_MEMORY` ou o detectado) menos
 * a reserva (`RUNNER_MEMORY_RESERVE_MB`), nunca negativo; `Infinity` com `RUNNER_MEMORY=unlimited`.
 */
export function resolveMemoryBudgetMb(config: Pick<RunnerConfig, "RUNNER_MEMORY" | "RUNNER_MEMORY_RESERVE_MB">, detectedLimitMb: number = detectMemoryLimitMb()): number {
  return Math.max(0, (config.RUNNER_MEMORY ?? detectedLimitMb) - config.RUNNER_MEMORY_RESERVE_MB)
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
