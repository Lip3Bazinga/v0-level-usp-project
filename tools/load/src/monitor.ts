import { readdirSync, readFileSync } from "node:fs"
import os from "node:os"
import pg from "pg"
import { request } from "undici"
import { round, summarize, type Percentiles } from "./metrics"

/** Tiques de CPU por segundo do Linux (USER_HZ; 100 em praticamente todo kernel). */
const CLOCK_TICKS_PER_SECOND = 100
const PAGE_BYTES = 4096
const BYTES_PER_MIB = 1024 * 1024

/** Leitura de /proc/<pid>/stat: pai, tempo de CPU (próprio e dos filhos já recolhidos) e RSS. */
export interface ProcStat {
  pid: number
  ppid: number
  /** utime + stime, em tiques. */
  cpuTicks: number
  /** cutime + cstime: filhos que já terminaram (ex.: cada Wasmtime do executor). */
  childCpuTicks: number
  rssBytes: number
}

/**
 * Interpreta uma linha de /proc/<pid>/stat. O nome do processo vem entre parênteses e pode
 * ter espaços, então os campos são contados a partir do último `)`.
 *
 * @returns null se a linha não tiver o formato esperado.
 */
export function parseProcStat(line: string): ProcStat | null {
  const close = line.lastIndexOf(")")
  const pid = Number.parseInt(line, 10)
  if (close < 0 || Number.isNaN(pid)) return null
  // Depois do ")": estado(3) ppid(4) … utime(14) stime(15) cutime(16) cstime(17) … rss(24).
  const fields = line.slice(close + 2).split(" ")
  const field = (position: number): number => Number(fields[position - 3] ?? Number.NaN)
  const values = [field(4), field(14), field(15), field(16), field(17), field(24)]
  if (values.some((value) => Number.isNaN(value))) return null
  return { pid, ppid: field(4), cpuTicks: field(14) + field(15), childCpuTicks: field(16) + field(17), rssBytes: field(24) * PAGE_BYTES }
}

function readAllProcStats(): ProcStat[] {
  const stats: ProcStat[] = []
  for (const entry of readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue
    try {
      const stat = parseProcStat(readFileSync(`/proc/${entry}/stat`, "utf8"))
      if (stat) stats.push(stat)
    } catch {
      // O processo terminou entre a listagem e a leitura.
    }
  }
  return stats
}

/** Soma de uma árvore de processos (raiz + descendentes vivos + filhos já recolhidos). */
export interface TreeSample {
  cpuTicks: number
  rssBytes: number
  processes: number
}

/** Soma a raiz e todos os descendentes vivos; inclui a CPU dos filhos já recolhidos pela raiz. */
export function sumProcessTree(all: readonly ProcStat[], rootPid: number): TreeSample | null {
  const childrenOf = new Map<number, ProcStat[]>()
  for (const stat of all) {
    const siblings = childrenOf.get(stat.ppid) ?? []
    siblings.push(stat)
    childrenOf.set(stat.ppid, siblings)
  }
  const root = all.find((stat) => stat.pid === rootPid)
  if (!root) return null
  const total: TreeSample = { cpuTicks: 0, rssBytes: 0, processes: 0 }
  const stack = [root]
  for (let current = stack.pop(); current; current = stack.pop()) {
    total.cpuTicks += current.cpuTicks + current.childCpuTicks
    total.rssBytes += current.rssBytes
    total.processes++
    stack.push(...(childrenOf.get(current.pid) ?? []))
  }
  return total
}

/** Uso de um processo monitorado durante a fase. */
export interface ProcessReport {
  name: string
  pid: number
  /** CPU média em % de UM núcleo (200% = 2 núcleos cheios). */
  cpuMeanPct: number
  /** Maior CPU num intervalo de amostragem. */
  cpuPeakPct: number
  /** Segundos de CPU gastos na fase. */
  cpuSeconds: number
  rssPeakMb: number
  /** Maior número de processos na árvore (executor: 1 + Wasmtimes simultâneos). */
  processesPeak: number
}

/** Ocupação do executor lida de `GET /v1/stats` durante a fase. */
export interface RunnerReport {
  capacity: number
  maxQueue: number
  /** Maior fila (lotes) vista nas amostras e o pico desde a partida. */
  pendingPeak: number
  pendingPeakSinceStart: number
  activeMean: number
  jobsCompleted: number
  jobsRejected: number
  jobsCancelled: number
  jobsFailed: number
  /** Espera na fila até o 1º lote começar. */
  queueMs: Percentiles
  /** Do 1º lote ao fim do job. */
  execMs: Percentiles
}

/** Consulta mais cara no PostgreSQL durante a fase (pg_stat_statements). */
export interface QueryReport {
  query: string
  calls: number
  totalMs: number
  meanMs: number
  rows: number
}

/** Uso da máquina inteira (todas as CPUs) na fase. */
export interface HostReport {
  cpus: number
  cpuMeanPct: number
  cpuPeakPct: number
  memoryTotalMb: number
  /** Gerador de carga (este processo): CPU média em % de um núcleo. */
  generatorCpuPct: number
  generatorCpuSeconds: number
}

/** O que o monitor junta ao fim da fase. */
export interface MonitorReport {
  host: HostReport
  processes: ProcessReport[]
  runner: RunnerReport | null
  queries: QueryReport[] | null
}

interface RunnerStatsSnapshot {
  now: number
  capacity: number
  maxQueue: number
  active: number
  pending: number
  peakPending: number
  jobs: { completed: number; rejected: number; cancelled: number; failed: number }
  recent: { at: number; queueMs: number; execMs: number; batches: number }[]
}

/** Onde o monitor lê o que acontece no servidor. Todos opcionais. */
export interface MonitorOptions {
  /** Processos a acompanhar (nome → pid). Só em Linux (/proc). */
  processes: Record<string, number>
  runnerUrl: string | null
  runnerToken: string | null
  pgUrl: string | null
  intervalMs: number
  /** Quantas consultas do pg_stat_statements entram no relatório. */
  topQueries: number
}

function cpuTimes(): { busy: number; total: number } {
  let busy = 0
  let total = 0
  for (const cpu of os.cpus()) {
    const { user, nice, sys, irq, idle } = cpu.times
    busy += user + nice + sys + irq
    total += user + nice + sys + irq + idle
  }
  return { busy, total }
}

/**
 * Amostra, a cada `intervalMs`, a CPU e a memória dos processos do servidor, a fila do
 * executor e a CPU do próprio gerador (que divide a máquina com o sistema medido).
 */
export class ServerMonitor {
  private timer: NodeJS.Timeout | null = null
  private readonly cpuSamples = new Map<string, number[]>()
  private readonly rssPeak = new Map<string, number>()
  private readonly processPeak = new Map<string, number>()
  private readonly lastTicks = new Map<string, number>()
  private readonly firstTicks = new Map<string, number>()
  private readonly hostSamples: number[] = []
  private readonly runnerPending: number[] = []
  private readonly runnerActive: number[] = []
  private runnerFirst: RunnerStatsSnapshot | null = null
  private runnerLast: RunnerStatsSnapshot | null = null
  private lastHost = cpuTimes()
  private lastSampleAt = performance.now()
  private readonly startedAt = performance.now()
  private readonly startedAtEpoch = Date.now()
  private readonly generatorStart = process.cpuUsage()

  constructor(private readonly options: MonitorOptions) {}

  /** Zera o pg_stat_statements (se configurado) e começa a amostrar. */
  async start(): Promise<void> {
    if (this.options.pgUrl) await this.withPg(this.options.pgUrl, (client) => client.query("SELECT pg_stat_statements_reset()"))
    this.runnerFirst = await this.readRunner()
    this.sampleProcesses(true)
    this.timer = setInterval(() => void this.sample(), this.options.intervalMs)
  }

  /** Para de amostrar e monta o relatório da fase. */
  async stop(): Promise<MonitorReport> {
    if (this.timer) clearInterval(this.timer)
    await this.sample()
    const elapsedSeconds = (performance.now() - this.startedAt) / 1000
    const generator = process.cpuUsage(this.generatorStart)
    const generatorSeconds = (generator.user + generator.system) / 1e6
    return {
      host: {
        cpus: os.availableParallelism(),
        cpuMeanPct: round(mean(this.hostSamples)),
        cpuPeakPct: round(Math.max(0, ...this.hostSamples)),
        memoryTotalMb: Math.round(os.totalmem() / BYTES_PER_MIB),
        generatorCpuPct: round((generatorSeconds / elapsedSeconds) * 100),
        generatorCpuSeconds: round(generatorSeconds),
      },
      processes: Object.entries(this.options.processes).map(([name, pid]) => this.processReport(name, pid)),
      runner: this.runnerReport(),
      queries: this.options.pgUrl ? await this.readQueries(this.options.pgUrl) : null,
    }
  }

  private async sample(): Promise<void> {
    this.sampleProcesses(false)
    const host = cpuTimes()
    const totalDelta = host.total - this.lastHost.total
    if (totalDelta > 0) this.hostSamples.push(((host.busy - this.lastHost.busy) / totalDelta) * 100 * os.cpus().length)
    this.lastHost = host
    const runner = await this.readRunner()
    if (runner) {
      this.runnerLast = runner
      this.runnerPending.push(runner.pending)
      this.runnerActive.push(runner.active)
    }
  }

  private sampleProcesses(initial: boolean): void {
    if (Object.keys(this.options.processes).length === 0 || process.platform !== "linux") return
    const now = performance.now()
    const seconds = (now - this.lastSampleAt) / 1000
    this.lastSampleAt = now
    const all = readAllProcStats()
    for (const [name, pid] of Object.entries(this.options.processes)) {
      const tree = sumProcessTree(all, pid)
      if (!tree) continue
      if (initial) this.firstTicks.set(name, tree.cpuTicks)
      const previous = this.lastTicks.get(name)
      if (!initial && previous !== undefined && seconds > 0) {
        const samples = this.cpuSamples.get(name) ?? []
        samples.push(((tree.cpuTicks - previous) / CLOCK_TICKS_PER_SECOND / seconds) * 100)
        this.cpuSamples.set(name, samples)
      }
      this.lastTicks.set(name, tree.cpuTicks)
      this.rssPeak.set(name, Math.max(this.rssPeak.get(name) ?? 0, tree.rssBytes))
      this.processPeak.set(name, Math.max(this.processPeak.get(name) ?? 0, tree.processes))
    }
  }

  private processReport(name: string, pid: number): ProcessReport {
    const elapsedSeconds = (performance.now() - this.startedAt) / 1000
    const usedTicks = (this.lastTicks.get(name) ?? 0) - (this.firstTicks.get(name) ?? 0)
    const cpuSeconds = usedTicks / CLOCK_TICKS_PER_SECOND
    return {
      name,
      pid,
      cpuMeanPct: round((cpuSeconds / elapsedSeconds) * 100),
      cpuPeakPct: round(Math.max(0, ...(this.cpuSamples.get(name) ?? []))),
      cpuSeconds: round(cpuSeconds),
      rssPeakMb: Math.round((this.rssPeak.get(name) ?? 0) / BYTES_PER_MIB),
      processesPeak: this.processPeak.get(name) ?? 0,
    }
  }

  private async readRunner(): Promise<RunnerStatsSnapshot | null> {
    if (!this.options.runnerUrl || !this.options.runnerToken) return null
    try {
      const response = await request(new URL("/v1/stats", this.options.runnerUrl), { headers: { authorization: `Bearer ${this.options.runnerToken}` } })
      if (response.statusCode !== 200) {
        await response.body.dump()
        return null
      }
      return (await response.body.json()) as RunnerStatsSnapshot
    } catch {
      return null
    }
  }

  private runnerReport(): RunnerReport | null {
    const first = this.runnerFirst
    const last = this.runnerLast
    if (!first || !last) return null
    const jobs = last.recent.filter((job) => job.at >= this.startedAtEpoch)
    return {
      capacity: last.capacity,
      maxQueue: last.maxQueue,
      pendingPeak: Math.max(0, ...this.runnerPending),
      pendingPeakSinceStart: last.peakPending,
      activeMean: round(mean(this.runnerActive), 2),
      jobsCompleted: last.jobs.completed - first.jobs.completed,
      jobsRejected: last.jobs.rejected - first.jobs.rejected,
      jobsCancelled: last.jobs.cancelled - first.jobs.cancelled,
      jobsFailed: last.jobs.failed - first.jobs.failed,
      queueMs: summarize(jobs.map((job) => job.queueMs)),
      execMs: summarize(jobs.map((job) => job.execMs)),
    }
  }

  private async readQueries(pgUrl: string): Promise<QueryReport[] | null> {
    try {
      return await this.withPg(pgUrl, async (client) => {
        const result = await client.query<{ query: string; calls: string; total: number; mean: number; rows: string }>(
          `SELECT query, calls, total_exec_time AS total, mean_exec_time AS mean, rows
             FROM pg_stat_statements
            WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
              AND query NOT ILIKE '%pg_stat_statements%'
            ORDER BY total_exec_time DESC
            LIMIT $1`,
          [this.options.topQueries],
        )
        return result.rows.map((row) => ({
          query: row.query.replace(/\s+/g, " ").slice(0, 400),
          calls: Number(row.calls),
          totalMs: round(row.total),
          meanMs: round(row.mean, 3),
          rows: Number(row.rows),
        }))
      })
    } catch {
      return null
    }
  }

  private async withPg<T>(url: string, work: (client: pg.Client) => Promise<T>): Promise<T> {
    const client = new pg.Client({ connectionString: url, application_name: "levelusp-load" })
    await client.connect()
    try {
      return await work(client)
    } finally {
      await client.end()
    }
  }
}

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}
