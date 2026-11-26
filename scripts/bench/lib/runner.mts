/**
 * Cliente do executor (runner) para as medições: `/healthz`, `/v1/stats` (tempos por job e fila)
 * e `/v1/run` direto. O token vem SEMPRE do ambiente (`RUNNER_TOKEN`), nunca do código.
 */

/** Tempos de um job concluído, como o executor os expõe em `/v1/stats`. */
export interface JobTiming {
  at: number
  queueMs: number
  execMs: number
  batches: number
}

/** Subconjunto de `GET /v1/stats` que as medições usam. */
export interface RunnerStats {
  now: number
  capacity: number
  maxQueue: number
  active: number
  pending: number
  peakPending: number
  jobs: { completed: number; rejected: number; cancelled: number; failed: number }
  recent: JobTiming[]
  engines: Record<string, Record<string, unknown>>
  /** Memória reservada pelo executor (campo novo; ausente em executores antigos). */
  memory?: Record<string, unknown>
}

/** Resposta de `POST /v1/run` (só o que as medições leem). */
export interface RunResult {
  ok: boolean
  status: number
  ms: number
  durationMs: number | null
  engine: { python: string; runtime: string } | null
  error: string | null
}

/** Pedido mínimo de execução direta no executor. */
export interface DirectJob {
  code: string
  runtime: "python" | "python-dados"
  libraries?: string[]
  timeoutMs?: number
  memoryMb?: number
}

/** Lê `RUNNER_TOKEN` do ambiente. @throws Error com a instrução quando falta. */
export function requireRunnerToken(env: NodeJS.ProcessEnv = process.env): string {
  const token = env.RUNNER_TOKEN
  if (!token) {
    throw new Error("RUNNER_TOKEN não definido no ambiente (use o mesmo valor do executor em execução; em dev está em infra/compose/compose.dev.yml ou no seu .env).")
  }
  return token
}

/** Cliente do executor. */
export class RunnerClient {
  readonly baseUrl: string
  private readonly token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "")
    this.token = token
  }

  /** `GET /healthz`: `ok` quando 200; `pyodide` traz o estado do motor de dados. */
  async health(): Promise<{ ok: boolean; body: Record<string, unknown> | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, { signal: AbortSignal.timeout(3_000) })
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
      return { ok: response.ok, body }
    } catch {
      return { ok: false, body: null }
    }
  }

  /** Espera `/healthz` responder 200 (ou o prazo acabar). */
  async waitHealthy(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if ((await this.health()).ok) return true
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    return false
  }

  /** `GET /v1/stats`; `null` quando a rota não existe (executor antigo), o token não vale ou há falha de rede. */
  async stats(): Promise<RunnerStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/stats`, { headers: { authorization: `Bearer ${this.token}` }, signal: AbortSignal.timeout(3_000) })
      if (!response.ok) return null
      return (await response.json()) as RunnerStats
    } catch {
      return null
    }
  }

  /** `POST /v1/run` com um lote trivial de uma sonda `run` (executa o `main.py` e captura a saída). */
  async run(job: DirectJob): Promise<RunResult> {
    const body = {
      files: [{ path: "main.py", content: job.code }],
      entry: "main.py",
      probes: [{ id: "piso", kind: "run", stdin: "" }],
      limits: { timeoutMs: job.timeoutMs ?? 15_000, memoryMb: job.memoryMb ?? 128 },
      runtime: job.runtime,
      ...(job.libraries ? { libraries: job.libraries } : {}),
    }
    const startedAt = performance.now()
    try {
      const response = await fetch(`${this.baseUrl}/v1/run`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      })
      const parsed = (await response.json().catch(() => null)) as { durationMs?: number; engine?: { python: string; runtime: string }; error?: string } | null
      return {
        ok: response.ok,
        status: response.status,
        ms: performance.now() - startedAt,
        durationMs: typeof parsed?.durationMs === "number" ? parsed.durationMs : null,
        engine: parsed?.engine ?? null,
        error: response.ok ? null : (parsed?.error ?? `HTTP ${response.status}`),
      }
    } catch {
      return { ok: false, status: 0, ms: performance.now() - startedAt, durationMs: null, engine: null, error: "falha de rede" }
    }
  }
}

/** Instante (relógio do executor) do job mais recente em `stats`, ou 0 quando ainda não há jobs. */
export function lastJobAt(stats: RunnerStats | null): number {
  const last = stats?.recent.at(-1)
  return last?.at ?? 0
}

/** Jobs concluídos DEPOIS de `afterAt` (relógio do executor), do mais antigo ao mais novo. */
export function jobsAfter(stats: RunnerStats | null, afterAt: number): JobTiming[] {
  return stats ? stats.recent.filter((job) => job.at > afterAt) : []
}

/** Workers Pyodide aquecidos (prontos) do perfil `dados` ou `ml`; `null` se o executor não informa. */
export function warmWorkers(stats: RunnerStats | null, profile: "dados" | "ml"): number | null {
  const warm = stats?.engines.pyodide?.warm
  if (typeof warm !== "object" || warm === null) return null
  const count = (warm as Record<string, unknown>)[profile]
  return typeof count === "number" ? count : null
}
