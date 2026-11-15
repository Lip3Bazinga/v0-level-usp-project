import type { ContentStats } from "./compiler"
import { sortProblems, type ContentProblem } from "./source-map"

/** Relatórios dos comandos de conteúdo: problemas agrupados por arquivo e resumo das contagens. */

/** Linhas do relatório: um bloco por arquivo, cada problema com a linha; vazio quando não há problemas. */
export function formatProblemReport(problems: readonly ContentProblem[]): string[] {
  const lines: string[] = []
  let currentFile: string | null = null
  for (const problem of sortProblems(problems)) {
    if (problem.file !== currentFile) {
      if (currentFile !== null) lines.push("")
      lines.push(problem.file)
      currentFile = problem.file
    }
    lines.push(`  ${problem.line === null ? "-" : String(problem.line)}: ${problem.message}`)
  }
  return lines
}

/** `3 problema(s) em 2 arquivo(s)`. */
export function summarizeProblems(problems: readonly ContentProblem[]): string {
  const files = new Set(problems.map((problem) => problem.file)).size
  return `${problems.length} problema(s) em ${files} arquivo(s)`
}

/** `1 trilha(s), 2 curso(s), 3 módulo(s), 10 lição(ões), 25 passo(s)`. */
export function describeStats(stats: ContentStats): string {
  return `${stats.tracks} trilha(s), ${stats.courses} curso(s), ${stats.modules} módulo(s), ${stats.lessons} lição(ões), ${stats.steps} passo(s)`
}
