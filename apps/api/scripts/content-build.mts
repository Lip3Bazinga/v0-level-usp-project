/**
 * Compila a árvore de conteúdo (`content/`, formato .lvl.md + YAML) para o pacote
 * do formato 2 (`packages/db/seed/trilha-python-ia.json`), que o seed e
 * `POST /admin/content/import` consomem. Antes de gravar, aplica o lint do
 * `content:check` e valida o pacote com `contentBundleSchema`; qualquer problema
 * sai como `arquivo:linha: causa` e nada é gravado.
 *
 * Uso: pnpm content:build [--content content] [--out packages/db/seed/trilha-python-ia.json]
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { serializeBundle, validateBundle } from "./content/bundle"
import { parseContentArgs, usePortugueseMessages } from "./content/cli"
import { compileContent } from "./content/compiler"
import { lintContent } from "./content/lint"
import { describeStats, formatProblemReport, summarizeProblems } from "./content/report"

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..")

usePortugueseMessages()
const options = parseContentArgs(process.argv.slice(2), REPO_ROOT)
const compiled = compileContent({ contentDir: options.contentDir, displayRoot: options.displayRoot })
const problems = [...compiled.problems, ...lintContent(compiled)]
if (problems.length > 0) {
  for (const line of formatProblemReport(problems)) console.log(line)
  console.log(`\n${summarizeProblems(problems)}; pacote NÃO gravado`)
  process.exit(1)
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
