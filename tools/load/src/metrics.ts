/** Percentis de uma amostra de latências (ms). */
export interface Percentiles {
  count: number
  mean: number
  p50: number
  p95: number
  p99: number
  max: number
}

/**
 * Percentil pelo método do posto mais próximo (sem interpolação): o valor devolvido
 * sempre é uma observação real. Amostra vazia devolve 0.
 *
 * @param sorted amostra em ordem crescente.
 * @param percentile entre 0 e 100.
 */
export function percentileOf(sorted: readonly number[], percentile: number): number {
  if (sorted.length === 0) return 0
  const rank = Math.ceil((percentile / 100) * sorted.length)
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1] ?? 0
}

/** Resumo (média, p50, p95, p99, máximo) de uma amostra em qualquer ordem. */
export function summarize(values: readonly number[]): Percentiles {
  const sorted = [...values].sort((a, b) => a - b)
  const total = sorted.reduce((sum, value) => sum + value, 0)
  return {
    count: sorted.length,
    mean: sorted.length ? round(total / sorted.length) : 0,
    p50: round(percentileOf(sorted, 50)),
    p95: round(percentileOf(sorted, 95)),
    p99: round(percentileOf(sorted, 99)),
    max: round(sorted.at(-1) ?? 0),
  }
}

/** Arredonda para 1 casa decimal (ms). */
export function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const STATIC_CHUNK_PATTERN = /^\/_next\/static\/.*/
const PYODIDE_PATTERN = /^\/pyodide\/[^/]+\/(.+)$/

/**
 * Rótulo estável do endpoint: troca ids por `:id`, junta os *chunks* do Next num só rótulo
 * e remove a query (fica só a rota). Ex.: `GET /api/lessons/<uuid>/snapshot` →
 * `GET /api/lessons/:id/snapshot`.
 */
export function endpointLabel(method: string, path: string): string {
  const [route = ""] = path.split("?")
  if (STATIC_CHUNK_PATTERN.test(route)) return `${method} /_next/static/*`
  const pyodide = PYODIDE_PATTERN.exec(route)
  if (pyodide) return `${method} /pyodide/:versao/${pyodide[1] ?? ""}`
  return `${method} ${route.replace(UUID_PATTERN, ":id")}`
}

/** Uma requisição concluída (ou que falhou na rede: `status` 0). */
export interface RequestSample {
  endpoint: string
  status: number
  ms: number
  bytes: number
  /** Instante do fim (ms desde o início da medição). */
  at: number
  /** Código de erro da API (`RUNNER_BUSY`, `RATE_LIMITED`…), quando houver. */
  code?: string
}

/** Agregado de um endpoint para o relatório. */
export interface EndpointReport {
  endpoint: string
  latency: Percentiles
  statuses: Record<string, number>
  /** Fração de respostas com erro (status 0 ou ≥ 400, exceto 401 esperado). */
  errorRate: number
  bytesMean: number
}

/** Coleta as amostras de uma fase do teste (preparação ou medição). */
export class MetricsRecorder {
  private readonly samples: RequestSample[] = []

  constructor(private readonly startedAt: number = performance.now()) {}

  /** Registra uma requisição. `at` é calculado aqui (ms desde a criação do coletor). */
  record(sample: Omit<RequestSample, "at">): void {
    this.samples.push({ ...sample, at: performance.now() - this.startedAt })
  }

  /** Todas as amostras (cópia). */
  all(): RequestSample[] {
    return [...this.samples]
  }

  /** Agregado por endpoint, do mais chamado ao menos chamado. */
  byEndpoint(): EndpointReport[] {
    const groups = new Map<string, RequestSample[]>()
    for (const sample of this.samples) {
      const group = groups.get(sample.endpoint) ?? []
      group.push(sample)
      groups.set(sample.endpoint, group)
    }
    return [...groups.entries()]
      .map(([endpoint, group]) => endpointReport(endpoint, group))
      .sort((a, b) => b.latency.count - a.latency.count)
  }
}

/** Erro do ponto de vista da carga: rede (0) e 4xx/5xx, menos o 401 de quem não está logado. */
export function isErrorStatus(status: number): boolean {
  return status === 0 || (status >= 400 && status !== 401)
}

function endpointReport(endpoint: string, group: readonly RequestSample[]): EndpointReport {
  const statuses: Record<string, number> = {}
  for (const sample of group) {
    const key = sample.code ? `${sample.status} ${sample.code}` : String(sample.status)
    statuses[key] = (statuses[key] ?? 0) + 1
  }
  const errors = group.filter((sample) => isErrorStatus(sample.status)).length
  const bytes = group.reduce((sum, sample) => sum + sample.bytes, 0)
  return {
    endpoint,
    latency: summarize(group.map((sample) => sample.ms)),
    statuses,
    errorRate: round(errors / group.length, 4),
    bytesMean: Math.round(bytes / group.length),
  }
}
