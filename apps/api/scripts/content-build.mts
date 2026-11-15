/**
 * Compila a árvore de conteúdo (`content/`, formato .lvl.md + YAML) para o pacote
 * do formato 2 (`packages/db/seed/trilha-python-ia.json`), que o seed e
 * `POST /admin/content/import` consomem. Antes de gravar, aplica o lint do
 * `content:check` e valida o pacote com `contentBundleSchema`; qualquer problema
 * sai como `arquivo:linha: causa` e nada é gravado.
 *
 * Lições com passo `Previsão` precisam do executor REAL (RUNNER_URL, RUNNER_TOKEN): a saída
 * esperada é gerada executando o código do passo. Sem executor, o build dessas lições falha
 * (a saída nunca é inventada nem copiada do arquivo).
 *
 * Uso: pnpm content:build [--content content] [--out packages/db/seed/trilha-python-ia.json]
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { serializeBundle, validateBundle } from "./content/bundle"
import { parseContentArgs, usePortugueseMessages } from "./content/cli"
import { compileContent } from "./content/compiler"
import { lintContent } from "./content/lint"
import { generatePredictions, listPredictionSteps } from "./content/predictions"
import { createHttpRunner } from "./content/verify"
import { describeStats, formatProblemReport, summarizeProblems } from "./content/report"

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..")
const HEALTHCHECK_TIMEOUT_MS = 5_000

usePortugueseMessages()
const options = parseContentArgs(process.argv.slice(2), REPO_ROOT)
const compiled = compileContent({ contentDir: options.contentDir, displayRoot: options.displayRoot })
const problems = [...compiled.problems, ...lintContent(compiled)]
if (problems.length > 0) {
  for (const line of formatProblemReport(problems)) console.log(line)
  console.log(`\n${summarizeProblems(problems)}; pacote NÃO gravado`)
  process.exit(1)
}

const predictionSteps = listPredictionSteps(compiled.bundle)
if (predictionSteps.length > 0) {
  const lessons = [...new Set(predictionSteps.map(({ lesson }) => lesson.slug))]
  const runnerUrl = process.env.RUNNER_URL ?? "http://localhost:8081"
  const runnerToken = process.env.RUNNER_TOKEN ?? ""
  const needsRunner = `${predictionSteps.length} passo(s) Previsão (${lessons.join(", ")}) precisam do executor para gerar a saída esperada`
  if (runnerToken === "") {
    console.log(`${needsRunner}: defina RUNNER_URL e RUNNER_TOKEN (o token do executor); pacote NÃO gravado`)
    process.exit(1)
  }
  try {
    const health = await fetch(new URL("/healthz", runnerUrl), { signal: AbortSignal.timeout(HEALTHCHECK_TIMEOUT_MS) })
    if (!health.ok) throw new Error(`/healthz respondeu ${health.status}`)
  } catch (error) {
    console.log(`${needsRunner}, mas ele está indisponível em ${runnerUrl}: ${error instanceof Error ? error.message : String(error)}; pacote NÃO gravado`)
    process.exit(1)
  }
  const predictionProblems = await generatePredictions(compiled, createHttpRunner(runnerUrl, runnerToken))
  if (predictionProblems.length > 0) {
    for (const line of formatProblemReport(predictionProblems)) console.log(line)
    console.log(`\n${summarizeProblems(predictionProblems)} ao gerar as saídas das previsões; pacote NÃO gravado`)
    process.exit(1)
  }
}

const validation = validateBundle(compiled, new Date().toISOString())
if (!validation.bundle) {
  for (const line of formatProblemReport(validation.problems)) console.log(line)
  console.log(`\n${summarizeProblems(validation.problems)} na validação do pacote (contentBundleSchema); pacote NÃO gravado`)
  process.exit(1)
}

mkdirSync(path.dirname(options.out), { recursive: true })
writeFileSync(options.out, serializeBundle(validation.bundle))
const relativeOut = path.relative(options.displayRoot, options.out)
const shownOut = relativeOut === "" || relativeOut.startsWith("..") ? options.out : relativeOut
console.log(`Pacote gravado em ${shownOut} (${describeStats(compiled.stats)})`)
