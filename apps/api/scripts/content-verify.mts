/**
 * Verifica o conteúdo com o executor REAL e o motor de correção da API: em cada
 * passo de exercício, a solução APROVA, o código inicial REPROVA e cada solução
 * errada REPROVA (no modo `ordenar`: a solução montada APROVA e a ordem embaralhada
 * REPROVA). Passos `Previsão`: a saída esperada é gerada e uma segunda execução precisa
 * reproduzi-la; blocos ```python visualizar precisam rodar sem erro.
 * Lições `python-dados` enviam `runtime` e `libraries` ao executor.
 * Até 4 lotes simultâneos; relatório por lição e passo com o motivo das falhas;
 * código de saída 1 quando algum passo falha (ou o executor não responde).
 *
 * Uso: RUNNER_URL=http://127.0.0.1:8081 RUNNER_TOKEN=... pnpm content:verify [--curso slug] [--licao slug] [--content content]
 */
import path from "node:path"
import { validateBundle } from "./content/bundle"
import { parseContentArgs, usePortugueseMessages } from "./content/cli"
import { compileContent } from "./content/compiler"
import { formatSnippetVerdict, generatePredictions, verifySnippets } from "./content/predictions"
import { formatProblemReport, summarizeProblems } from "./content/report"
import { createHttpRunner, DEFAULT_VERIFY_CONCURRENCY, formatLessonHeading, formatVerdict, verifyBundle } from "./content/verify"

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..")
const HEALTHCHECK_TIMEOUT_MS = 5_000

usePortugueseMessages()
const options = parseContentArgs(process.argv.slice(2), REPO_ROOT)
const runnerUrl = process.env.RUNNER_URL ?? "http://localhost:8081"
const runnerToken = process.env.RUNNER_TOKEN ?? ""
if (runnerToken === "") {
  console.log("RUNNER_TOKEN não definido: informe o token do executor (o mesmo da API)")
  process.exit(1)
}

const compiled = compileContent({ contentDir: options.contentDir, displayRoot: options.displayRoot })
if (compiled.problems.length > 0) {
  for (const line of formatProblemReport(compiled.problems)) console.log(line)
  console.log(`\n${summarizeProblems(compiled.problems)}; corrija antes de verificar`)
  process.exit(1)
}

try {
  const health = await fetch(new URL("/healthz", runnerUrl), { signal: AbortSignal.timeout(HEALTHCHECK_TIMEOUT_MS) })
  if (!health.ok) throw new Error(`/healthz respondeu ${health.status}`)
} catch (error) {
  console.log(`executor indisponível em ${runnerUrl}: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

const runner = createHttpRunner(runnerUrl, runnerToken)
const predictionProblems = await generatePredictions(compiled, runner)
const validation = predictionProblems.length > 0 ? { bundle: null, problems: predictionProblems } : validateBundle(compiled, new Date().toISOString())
if (!validation.bundle) {
  for (const line of formatProblemReport(validation.problems)) console.log(line)
  console.log(`\n${summarizeProblems(validation.problems)}; corrija antes de verificar`)
  process.exit(1)
}

const filter = { ...(options.course === undefined ? {} : { course: options.course }), ...(options.lesson === undefined ? {} : { lesson: options.lesson }) }
const { summary } = await verifyBundle(validation.bundle, runner, { ...filter, concurrency: DEFAULT_VERIFY_CONCURRENCY }, (report) => {
  console.log(formatLessonHeading(report))
  for (const verdict of report.verdicts) for (const line of formatVerdict(verdict)) console.log(line)
})

const snippets = await verifySnippets(validation.bundle, runner, filter)
if (snippets.length > 0) {
  console.log("Previsões e blocos visualizar")
  for (const verdict of snippets) console.log(formatSnippetVerdict(verdict))
}

if (summary.steps === 0 && snippets.length === 0) {
  console.log("nenhum passo de exercício, previsão ou bloco visualizar encontrado para verificar (confira --curso/--licao)")
  process.exit(1)
}
const snippetProblems = snippets.filter((verdict) => verdict.status !== "ok").length
const problems = summary.failed + summary.errors + snippetProblems
console.log(
  problems === 0
    ? `\nTODOS OS PASSOS VERIFICADOS: ${summary.steps} passo(s) de exercício em ${summary.lessons} lição(ões); ${snippets.length} previsão(ões)/bloco(s) visualizar`
    : `\n${summary.failed} passo(s) com problema e ${summary.errors} erro(s) de executor, de ${summary.steps} passo(s) em ${summary.lessons} lição(ões); ` +
      `${snippetProblems} de ${snippets.length} previsão(ões)/bloco(s) visualizar com problema`,
)
process.exit(problems === 0 ? 0 : 1)
