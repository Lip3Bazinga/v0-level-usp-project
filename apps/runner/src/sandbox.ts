import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { chmod, copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { STRICT_PROBE_KINDS, type Probe, type ProbeObservation, type ProjectFile, type RunnerLimits } from "@levelusp/contracts"

/** Caminhos do Wasmtime, do CPython WASI e do harness, e a pasta de trabalho temporária. */
export interface SandboxOptions {
  wasmtimeBin: string
  pythonDir: string
  harnessPath: string
  workDir: string
}

/** Um lote de sondas rodado numa única instância isolada do interpretador. */
export interface SandboxBatch {
  files: ProjectFile[]
  entry: string
  probes: Probe[]
  limits: RunnerLimits
}

interface GuestRun {
  stdout: string
  stderr: string
  timedOut: boolean
  /** O host matou o processo por excesso de saída. */
  overflowed: boolean
}

interface JobDirectories {
  root: string
  harnessDir: string
  workDir: string
}

/** Unidades de fuel por segundo de orçamento (calibrado: laço de 10⁶ ≈ 2–5×10⁹). */
const FUEL_PER_SECOND = 15_000_000_000
const MAX_STDERR_CHARS = 256 * 1024
/** Teto da saída padrão do convidado (observações + prints diretos no fd 1). */
const MAX_STDOUT_BYTES = 8 * 1024 * 1024
/** Folga do backstop do host além do timeout interno do Wasmtime. */
const HOST_KILL_GRACE_MS = 2_000
const BYTES_PER_MIB = 1024 * 1024
const NONCE_BYTES = 16
const READ_ONLY_FILE = 0o444
const READ_ONLY_DIR = 0o555
const WRITABLE_DIR = 0o755
const HARNESS_FILE = "harness.py"
const TIMEOUT_STDERR_PATTERN = /fuel|interrupt|timed out|deadline/i

/** O que o harness lê da entrada padrão (antes de qualquer código do aluno). */
interface GuestJob {
  nonce: string
  entry: string
  strict: boolean
  probes: Probe[]
}

/**
 * Executa um lote de sondas numa instância CPython WASI nova.
 *
 * Capacidades concedidas ao convidado: só /lib (stdlib), /harness (o harness,
 * somente leitura) e /work (projeto do aluno). O lote (nonce + sondas) entra
 * pela entrada padrão, que o harness esgota antes de rodar o código do aluno:
 * nada disso fica em disco nem em argv. As sondas viajam com ids posicionais
 * (`p0`, `p1`...), então nem o id do caso chega ao sandbox. As observações
 * voltam pela saída padrão, prefixadas pelo nonce. Sem variáveis de ambiente,
 * sem rede, sem processos. Tempo de parede, fuel (CPU) e memória são limitados.
 */
export class WasmtimeSandbox {
  constructor(private readonly options: SandboxOptions) {}

  async runBatch({ files, entry, probes, limits }: SandboxBatch): Promise<ProbeObservation[]> {
    const directories = await this.createJobDirectories()
    try {
      await this.writeJobFiles(directories, files)
      const nonce = randomBytes(NONCE_BYTES).toString("hex")
      const guestJob: GuestJob = {
        nonce,
        entry,
        strict: probes.some((probe) => STRICT_PROBE_KINDS.has(probe.kind)),
        probes: probes.map((probe, index) => ({ ...probe, id: positionalId(index) })),
      }
      const guestRun = await this.spawnWasmtime(directories, guestJob, limits)
      const observed = parseObservations(guestRun.stdout, nonce)
      return probes.map((probe, index) => {
        const observation = observed.get(positionalId(index))
        return observation ? { ...observation, id: probe.id } : missingObservation(probe.id, guestRun)
      })
    } finally {
      await chmod(directories.harnessDir, WRITABLE_DIR).catch(() => undefined)
      await rm(directories.root, { recursive: true, force: true })
    }
  }

  private async createJobDirectories(): Promise<JobDirectories> {
    const root = await mkdtemp(path.join(this.options.workDir, "lvl-job-"))
    return { root, harnessDir: path.join(root, "harness"), workDir: path.join(root, "work") }
  }

  private async writeJobFiles({ harnessDir, workDir }: JobDirectories, files: ProjectFile[]): Promise<void> {
    await mkdir(harnessDir)
    await mkdir(workDir)
    for (const file of files) {
      const target = safeJoin(workDir, file.path)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, file.content, "utf8")
    }
    await copyFile(this.options.harnessPath, path.join(harnessDir, HARNESS_FILE))
    // Harness somente leitura para o convidado (o executor roda sem root).
    await chmod(path.join(harnessDir, HARNESS_FILE), READ_ONLY_FILE)
    await chmod(harnessDir, READ_ONLY_DIR)
  }

  private wasmtimeArgs({ harnessDir, workDir }: JobDirectories, limits: RunnerLimits): string[] {
    const budgetSeconds = limits.timeoutMs / 1000
    return [
      "run",
      "--allow-precompiled",
      "-W", [
        `fuel=${Math.round(FUEL_PER_SECOND * budgetSeconds)}`,
        `max-memory-size=${limits.memoryMb * BYTES_PER_MIB}`,
        `timeout=${limits.timeoutMs}ms`,
      ].join(","),
      "-S", "inherit-env=n,inherit-network=n,tcp=n,udp=n",
      "--dir", `${path.join(this.options.pythonDir, "lib")}::/lib`,
      "--dir", `${harnessDir}::/harness`,
      "--dir", `${workDir}::/work`,
      path.join(this.options.pythonDir, "python.cwasm"),
      "-I", "-S", `/harness/${HARNESS_FILE}`,
    ]
  }

  private spawnWasmtime(directories: JobDirectories, guestJob: GuestJob, limits: RunnerLimits): Promise<GuestRun> {
    const args = this.wasmtimeArgs(directories, limits)
    return new Promise((resolve, reject) => {
      // Ambiente vazio: nada do processo do executor chega ao convidado.
      const child = spawn(this.options.wasmtimeBin, args, { env: {}, stdio: ["pipe", "pipe", "pipe"] })
      // Se o convidado morrer antes de ler tudo, o EPIPE não pode derrubar o executor.
      child.stdin.on("error", () => undefined)
      child.stdin.end(JSON.stringify(guestJob), "utf8")
      const stdoutChunks: Buffer[] = []
      let stdoutBytes = 0
      let stderr = ""
      let killedByHost = false
      let overflowed = false
      child.stdout.on("data", (chunk: Buffer) => {
        stdoutBytes += chunk.length
        if (stdoutBytes > MAX_STDOUT_BYTES) {
          // Proteção contra inundação de saída: corta e mata o processo.
          overflowed = true
          child.kill("SIGKILL")
          return
        }
        stdoutChunks.push(chunk)
      })
      child.stderr.on("data", (chunk: Buffer) => {
        if (stderr.length < MAX_STDERR_CHARS) stderr += chunk.toString("utf8")
      })
      // Backstop do host: se o timeout interno do Wasmtime falhar, mata o processo.
      const hostTimer = setTimeout(() => {
        killedByHost = true
        child.kill("SIGKILL")
      }, limits.timeoutMs + HOST_KILL_GRACE_MS)
      child.on("error", (error) => {
        clearTimeout(hostTimer)
        reject(error)
      })
      child.on("close", () => {
        clearTimeout(hostTimer)
        const timedOut = killedByHost || TIMEOUT_STDERR_PATTERN.test(stderr)
        resolve({ timedOut, stderr, stdout: Buffer.concat(stdoutChunks).toString("utf8"), overflowed })
      })
    })
  }
}

/** Junta um caminho relativo do aluno ao diretório do projeto, recusando fugas. */
export function safeJoin(base: string, relativePath: string): string {
  const target = path.resolve(base, relativePath)
  if (!target.startsWith(base + path.sep)) throw new Error(`Caminho inválido: ${relativePath}`)
  return target
}

function isObservation(value: unknown): value is ProbeObservation {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"
}

function positionalId(index: number): string {
  return `p${index}`
}

/**
 * Aceita só linhas com o nonce desta execução. O harness emite exatamente uma
 * observação por sonda: uma segunda linha com o mesmo id só pode ter vindo de
 * quem descobriu o nonce, então a sonda inteira é invalidada.
 */
export function parseObservations(stdout: string, nonce: string): Map<string, ProbeObservation> {
  const observations = new Map<string, ProbeObservation>()
  const duplicated = new Set<string>()
  const prefix = `${nonce} `
  for (const line of stdout.split("\n")) {
    if (!line.startsWith(prefix)) continue
    const observation = parseJsonLine(line.slice(prefix.length))
    if (!isObservation(observation)) continue
    if (observations.has(observation.id)) duplicated.add(observation.id)
    else observations.set(observation.id, observation)
  }
  for (const id of duplicated) observations.set(id, { id, ok: false, error: "Observação duplicada: resultado descartado." })
  return observations
}

/** Linha corrompida (ex.: escrita interrompida pelo timeout) vira undefined e é ignorada. */
function parseJsonLine(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function missingObservation(probeId: string, guestRun: GuestRun): ProbeObservation {
  if (guestRun.overflowed) return { id: probeId, ok: false, error: "Saída grande demais: o programa imprimiu dados demais." }
  if (guestRun.timedOut) return { id: probeId, ok: false, timedOut: true, error: "Tempo limite excedido (verifique laços infinitos)." }
  return { id: probeId, ok: false, error: describeCrash(guestRun.stderr) }
}

function describeCrash(stderr: string): string {
  if (/memory|out of bounds|grow/i.test(stderr)) return "Memória insuficiente: o programa usou mais memória do que o permitido."
  if (/stack overflow|call stack exhausted|RecursionError/i.test(stderr)) return "Recursão profunda demais (estouro de pilha)."
  return "O programa terminou de forma inesperada."
}
