import { spawn } from "node:child_process"
import { chmod, copyFile, lstat, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { DEFAULT_RUNNER_LIMITS, type Probe, type ProbeObservation, type ProjectFile, type RunnerLimits } from "@levelusp/contracts"
import type { Engine, EngineBatch, EngineCost, EngineReadiness, EngineStats, EngineVersions } from "./engine.js"
import { collectObservations, parseObservations, prepareGuestJob, type GuestJob } from "./observations.js"

export { jsonNestingDepth, parseObservations } from "./observations.js"

/** Versões informadas pelo motor WASI na resposta de cada job. */
export const WASI_ENGINE: EngineVersions = { python: "3.14.0 (WASI)", runtime: "wasmtime 49" }

/** Caminhos do Wasmtime, do CPython WASI e do harness, a pasta de trabalho temporária e a cota de disco. */
export interface SandboxOptions {
  wasmtimeBin: string
  pythonDir: string
  harnessPath: string
  workDir: string
  /** Teto de bytes gravados no projeto por um lote (padrão: `DEFAULT_JOB_DISK_BYTES`). */
  maxJobDiskBytes?: number
  /** Peso de um lote no orçamento de memória, em MB (padrão 0: o processo é curto e cabe na reserva). */
  memoryMb?: number
  /**
   * Chamado quando o convidado termina sem produzir NENHUMA observação (falha do próprio
   * Wasmtime, módulo incompatível, caminho errado…): o aluno vê só a mensagem genérica,
   * e sem este log o operador não descobre a causa.
   */
  onGuestFailure?: (details: GuestFailure) => void
}

/** Diagnóstico de um lote que não produziu observações: o que o Wasmtime escreveu em stderr. */
export interface GuestFailure {
  stderr: string
  timedOut: boolean
  overflowed: boolean
  diskExceeded: boolean
}

/** Quanto do stderr do convidado vai para o log (o resto é só traceback repetido). */
const LOGGED_STDERR_CHARS = 2_000

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
  /** O host matou o processo por excesso de disco (bytes ou arquivos no projeto). */
  diskExceeded: boolean
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
const READ_ONLY_FILE = 0o444
const READ_ONLY_DIR = 0o555
const WRITABLE_DIR = 0o755
const HARNESS_FILE = "harness.py"
/**
 * Só as mensagens que o Wasmtime emite ao estourar o tempo de parede ("wasm trap: interrupt")
 * ou o fuel. Um padrão mais largo classificava como "tempo excedido" até um `.cwasm`
 * incompatível ("compiled without epoch interruption"), escondendo a causa real.
 */
const TIMEOUT_STDERR_PATTERN = /wasm trap: interrupt|all fuel consumed|epoch deadline/i
/** Cota padrão de disco por lote: com 2 lotes simultâneos cabe folgado no tmpfs de 256 MB do container. */
export const DEFAULT_JOB_DISK_BYTES = 32 * BYTES_PER_MIB
/** Arquivos + pastas no projeto: acima disso o lote é morto (criação em massa de arquivos). */
const MAX_JOB_ENTRIES = 2_000
/** Intervalo da medição do disco do lote (o convidado grava ~250 MB/s: estouro máximo ≈ 25 MB). */
const DISK_POLL_MS = 100

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
 *
 * É o motor `python` do executor (`Engine`): `readiness` reflete o autoteste da
 * partida e `stats` conta lotes, tempos e falhas.
 */
export class WasmtimeSandbox implements Engine {
  readonly name = "wasi"
  readonly versions: EngineVersions = { ...WASI_ENGINE }
  readonly readiness: EngineReadiness = { ready: false, reason: "autoteste pendente" }
  private readonly counters = { batches: 0, timedOut: 0, overflowed: 0, diskExceeded: 0, withoutObservations: 0 }

  constructor(private readonly options: SandboxOptions) {}

  /** O motor WASI atende qualquer pedido: as bibliotecas só importam ao Pyodide. */
  accept(): void {
    return undefined
  }

  /** Classe única (`wasi`), com o peso configurado para o perfil `python` (padrão 0: fora do orçamento). */
  cost(): EngineCost {
    return { key: "wasi", memoryMb: this.options.memoryMb ?? 0 }
  }

  /** Cada lote sobe um processo novo (~130 ms); não há pool para aquecer. */
  warmupMs(): number {
    return 0
  }

  run(batch: EngineBatch): Promise<ProbeObservation[]> {
    return this.runBatch(batch)
  }

  stats(): EngineStats {
    return { ...this.counters }
  }

  /**
   * Autoteste: roda um programa trivial pelo mesmo caminho dos jobs reais. Um `.cwasm`
   * compilado para outra CPU, um Wasmtime ausente ou uma stdlib fora do lugar derrubam
   * todas as correções com a mesma mensagem genérica para o aluno; aqui isso vira
   * `readiness.ready = false` com o motivo (`/healthz` 503, que o compose e a API enxergam).
   */
  async selfTest(): Promise<void> {
    try {
      const observations = await this.runBatch({
        files: [{ path: "main.py", content: 'print("levelusp-autoteste")\n' }],
        entry: "main.py",
        probes: [{ kind: "run", id: "autoteste", stdin: "" }],
        limits: { ...DEFAULT_RUNNER_LIMITS },
      })
      const observation = observations[0]
      const isHealthy = observation?.ok === true && observation.stdout?.includes("levelusp-autoteste") === true
      this.readiness.ready = isHealthy
      this.readiness.reason = isHealthy ? "" : (observation?.error ?? "sem observação")
    } catch (error) {
      this.readiness.ready = false
      this.readiness.reason = error instanceof Error ? error.message : String(error)
    }
  }

  async runBatch({ files, entry, probes, limits }: SandboxBatch): Promise<ProbeObservation[]> {
    const directories = await this.createJobDirectories()
    try {
      await this.writeJobFiles(directories, files)
      const guestJob = prepareGuestJob(probes, entry)
      const guestRun = await this.spawnWasmtime(directories, guestJob, limits)
      this.record(guestRun)
      const observed = parseObservations(guestRun.stdout, guestJob.nonce)
      if (observed.size === 0 && probes.length > 0) {
        this.counters.withoutObservations++
        this.options.onGuestFailure?.({
          stderr: guestRun.stderr.slice(0, LOGGED_STDERR_CHARS),
          timedOut: guestRun.timedOut,
          overflowed: guestRun.overflowed,
          diskExceeded: guestRun.diskExceeded,
        })
      }
      return collectObservations(probes, observed, guestRun)
    } finally {
      await chmod(directories.harnessDir, WRITABLE_DIR).catch(() => undefined)
      await rm(directories.root, { recursive: true, force: true })
    }
  }

  private record(guestRun: GuestRun): void {
    this.counters.batches++
    if (guestRun.timedOut) this.counters.timedOut++
    if (guestRun.overflowed) this.counters.overflowed++
    if (guestRun.diskExceeded) this.counters.diskExceeded++
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

  private spawnWasmtime(directories: JobDirectories, guestJob: GuestJob, limits: RunnerLimits): Promise<GuestRun> {
    const args = buildWasmtimeArgs({ pythonDir: this.options.pythonDir, harnessDir: directories.harnessDir, workDir: directories.workDir }, limits)
    const maxDiskBytes = this.options.maxJobDiskBytes ?? DEFAULT_JOB_DISK_BYTES
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
      let diskExceeded = false
      let isMeasuringDisk = false
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
      // Cota de disco do lote: o WASI não limita o tamanho dos arquivos, e o tmpfs é
      // dividido com os lotes simultâneos de outros alunos.
      const diskTimer = setInterval(() => {
        if (isMeasuringDisk) return
        isMeasuringDisk = true
        void isWithinDiskQuota(directories.workDir, maxDiskBytes).then((isWithin) => {
          isMeasuringDisk = false
          if (isWithin) return
          diskExceeded = true
          child.kill("SIGKILL")
        })
      }, DISK_POLL_MS)
      const stopTimers = (): void => {
        clearTimeout(hostTimer)
        clearInterval(diskTimer)
      }
      child.on("error", (error) => {
        stopTimers()
        reject(error)
      })
      child.on("close", () => {
        stopTimers()
        const timedOut = killedByHost || TIMEOUT_STDERR_PATTERN.test(stderr)
        resolve({ timedOut, stderr, stdout: Buffer.concat(stdoutChunks).toString("utf8"), overflowed, diskExceeded })
      })
    })
  }
}

/** Caminhos que o convidado recebe: stdlib, harness (somente leitura) e projeto. */
export interface GuestMounts {
  pythonDir: string
  harnessDir: string
  workDir: string
}

/**
 * Argumentos do Wasmtime para um lote: fuel (CPU), memória linear, tempo de parede,
 * WASI sem ambiente, sem rede (nem DNS) e só três diretórios.
 */
export function buildWasmtimeArgs({ pythonDir, harnessDir, workDir }: GuestMounts, limits: RunnerLimits): string[] {
  const budgetSeconds = limits.timeoutMs / 1000
  return [
    "run",
    "--allow-precompiled",
    // O módulo já vem pré-compilado: sem isto o Wasmtime 49 tenta criar ~/.cache/wasmtime
    // e aborta no contêiner com sistema de arquivos somente leitura.
    "-C", "cache=n",
    "-W", [
      `fuel=${Math.round(FUEL_PER_SECOND * budgetSeconds)}`,
      `max-memory-size=${limits.memoryMb * BYTES_PER_MIB}`,
      `timeout=${limits.timeoutMs}ms`,
    ].join(","),
    "-S", "inherit-env=n,inherit-network=n,tcp=n,udp=n,allow-ip-name-lookup=n",
    "--dir", `${path.join(pythonDir, "lib")}::/lib`,
    "--dir", `${harnessDir}::/harness`,
    "--dir", `${workDir}::/work`,
    path.join(pythonDir, "python.cwasm"),
    "-I", "-S", `/harness/${HARNESS_FILE}`,
  ]
}

/**
 * Mede o projeto do lote (sem seguir links) e para assim que passa da cota de
 * bytes ou de `MAX_JOB_ENTRIES` entradas. Pasta sumindo no meio (o harness restaura
 * arquivos entre sondas) não conta como estouro.
 */
export async function isWithinDiskQuota(root: string, maxBytes: number): Promise<boolean> {
  let bytes = 0
  let entries = 0
  const pending = [root]
  for (let directory = pending.pop(); directory !== undefined; directory = pending.pop()) {
    const children = await readdir(directory, { withFileTypes: true }).catch(() => [])
    for (const child of children) {
      entries++
      const childPath = path.join(directory, child.name)
      if (child.isDirectory()) pending.push(childPath)
      else bytes += await lstat(childPath).then((stats) => stats.size, () => 0)
      if (bytes > maxBytes || entries > MAX_JOB_ENTRIES) return false
    }
  }
  return true
}

/** Junta um caminho relativo do aluno ao diretório do projeto, recusando fugas. */
export function safeJoin(base: string, relativePath: string): string {
  const target = path.resolve(base, relativePath)
  if (!target.startsWith(base + path.sep)) throw new Error(`Caminho inválido: ${relativePath}`)
  return target
}
