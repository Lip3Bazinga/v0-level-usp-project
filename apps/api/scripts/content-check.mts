/**
 * Lint do conteúdo sem executar código (docs/v2/curso-e-passos.md §6.3): erros de
 * formato dos arquivos .lvl.md e YAML, slugs únicos, passos numerados, exercício
 * completo (instruções, código inicial, solução, verificação, ≥ 1 solução errada),
 * dicas ≤ 3, quiz com uma correta e ≥ 2 opções, checkpoints existentes,
 * runtime/bibliotecas coerentes, texto sem "TODO"/"Em breve"/"lorem", objetivos
 * nas lições publicadas, casos io com saída esperada, títulos e narrativas mínimas.
 * Relatório por arquivo; sai com código 1 quando há problema.
 *
 * Uso: pnpm content:check [--content content]
 */
import path from "node:path"
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
  console.log(`\n${summarizeProblems(problems)}`)
  process.exit(1)
}
console.log(`Conteúdo OK: ${describeStats(compiled.stats)}`)
