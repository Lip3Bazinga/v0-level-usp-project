/** Caminhos do repositório, execução de comandos e descrição do ambiente de medição. */
import { execFile, spawn } from "node:child_process"
import os from "node:os"
import path from "node:path"
import { setTimeout as sleepTimer } from "node:timers/promises"

/** Raiz do repositório (`scripts/bench/lib` → três níveis acima). */
export const REPO_ROOT = path.resolve(import.meta.dirname, "../../..")
/** Pasta dos CSVs e do JSON do ambiente. */
export const DATA_DIR = path.join(REPO_ROOT, "docs", "tcc", "dados")
/** Pacote de conteúdo compilado (`pnpm content:build`), versionado no repositório. */
export const DEFAULT_BUNDLE = path.join(REPO_ROOT, "packages", "db", "seed", "trilha-python-ia.json")

/** Espera `ms` milissegundos; com `signal`, a espera acaba (sem erro) quando ele é abortado. */
export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  try {
    await sleepTimer(ms, undefined, signal ? { signal } : {})
  } catch {
    // Abortado: quem chama confere `signal.aborted`.
  }
}

/** Resultado de um comando terminado. */
export interface CommandResult {
  ok: boolean
  stdout: string
  stderr: string
}

/**
 * Executa um programa SEM shell (os argumentos não são reinterpretados).
 * Nunca rejeita: falha devolve `ok: false` com a saída de erro.
 */
export function runProgram(program: string, args: readonly string[], options: { timeoutMs?: number; env?: NodeJS.ProcessEnv; cwd?: string } = {}): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      program,
      [...args],
      { timeout: options.timeoutMs ?? 120_000, env: options.env ?? process.env, cwd: options.cwd ?? REPO_ROOT, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => resolve({ ok: error === null, stdout: String(stdout), stderr: String(stderr) }),
    )
  })
}

/**
 * Executa um comando de shell (`pnpm …` ou o comando de reinício dado pelo operador).
 * Saída padrão e de erro vão para o terminal; devolve o código de saída.
 */
export function runShell(command: string, options: { env?: NodeJS.ProcessEnv; cwd?: string } = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: "inherit", env: options.env ?? process.env, cwd: options.cwd ?? REPO_ROOT, windowsHide: true })
    child.on("error", reject)
    child.on("close", (code) => resolve(code ?? 1))
  })
}

/** Instante ISO 8601 atual (UTC). */
export function nowIso(): string {
  return new Date().toISOString()
}

/** Descrição do ambiente: hardware, versões e commit. Sem nome de máquina nem de usuário. */
export interface EnvironmentInfo {
  coletado_em: string
  so: string
  cpu_modelo: string
  cpu_logicas: number
  memoria_total_gib: number
  node: string
  docker_servidor: string | null
  docker_cpus: number | null
  docker_memoria_gib: number | null
  commit: string | null
}

/** Coleta o ambiente local (hardware do host e recursos que o Docker enxerga). */
export async function collectEnvironment(): Promise<EnvironmentInfo> {
  const cpus = os.cpus()
  const docker = await runProgram("docker", ["info", "--format", "{{.ServerVersion}}|{{.NCPU}}|{{.MemTotal}}"], { timeoutMs: 20_000 })
  const [server, ncpu, memory] = docker.ok ? docker.stdout.trim().split("|") : []
  const git = await runProgram("git", ["rev-parse", "--short", "HEAD"], { timeoutMs: 10_000 })
  return {
    coletado_em: nowIso(),
    so: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu_modelo: cpus[0]?.model.trim() ?? "desconhecido",
    cpu_logicas: cpus.length,
    memoria_total_gib: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    node: process.version,
    docker_servidor: server ?? null,
    docker_cpus: ncpu ? Number(ncpu) : null,
    docker_memoria_gib: memory ? Math.round((Number(memory) / 1024 ** 3) * 10) / 10 : null,
    commit: git.ok ? git.stdout.trim() : null,
  }
}

/** Número aleatório uniforme em [min, max). `random` é injetável para o teste ser repetível. */
export function randomBetween(min: number, max: number, random: () => number = Math.random): number {
  return min + random() * (max - min)
}

/** Gerador pseudoaleatório determinístico (mulberry32), para `--semente`. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
