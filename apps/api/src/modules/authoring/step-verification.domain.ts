import { assembleParsonsCode, DEFAULT_ENTRY_FILE, parsonsSolutionPlacements, type BundleStep, type GradeResult, type ProjectFile } from "@levelusp/contracts"

/**
 * Regra de verificação do gabarito de um passo de exercício, a mesma para `pnpm content:verify`
 * e para o "Testar gabarito" do editor: a solução de referência precisa ser APROVADA, o código
 * inicial REPROVADO e cada solução errada REPROVADA. Num exercício `ordenar`, a "solução" é o
 * código MONTADO com as linhas do passo e o "código inicial" são as linhas na ordem embaralhada.
 * Aqui não há executor: quem chama roda os projetos do plano e devolve as correções.
 */

/** O que a regra lê de um passo (o passo do pacote e o do rascunho do editor servem). */
export type VerifiableStep = Pick<BundleStep, "exercise_mode" | "parsons_lines" | "starter_files" | "solution_files" | "wrong_solutions">

/** Código inicial efetivo do passo: o próprio ou, numa lição guiada, a solução do exercício anterior. */
export interface StarterCode {
  files: ProjectFile[]
  /** `order` do passo de que a solução foi herdada; null quando o passo tem código inicial próprio. */
  inheritedFrom: number | null
  /** As linhas de um exercício `ordenar` na ordem embaralhada, sem indentação (o que o aluno vê ao abrir). */
  isShuffledOrder?: true
}

/** Solução do exercício anterior, de que um passo sem código inicial próprio parte numa lição guiada. */
export interface InheritedStarter {
  order: number
  files: ProjectFile[]
}

/** Correção de uma solução errada, pelo nome dela. */
export interface WrongSolutionResult {
  name: string
  result: GradeResult
}

/** Uma solução errada pronta para rodar: os arquivos da solução com os dela por cima. */
export interface WrongSolutionProject {
  name: string
  files: ProjectFile[]
}

/** Projetos que a verificação de um passo roda contra os casos dele. */
export interface StepVerificationPlan {
  solution: ProjectFile[]
  /** null quando o passo não tem código inicial (nem herdado): nada a rodar. */
  starter: StarterCode | null
  wrong: WrongSolutionProject[]
}

/** Correções dos projetos de um {@link StepVerificationPlan}, na mesma ordem. */
export interface StepVerificationGrades {
  solution: GradeResult
  starter: GradeResult | null
  wrong: WrongSolutionResult[]
}

/** O que muda entre os usos da regra. */
export interface StepVerificationOptions {
  /** true no conteúdo versionado: passo sem solução errada é problema. No editor elas são opcionais. */
  requireWrongSolutions: boolean
}

/** Conclusão da verificação: `ok` todos os vereditos são os esperados; `falha` algum não é. */
export interface StepVerificationOutcome {
  status: "ok" | "falha"
  /** Motivos das falhas (uma frase por item), em pt-BR. */
  details: string[]
  /** Tempo somado no executor (ms). */
  durationMs: number
}

/** Motivo da falha quando {@link planStepVerification} devolve null. */
export const UNASSEMBLED_PARSONS_DETAIL = "as linhas do exercício de ordenar não montam a solução"

const MAX_PRINTED_FAILURES = 5

/**
 * Código inicial efetivo do passo: num exercício `ordenar`, as linhas na ordem embaralhada (sem
 * indentação); nos demais, o próprio ou, quando não há, o herdado (`inherited`).
 */
export function resolveStepStarter(step: VerifiableStep, inherited: InheritedStarter | null): StarterCode | null {
  if (step.exercise_mode === "ordenar") {
    const shuffledCode = assembleParsonsCode(step.parsons_lines, step.parsons_lines.map((line) => ({ line_id: line.id, indent: 0 })))
    return shuffledCode === null ? null : { files: [{ path: DEFAULT_ENTRY_FILE, content: shuffledCode }], inheritedFrom: null, isShuffledOrder: true }
  }
  if (step.starter_files.length > 0) return { files: step.starter_files, inheritedFrom: null }
  return inherited ? { files: inherited.files, inheritedFrom: inherited.order } : null
}

/**
 * Solução que a verificação roda: num exercício `ordenar`, o código montado com as linhas do
 * passo (null quando elas não montam a solução); nos demais, os arquivos de `### Solução`.
 */
export function resolveSolution(step: VerifiableStep): ProjectFile[] | null {
  if (step.exercise_mode !== "ordenar") return step.solution_files
  const solution = step.solution_files.find((file) => file.path === DEFAULT_ENTRY_FILE)
  const placements = solution ? parsonsSolutionPlacements(step.parsons_lines, solution.content) : null
  const assembled = placements ? assembleParsonsCode(step.parsons_lines, placements) : null
  return assembled === null ? null : [{ path: DEFAULT_ENTRY_FILE, content: assembled }]
}

/**
 * Projeto que uma solução errada roda: os arquivos de `### Solução` com os que a solução errada
 * declara por cima (mesmo caminho substitui). Assim a errada só repete o arquivo que tem o defeito,
 * e nunca reprova só porque faltou um arquivo de dados ou um módulo do projeto.
 */
export function wrongSolutionFiles(step: VerifiableStep, wrongFiles: readonly ProjectFile[]): ProjectFile[] {
  const overridden = new Set(wrongFiles.map((file) => file.path))
  return [...step.solution_files.filter((file) => !overridden.has(file.path)), ...wrongFiles]
}

/**
 * Projetos a rodar contra os casos do passo: a solução (montada, no modo `ordenar`), o código
 * inicial efetivo e cada solução errada. Devolve null quando as linhas de um exercício `ordenar`
 * não montam a solução (ver {@link UNASSEMBLED_PARSONS_DETAIL}): não há o que rodar.
 */
export function planStepVerification(step: VerifiableStep, starter: StarterCode | null): StepVerificationPlan | null {
  const solution = resolveSolution(step)
  if (solution === null) return null
  return {
    solution,
    starter,
    wrong: step.wrong_solutions.map((wrongSolution) => ({ name: wrongSolution.name, files: wrongSolutionFiles(step, wrongSolution.files) })),
  }
}

function passedCaseIds(result: GradeResult): string {
  return result.cases.filter((caseResult) => caseResult.passed).map((caseResult) => caseResult.id).join(", ")
}

function describeProblems(step: VerifiableStep, starter: StarterCode | null, grades: StepVerificationGrades, options: StepVerificationOptions): string[] {
  const details: string[] = []
  const { solution } = grades
  if (solution.strength !== "strong") details.push("o gabarito tem casos legacy: converta para casos declarativos")
  if (!solution.allPassed) {
    details.push("solução de referência REPROVADA:")
    for (const failure of solution.failureDetails.slice(0, MAX_PRINTED_FAILURES)) details.push(`  ${failure}`)
    if (solution.failureDetails.length > MAX_PRINTED_FAILURES) details.push(`  … e mais ${solution.failureDetails.length - MAX_PRINTED_FAILURES}`)
  }
  if (grades.starter?.allPassed && starter) {
    const origin = starter.inheritedFrom === null ? "código inicial" : `código inicial herdado do passo ${starter.inheritedFrom}`
    details.push(
      starter.isShuffledOrder
        ? `a ordem embaralhada (linhas como o aluno recebe, sem indentação) foi APROVADA (casos que passaram: ${passedCaseIds(grades.starter)})`
        : `${origin} APROVADO sem o aluno fazer nada (casos que passaram: ${passedCaseIds(grades.starter)})`,
    )
  }
  if (options.requireWrongSolutions && step.wrong_solutions.length === 0) details.push("sem soluções erradas: adicione ao menos uma em ### Soluções erradas")
  for (const entry of grades.wrong) {
    if (entry.result.allPassed) details.push(`solução errada APROVADA: "${entry.name}" (casos que passaram quando deviam falhar: ${passedCaseIds(entry.result)})`)
  }
  return details
}

/**
 * Conclui a verificação a partir das correções: `ok` quando a solução aprova (só com casos
 * declarativos), o código inicial reprova e cada solução errada reprova; senão `falha`, com um
 * motivo por problema.
 *
 * @param starter o mesmo código inicial passado a {@link planStepVerification}.
 */
export function concludeStepVerification(
  step: VerifiableStep,
  starter: StarterCode | null,
  grades: StepVerificationGrades,
  options: StepVerificationOptions,
): StepVerificationOutcome {
  const details = describeProblems(step, starter, grades, options)
  const results = [grades.solution, grades.starter, ...grades.wrong.map((entry) => entry.result)]
  const durationMs = results.reduce((total, result) => total + (result?.durationMs ?? 0), 0)
  return { status: details.length === 0 ? "ok" : "falha", details, durationMs }
}
