import {
  DEFAULT_ENTRY_FILE, DEFAULT_RUNNER_LIMITS, findManifestLibrary,
  type BundleCourse, type BundleLesson, type BundleModule, type BundleStep, type ContentBundle, type GradeResult, type ProjectFile, type RunnerJob, type RunnerResult, type TestCase,
} from "@levelusp/contracts"
import {
  concludeStepVerification, planStepVerification, resolveStepStarter, UNASSEMBLED_PARSONS_DETAIL,
  type StarterCode, type WrongSolutionResult,
} from "../../src/modules/authoring/step-verification.domain"
import { buildProbes, grade } from "../../src/modules/grading/grading.domain"

export { resolveSolution, wrongSolutionFiles, type StarterCode, type WrongSolutionResult } from "../../src/modules/authoring/step-verification.domain"

/**
 * Verificação do conteúdo com o executor REAL (`pnpm content:verify`), com o
 * mesmo motor de correção da API: para cada passo de exercício, a solução
 * precisa ser APROVADA, o código inicial REPROVADO e cada solução errada
 * REPROVADA (prova de que os casos pegam os erros comuns). Num exercício
 * `ordenar`, a "solução" é o código MONTADO com as linhas do passo e o "código
 * inicial" são as linhas na ordem embaralhada em que o aluno as recebe. Lições
 * `python-dados` pedem o motor e as bibliotecas ao executor. A regra de um passo vive em
 * `src/modules/authoring/step-verification.domain.ts` (a API usa a mesma no "Testar gabarito").
 */

/** O que a verificação precisa do executor: o `RunnerClient` da API e um executor falso servem. */
export interface StepRunner {
  run(job: RunnerJob): Promise<RunnerResult>
}

/** Restringe a verificação a um curso e/ou a uma lição (slugs). */
export interface VerifyFilter {
  course?: string
  lesson?: string
}

/**
 * Opções da verificação: `concurrency` é o número de lotes simultâneos no executor para lições
 * leves (CPython e perfil `dados`); `heavyConcurrency`, para lições do perfil `ml`.
 */
export interface VerifyOptions extends VerifyFilter {
  concurrency?: number
  heavyConcurrency?: number
}

/** Um passo de exercício a verificar, com o contexto de onde está. */
export interface ExerciseTarget {
  course: BundleCourse
  module: BundleModule
  lesson: BundleLesson
  step: BundleStep
  starter: StarterCode | null
}

/** Veredito de um passo: `ok` coerente, `falha` algum veredito errado, `erro` falha do executor. */
export type VerdictStatus = "ok" | "falha" | "erro"

/** Resultado da verificação de um passo, com as explicações das falhas. */
export interface StepVerdict {
  target: ExerciseTarget
  status: VerdictStatus
  solution: GradeResult | null
  starter: GradeResult | null
  wrong: WrongSolutionResult[]
  /** Motivos das falhas (uma frase por item), em pt-BR. */
  details: string[]
  /** Tempo somado no executor (ms). */
  durationMs: number
}

/** Vereditos dos passos de uma lição. */
export interface LessonReport {
  course: BundleCourse
  module: BundleModule
  lesson: BundleLesson
  verdicts: StepVerdict[]
}

/** Totais da verificação. */
export interface VerifySummary {
  lessons: number
  steps: number
  failed: number
  errors: number
}

/** Executa uma tarefa respeitando um limite de simultaneidade. */
export type Scheduler = <T>(task: () => Promise<T>) => Promise<T>

/** Lotes simultâneos no executor quando não informado. */
export const DEFAULT_VERIFY_CONCURRENCY = 4
/** Lotes simultâneos para lições do perfil `ml`: com mais de um, o executor fecha a conexão (`fetch failed`). */
export const HEAVY_VERIFY_CONCURRENCY = 1
/** Tempo limite de cada pedido HTTP ao executor (fila + aquecimento do perfil + lote). */
export const RUNNER_REQUEST_TIMEOUT_MS = 120_000
/** Tentativas contra o executor quando ele responde "ocupado" (503). */
const MAX_BUSY_RETRIES = 3
const DEFAULT_RETRY_AFTER_SECONDS = 5
const MAX_RETRY_AFTER_SECONDS = 30
const MS_PER_SECOND = 1_000
const MAX_BODY_IN_ERROR = 300
const TITLE_COLUMN_WIDTH = 36

/** Fila com no máximo `limit` tarefas em andamento; as demais esperam na ordem de chegada. */
export function createPool(limit: number): Scheduler {
  let active = 0
  const waiting: (() => void)[] = []
  const acquire = (): Promise<void> =>
    new Promise((resolve) => {
      if (active < limit) {
        active++
        resolve()
      } else {
        waiting.push(() => {
          active++
          resolve()
        })
      }
    })
  const release = (): void => {
    active--
    waiting.shift()?.()
  }
  return async <T>(task: () => Promise<T>): Promise<T> => {
    await acquire()
    try {
      return await task()
    } finally {
      release()
    }
  }
}

const runImmediately: Scheduler = (task) => task()

/**
 * Diz se a lição roda no perfil `ml` do executor: `python-dados` com biblioteca cujo `pyodide_profile` no
 * manifesto não é `dados` (o que o manifesto não conhece também conta como pesado, por prudência).
 */
export function usesHeavyProfile(lesson: BundleLesson): boolean {
  if (lesson.runtime !== "python-dados") return false
  return lesson.libraries.some((library) => findManifestLibrary(library)?.pyodide_profile !== "dados")
}

/**
 * Código inicial efetivo do passo: o próprio ou, em lição guiada, a solução do exercício
 * anterior; num exercício `ordenar`, as linhas na ordem embaralhada (sem indentação).
 */
export function resolveStarter(lesson: BundleLesson, step: BundleStep): StarterCode | null {
  const previous = lesson.lesson_type === "guided"
    ? lesson.steps.filter((candidate) => candidate.kind === "exercicio" && candidate.order < step.order && candidate.solution_files.length > 0).pop()
    : undefined
  return resolveStepStarter(step, previous ? { order: previous.order, files: previous.solution_files } : null)
}

/** Passos de exercício do pacote, na ordem do pacote, respeitando o filtro. */
export function listExerciseTargets(bundle: ContentBundle, filter: VerifyFilter = {}): ExerciseTarget[] {
  const targets: ExerciseTarget[] = []
  for (const course of bundle.courses) {
    if (filter.course !== undefined && course.slug !== filter.course) continue
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (filter.lesson !== undefined && lesson.slug !== filter.lesson) continue
        for (const step of lesson.steps) {
          if (step.kind === "exercicio") targets.push({ course, module, lesson, step, starter: resolveStarter(lesson, step) })
        }
      }
    }
  }
  return targets
}

/** Pedido ao executor para um projeto contra os casos do passo, com o motor (e as bibliotecas) da lição. */
export function buildVerifyJob(lesson: BundleLesson, files: ProjectFile[], cases: TestCase[]): RunnerJob {
  return {
    files,
    entry: DEFAULT_ENTRY_FILE,
    probes: buildProbes(cases),
    limits: { ...DEFAULT_RUNNER_LIMITS },
    runtime: lesson.runtime,
    ...(lesson.runtime === "python-dados" ? { libraries: lesson.libraries } : {}),
  }
}

async function gradeOnRunner(runner: StepRunner, lesson: BundleLesson, files: ProjectFile[], cases: TestCase[]): Promise<GradeResult> {
  const result = await runner.run(buildVerifyJob(lesson, files, cases))
  return grade(cases, result.observations, result.durationMs)
}

/** Verifica um passo: solução (montada, no modo `ordenar`) aprova, código inicial ou ordem embaralhada reprova, cada solução errada reprova. */
export async function verifyStep(target: ExerciseTarget, runner: StepRunner, schedule: Scheduler = runImmediately): Promise<StepVerdict> {
  const { lesson, step } = target
  const cases = step.test_cases
  const run = (files: ProjectFile[]): Promise<GradeResult> => schedule(() => gradeOnRunner(runner, lesson, files, cases))
  const plan = planStepVerification(step, target.starter)
  if (plan === null) {
    return { target, status: "falha", solution: null, starter: null, wrong: [], details: [UNASSEMBLED_PARSONS_DETAIL], durationMs: 0 }
  }
  try {
    const [solution, starter, wrong] = await Promise.all([
      run(plan.solution),
      plan.starter ? run(plan.starter.files) : Promise.resolve(null),
      Promise.all(plan.wrong.map(async (entry): Promise<WrongSolutionResult> => ({ name: entry.name, result: await run(entry.files) }))),
    ])
    const outcome = concludeStepVerification(step, target.starter, { solution, starter, wrong }, { requireWrongSolutions: true })
    return { target, status: outcome.status, solution, starter, wrong, details: outcome.details, durationMs: outcome.durationMs }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { target, status: "erro", solution: null, starter: null, wrong: [], details: [`executor: ${message}`], durationMs: 0 }
  }
}

interface LessonGroup {
  course: BundleCourse
  module: BundleModule
  lesson: BundleLesson
  verdicts: Promise<StepVerdict>[]
}

/** Agrupa os passos por lição, preservando a ordem do pacote. */
function groupByLesson(targets: readonly ExerciseTarget[], runner: StepRunner, scheduleFor: (lesson: BundleLesson) => Scheduler): LessonGroup[] {
  const groups: LessonGroup[] = []
  for (const target of targets) {
    const current = groups[groups.length - 1]
    const group = current?.lesson === target.lesson ? current : { course: target.course, module: target.module, lesson: target.lesson, verdicts: [] }
    if (group !== current) groups.push(group)
    group.verdicts.push(verifyStep(target, runner, scheduleFor(target.lesson)))
  }
  return groups
}

/**
 * Verifica todos os passos de exercício do pacote (ou do filtro), com até
 * `concurrency` lotes simultâneos no executor para lições leves e `heavyConcurrency`
 * (um, por padrão) para lições do perfil `ml`. `onLesson` recebe o relatório
 * de cada lição assim que ela termina, na ordem do pacote.
 */
export async function verifyBundle(
  bundle: ContentBundle,
  runner: StepRunner,
  options: VerifyOptions = {},
  onLesson?: (report: LessonReport) => void,
): Promise<{ reports: LessonReport[]; summary: VerifySummary }> {
  const light = createPool(options.concurrency ?? DEFAULT_VERIFY_CONCURRENCY)
  const heavy = createPool(options.heavyConcurrency ?? HEAVY_VERIFY_CONCURRENCY)
  const scheduleFor = (lesson: BundleLesson): Scheduler => (usesHeavyProfile(lesson) ? heavy : light)
  const reports: LessonReport[] = []
  for (const group of groupByLesson(listExerciseTargets(bundle, options), runner, scheduleFor)) {
    const report: LessonReport = { course: group.course, module: group.module, lesson: group.lesson, verdicts: await Promise.all(group.verdicts) }
    reports.push(report)
    onLesson?.(report)
  }
  const verdicts = reports.flatMap((report) => report.verdicts)
  return {
    reports,
    summary: {
      lessons: reports.length,
      steps: verdicts.length,
      failed: verdicts.filter((verdict) => verdict.status === "falha").length,
      errors: verdicts.filter((verdict) => verdict.status === "erro").length,
    },
  }
}

/** `Retry-After` em segundos inteiros; inválido ou ausente usa o padrão, limitado ao teto. */
function retryAfterSeconds(header: string | null): number {
  const seconds = Number(header)
  if (header === null || !Number.isInteger(seconds) || seconds < 1) return DEFAULT_RETRY_AFTER_SECONDS
  return Math.min(seconds, MAX_RETRY_AFTER_SECONDS)
}

function isRunnerResult(value: unknown): value is RunnerResult {
  if (typeof value !== "object" || value === null) return false
  return "observations" in value && Array.isArray(value.observations) && "durationMs" in value && typeof value.durationMs === "number"
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Dependências substituíveis do executor HTTP (os testes trocam o `fetch`, a espera e o tempo limite). */
export interface HttpRunnerOptions {
  fetchImpl?: typeof fetch
  wait?: (ms: number) => Promise<void>
  /** Tempo limite de cada pedido, em ms; ausente = `RUNNER_REQUEST_TIMEOUT_MS`. */
  requestTimeoutMs?: number
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
}

/**
 * Executor HTTP (`POST /v1/run` com o token da API). Quando o executor responde
 * 503 (fila cheia), espera o `Retry-After` e tenta de novo algumas vezes. Cada
 * pedido tem tempo limite (`requestTimeoutMs`).
 *
 * @throws Error quando o executor responde erro, um corpo fora do contrato ou não responde no tempo limite.
 */
export function createHttpRunner(runnerUrl: string, token: string, options: HttpRunnerOptions = {}): StepRunner {
  const fetchImpl = options.fetchImpl ?? fetch
  const wait = options.wait ?? sleep
  const requestTimeoutMs = options.requestTimeoutMs ?? RUNNER_REQUEST_TIMEOUT_MS
  const post = async (job: RunnerJob): Promise<Response> => {
    try {
      return await fetchImpl(new URL("/v1/run", runnerUrl), {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(job),
        signal: AbortSignal.timeout(requestTimeoutMs),
      })
    } catch (error) {
      if (!isTimeoutError(error)) throw error
      throw new Error(`o executor não respondeu em ${requestTimeoutMs / MS_PER_SECOND} s (tempo limite do pedido): confira se o contêiner está de pé e sem fila, e rode de novo`, { cause: error })
    }
  }
  return {
    async run(job: RunnerJob): Promise<RunnerResult> {
      for (let attempt = 0; ; attempt++) {
        const response = await post(job)
        if (response.status === 503 && attempt < MAX_BUSY_RETRIES) {
          const seconds = retryAfterSeconds(response.headers.get("retry-after"))
          await response.body?.cancel()
          await wait(seconds * MS_PER_SECOND)
          continue
        }
        if (!response.ok) throw new Error(`executor respondeu ${response.status}: ${(await response.text()).slice(0, MAX_BODY_IN_ERROR)}`)
        const result: unknown = await response.json()
        if (!isRunnerResult(result)) throw new Error("resposta do executor fora do formato esperado")
        return result
      }
    },
  }
}

const STATUS_TAGS: Readonly<Record<VerdictStatus, string>> = { ok: "OK   ", falha: "FALHA", erro: "ERRO " }

/** Linhas do relatório de um passo, no estilo de `verify-seed`. */
export function formatVerdict(verdict: StepVerdict): string[] {
  const { step } = verdict.target
  const title = `passo ${String(step.order).padStart(2, "0")} · ${step.title}`.padEnd(TITLE_COLUMN_WIDTH)
  const detailLines = verdict.details.map((detail) => `        ${detail}`)
  if (!verdict.solution) return [`  ${STATUS_TAGS[verdict.status]} ${title}`, ...detailLines]
  const starterLabel = verdict.starter ? (verdict.starter.allPassed ? "APROVADO" : "reprovado") : "não verificado"
  const wrongRejected = verdict.wrong.filter((entry) => !entry.result.allPassed).length
  const summary =
    `solução=${verdict.solution.allPassed ? "aprovada" : "REPROVADA"} inicial=${starterLabel} ` +
    `erradas=${wrongRejected}/${verdict.wrong.length} reprovadas (${verdict.solution.strength}, ${verdict.durationMs} ms)`
  return [`  ${STATUS_TAGS[verdict.status]} ${title} ${summary}`, ...detailLines]
}

/** Cabeçalho de uma lição no relatório. */
export function formatLessonHeading(report: LessonReport): string {
  return `${report.course.slug} / ${report.module.slug} / ${report.lesson.slug} — ${report.lesson.title} (${report.lesson.runtime})`
}
