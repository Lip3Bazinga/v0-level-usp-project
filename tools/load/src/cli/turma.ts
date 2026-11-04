/**
 * `pnpm load:turma` — carga de turma contra a pilha completa (web + API + executor + banco).
 * Gera `relatorio.json` e `relatorio.md` (p50/p95/p99 por endpoint, vazão, 429/503, fila do
 * executor × execução, CPU/RSS dos processos e consultas mais caras). Ver
 * docs/v2/desempenho-e-carga.md.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { request } from "undici"
import { createAgent } from "../http"
import { ServerMonitor } from "../monitor"
import { parseOptions, USAGE, type LoadOptions } from "../options"
import { renderMarkdown, stepReport, type LoadReport, type StepReport } from "../report"
import { Random } from "../rng"
import { assertTargetsAllowed } from "../safety"
import { runBurst, runSteadyClass, type PhaseSettings } from "../scenarios"
import { matchLessons, readSeedLessons, type ApiLesson, type LoadLesson } from "../seed"

const WEB_RUNTIME_MANIFEST = path.resolve(import.meta.dirname, "../../../../apps/web/src/lib/python/pyodide-runtime.json")
const MONITOR_INTERVAL_MS = 1_000

async function getJson<T>(url: URL): Promise<T> {
  const response = await request(url, { headers: { accept: "application/json" } })
  if (response.statusCode !== 200) {
    await response.body.dump()
    throw new Error(`${url.pathname} respondeu ${response.statusCode}`)
  }
  return (await response.body.json()) as T
}

async function discoverLessons(options: LoadOptions): Promise<{ courseId: string; lessons: LoadLesson[] }> {
  const apiBase = options.apiOrigin ?? options.target
  const courses = await getJson<{ id: string; title: string }[]>(new URL("/api/courses", apiBase))
  const course = courses.find((candidate) => candidate.title === options.courseTitle)
  if (!course) throw new Error(`Curso "${options.courseTitle}" não encontrado em ${apiBase} (rode o seed: pnpm db:seed)`)
  const apiLessons = await getJson<ApiLesson[]>(new URL(`/api/courses/${course.id}/lessons`, apiBase))
  const lessons = matchLessons(readSeedLessons(), apiLessons, options.lessonRange)
  if (lessons.length === 0) throw new Error("Nenhuma lição do seed casou com as do curso (títulos diferentes?)")
  return { courseId: course.id, lessons }
}

function pyodideVersion(options: LoadOptions): string | null {
  if (!options.pyodide) return null
  const manifest = JSON.parse(readFileSync(WEB_RUNTIME_MANIFEST, "utf8")) as { version: string }
  return manifest.version
}

function outputDirectory(options: LoadOptions): string {
  const base = process.env.INIT_CWD ?? process.cwd()
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  return path.resolve(base, options.outputDir ?? path.join("load-results", `${stamp}-${options.scenario}`))
}

async function runStep(options: LoadOptions, base: Omit<PhaseSettings, "accountPrefix">, students: number, stepIndex: number, lessons: readonly LoadLesson[]): Promise<StepReport> {
  const monitor = new ServerMonitor({
    processes: options.processes,
    runnerUrl: options.runnerUrl,
    runnerToken: process.env.RUNNER_TOKEN ?? null,
    pgUrl: options.pgUrl,
    intervalMs: MONITOR_INTERVAL_MS,
    topQueries: options.topQueries,
  })
  const settings: PhaseSettings = { ...base, accountPrefix: `${options.accountPrefix}-e${stepIndex}` }
  if (options.scenario === "turma") {
    await monitor.start()
    const result = await runSteadyClass({ ...settings, students, simulatedMinutes: options.simulatedMinutes, compression: options.compression, rampSeconds: options.rampSeconds })
    const report = await monitor.stop()
    return stepReport({ students, compression: options.compression, seconds: result.seconds, samples: result.metrics.all(), endpoints: result.metrics.byEndpoint(), verifications: result.verifications, waveMakespans: [], failedLogins: result.failedLogins, preparation: null, monitor: report })
  }
  const lesson = lessons.find((candidate) => candidate.position === options.burstLesson)
  if (!lesson) throw new Error(`--licao ${options.burstLesson} fora do recorte de lições`)
  // A preparação (cadastro + lição aberta) fica fora do monitor: só a rajada é medida.
  const burst = runBurst({ ...settings, students, lesson, windowSeconds: options.windowSeconds, waves: options.waves, pauseSeconds: options.pauseSeconds, setupConcurrency: options.setupConcurrency, beforeMeasure: () => monitor.start() })
  const result = await burst
  const report = await monitor.stop()
  return stepReport({ students, compression: 1, seconds: result.seconds, samples: result.metrics.all(), endpoints: result.metrics.byEndpoint(), verifications: result.verifications, waveMakespans: result.waveMakespans, failedLogins: result.failedLogins, preparation: result.preparation.byEndpoint(), monitor: report })
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  if (options.help) {
    console.log(USAGE)
    return
  }
  assertTargetsAllowed([options.target, ...[options.apiOrigin, options.runnerUrl, options.pgUrl].filter((url) => url !== null)], options.authorizedTarget)
  const { courseId, lessons } = await discoverLessons(options)
  const agent = createAgent(options.connections)
  const base: Omit<PhaseSettings, "accountPrefix"> = {
    origin: options.target,
    apiOrigin: options.apiOrigin,
    agent,
    random: new Random(options.seed),
    lessons,
    courseId,
    password: options.password,
    ipPerStudent: options.ipPerStudent,
    downloadAssets: options.downloadAssets,
    pyodideVersion: pyodideVersion(options),
    retry: { maxRetries: options.retries, minWaitSeconds: options.retryWait[0], maxWaitSeconds: options.retryWait[1] },
  }
  const startedAt = new Date().toISOString()
  const steps: StepReport[] = []
  for (const [index, students] of options.students.entries()) {
    if (index > 0) await sleep(options.stepPauseSeconds * 1000)
    console.log(`[carga] etapa ${index + 1}/${options.students.length}: ${students} alunos (${options.scenario})`)
    const step = await runStep(options, base, students, index, lessons)
    console.log(`[carga]   Verificar p95 ${step.verify.clickToVerdict.p95} ms · 503 ${step.rate503} · 429 ${step.rate429} · ${step.throughputRps} req/s`)
    steps.push(step)
  }
  await agent.close()
  const { password: _password, ...visibleSettings } = { ...options, processes: Object.keys(options.processes) }
  const report: LoadReport = { tool: "levelusp-load", scenario: options.scenario, target: options.target, startedAt, finishedAt: new Date().toISOString(), settings: visibleSettings, steps }
  const directory = outputDirectory(options)
  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, "relatorio.json"), `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(path.join(directory, "relatorio.md"), renderMarkdown(report))
  console.log(`[carga] relatório em ${directory}/relatorio.{json,md}`)
}

main().catch((error: unknown) => {
  console.error(`[carga] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
