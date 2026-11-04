import { isErrorStatus, round, summarize, type EndpointReport, type Percentiles, type RequestSample } from "./metrics"
import type { MonitorReport } from "./monitor"
import type { VerifyOutcome } from "./student"

/** Os Verificar de uma fase, do ponto de vista do aluno. */
export interface VerifyReport {
  count: number
  passed: number
  /** Status final de cada clique (depois dos reenvios), com o código de erro quando houver. */
  statuses: Record<string, number>
  /** Do clique ao veredito, incluindo esperas e reenvios após 503/429. */
  clickToVerdict: Percentiles
  /** Só os cliques que terminaram em veredito (200). */
  clickToVerdictGraded: Percentiles
  /** Tempo no executor informado pela API (fila + execução no executor). */
  runnerMs: Percentiles
  retries: number
  /** Cliques que desistiram com 503/429/erro de rede depois de todos os reenvios. */
  gaveUp: number
}

/** Uma etapa do teste (um número de alunos). */
export interface StepReport {
  students: number
  /** Alunos em tempo real com a mesma taxa de requisições (N × compressão). */
  equivalentStudents: number
  seconds: number
  requests: number
  throughputRps: number
  errorRate: number
  rate429: number
  rate503: number
  failedLogins: number
  endpoints: EndpointReport[]
  verify: VerifyReport
  /** Rajada: segundos do início de cada onda até o último veredito. */
  waveMakespans: number[]
  /** Rajada: endpoints da preparação (cadastro e abertura da lição), fora da medição. */
  preparation: EndpointReport[] | null
  monitor: MonitorReport
}

/** Relatório completo gravado em JSON. */
export interface LoadReport {
  tool: "levelusp-load"
  scenario: string
  target: string
  startedAt: string
  finishedAt: string
  settings: Record<string, unknown>
  steps: StepReport[]
}

function rateOf(samples: readonly RequestSample[], predicate: (sample: RequestSample) => boolean): number {
  return samples.length ? round(samples.filter(predicate).length / samples.length, 4) : 0
}

/** Resume os Verificar de uma fase. */
export function verifyReport(outcomes: readonly VerifyOutcome[]): VerifyReport {
  const statuses: Record<string, number> = {}
  for (const outcome of outcomes) {
    const key = outcome.code ? `${outcome.status} ${outcome.code}` : String(outcome.status)
    statuses[key] = (statuses[key] ?? 0) + 1
  }
  const graded = outcomes.filter((outcome) => outcome.status === 200)
  return {
    count: outcomes.length,
    passed: outcomes.filter((outcome) => outcome.passed).length,
    statuses,
    clickToVerdict: summarize(outcomes.map((outcome) => outcome.totalMs)),
    clickToVerdictGraded: summarize(graded.map((outcome) => outcome.totalMs)),
    runnerMs: summarize(graded.flatMap((outcome) => (outcome.runnerMs === null ? [] : [outcome.runnerMs]))),
    retries: outcomes.reduce((sum, outcome) => sum + outcome.retries, 0),
    gaveUp: outcomes.filter((outcome) => outcome.status === 0 || outcome.status === 429 || outcome.status === 503).length,
  }
}

/** Monta a etapa a partir das amostras da fase e do monitor. */
export function stepReport(input: {
  students: number
  compression: number
  seconds: number
  samples: readonly RequestSample[]
  endpoints: EndpointReport[]
  verifications: readonly VerifyOutcome[]
  waveMakespans: number[]
  failedLogins: number
  preparation: EndpointReport[] | null
  monitor: MonitorReport
}): StepReport {
  const { samples } = input
  return {
    students: input.students,
    equivalentStudents: Math.round(input.students * input.compression),
    seconds: round(input.seconds),
    requests: samples.length,
    throughputRps: round(samples.length / Math.max(input.seconds, 0.001), 2),
    errorRate: rateOf(samples, (sample) => isErrorStatus(sample.status)),
    rate429: rateOf(samples, (sample) => sample.status === 429),
    rate503: rateOf(samples, (sample) => sample.status === 503),
    failedLogins: input.failedLogins,
    endpoints: input.endpoints,
    verify: verifyReport(input.verifications),
    waveMakespans: input.waveMakespans.map((seconds) => round(seconds, 2)),
    preparation: input.preparation,
    monitor: input.monitor,
  }
}

const percent = (fraction: number): string => `${round(fraction * 100, 2)}%`
const seconds = (ms: number): string => `${round(ms / 1000, 2)} s`

function endpointTable(endpoints: readonly EndpointReport[]): string[] {
  const lines = ["| Endpoint | n | p50 (ms) | p95 (ms) | p99 (ms) | máx (ms) | erros | status | bytes médios |", "|---|---:|---:|---:|---:|---:|---:|---|---:|"]
  for (const endpoint of endpoints) {
    const statuses = Object.entries(endpoint.statuses).map(([status, count]) => `${status}×${count}`).join(", ")
    const { latency } = endpoint
    lines.push(`| \`${endpoint.endpoint}\` | ${latency.count} | ${latency.p50} | ${latency.p95} | ${latency.p99} | ${latency.max} | ${percent(endpoint.errorRate)} | ${statuses} | ${endpoint.bytesMean} |`)
  }
  return lines
}

function processCell(step: StepReport, name: string): string {
  const process = step.monitor.processes.find((candidate) => candidate.name === name)
  return process ? `${process.cpuMeanPct}% / ${process.rssPeakMb} MB` : "—"
}

/** Resumo em Markdown (pt-BR) do relatório: visão geral por etapa e detalhes por endpoint. */
export function renderMarkdown(report: LoadReport): string {
  const lines: string[] = [
    `# Carga de turma — cenário \`${report.scenario}\``,
    "",
    `- Alvo: \`${report.target}\``,
    `- Início: ${report.startedAt} · fim: ${report.finishedAt}`,
    `- Parâmetros: \`${JSON.stringify(report.settings)}\``,
    "",
    "## Visão geral",
    "",
    "| Alunos | Equiv. tempo real | Duração | req/s | Verificar p50 | Verificar p95 | Verificar p99 | 503 | 429 | erros | Fila executor p95 | Execução p95 | CPU máquina | CPU gerador |",
    "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ]
  for (const step of report.steps) {
    const { verify, monitor } = step
    lines.push(
      `| ${step.students} | ${step.equivalentStudents} | ${step.seconds} s | ${step.throughputRps} | ${seconds(verify.clickToVerdict.p50)} | ${seconds(verify.clickToVerdict.p95)} | ${seconds(verify.clickToVerdict.p99)} | ${percent(step.rate503)} | ${percent(step.rate429)} | ${percent(step.errorRate)} | ${monitor.runner ? seconds(monitor.runner.queueMs.p95) : "—"} | ${monitor.runner ? seconds(monitor.runner.execMs.p95) : "—"} | ${monitor.host.cpuMeanPct}% (pico ${monitor.host.cpuPeakPct}%) | ${monitor.host.generatorCpuPct}% |`,
    )
  }
  lines.push("", "CPU em % de um núcleo (a máquina tem `cpus × 100%`). Verificar = do clique ao veredito, com reenvios.", "")
  lines.push("## Processos do servidor (CPU média / RSS de pico)", "", "| Alunos | api | web | runner | postgres |", "|---:|---|---|---|---|")
  for (const step of report.steps) lines.push(`| ${step.students} | ${processCell(step, "api")} | ${processCell(step, "web")} | ${processCell(step, "runner")} | ${processCell(step, "postgres")} |`)
  for (const step of report.steps) {
    const { verify, monitor } = step
    lines.push("", `## ${step.students} alunos`, "")
    lines.push(
      `- Verificar: ${verify.count} cliques, ${verify.passed} aprovados, ${verify.retries} reenvios, ${verify.gaveUp} desistências; status finais ${JSON.stringify(verify.statuses)}.`,
      `- Do clique ao veredito (só corrigidos): p50 ${seconds(verify.clickToVerdictGraded.p50)}, p95 ${seconds(verify.clickToVerdictGraded.p95)}, máx ${seconds(verify.clickToVerdictGraded.max)}; tempo no executor (API) p50 ${verify.runnerMs.p50} ms, p95 ${verify.runnerMs.p95} ms.`,
    )
    if (step.waveMakespans.length) lines.push(`- Ondas: última correção a ${step.waveMakespans.map((value) => `${value} s`).join(", ")} do início da onda.`)
    if (step.failedLogins) lines.push(`- Alunos sem sessão (cadastro/login recusados): ${step.failedLogins}.`)
    if (monitor.runner) {
      const runner = monitor.runner
      lines.push(
        `- Executor: capacidade ${runner.capacity}, fila máx. ${runner.maxQueue}; fila de pico ${runner.pendingPeak} lotes; ${runner.jobsCompleted} jobs, ${runner.jobsRejected} recusados (503), ${runner.jobsCancelled} cancelados; espera na fila p50 ${runner.queueMs.p50} ms / p95 ${runner.queueMs.p95} ms; execução p50 ${runner.execMs.p50} ms / p95 ${runner.execMs.p95} ms.`,
      )
    }
    lines.push("", ...endpointTable(step.endpoints))
    if (step.preparation) lines.push("", "Preparação (fora da medição):", "", ...endpointTable(step.preparation))
    if (monitor.queries?.length) {
      lines.push("", "Consultas mais caras (pg_stat_statements, tempo total na etapa):", "", "| Total (ms) | Chamadas | Média (ms) | Linhas | Consulta |", "|---:|---:|---:|---:|---|")
      for (const query of monitor.queries) lines.push(`| ${query.totalMs} | ${query.calls} | ${query.meanMs} | ${query.rows} | \`${query.query.replace(/\|/g, "\\|").slice(0, 160)}\` |`)
    }
  }
  return `${lines.join("\n")}\n`
}
