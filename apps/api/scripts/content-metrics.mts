/**
 * Métricas de densidade das lições para auditoria de qualidade: por lição, passos
 * por tipo, palavras por leitura, exercícios, casos por exercício e tipos de caso,
 * soluções erradas, dicas, recursos (diagrama, visualizador, fórmula, lacunas,
 * ordenar, Previsão) e objetivos. Compara cada lição com a média e o mínimo do
 * curso de referência (padrão: Nível 1) e marca como suspeita a lição abaixo do
 * mínimo da referência em alguma métrica central. Não executa código.
 *
 * Uso: pnpm --filter @levelusp/api content:metrics --curso n7-... [--curso n3-...] [--base n1-fundamentos] [--md arquivo.md] [--content pasta]
 */
import { writeFileSync } from "node:fs"
import path from "node:path"
import type { BundleLesson } from "@levelusp/contracts"
import { usePortugueseMessages } from "./content/cli"
import { compileContent } from "./content/compiler"

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..")

/** Métricas de uma lição. */
interface LessonMetrics {
  course: string
  slug: string
  isProject: boolean
  steps: number
  readings: number
  exercises: number
  quizzes: number
  predictions: number
  quizQuestions: number
  wordsPerReading: number
  minWordsReading: number
  casesPerExercise: number
  minCasesExercise: number
  caseKinds: Record<string, number>
  weakExercises: number
  wrongPerExercise: number
  hints: number
  diagrams: number
  visualizers: number
  formulas: number
  blanks: number
  ordering: number
  objectives: number
}

/** Métricas centrais: abaixo do mínimo da referência em qualquer uma = suspeita. */
const CENTRAL: readonly (keyof LessonMetrics)[] = [
  "steps", "exercises", "wordsPerReading", "casesPerExercise", "wrongPerExercise", "quizQuestions", "objectives",
]

/** Conta palavras de um texto Markdown sem os blocos de código. */
function countWords(markdown: string): number {
  const prose = markdown.replace(/```[\s\S]*?```/g, " ")
  return prose.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
}

/** Conta fórmulas `$...$`/`$$...$$` fora dos blocos de código. */
function countFormulas(markdown: string): number {
  const prose = markdown.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ").replace(/\\\$/g, "")
  return (prose.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/g) ?? []).length
}

/** Exercício fraco: nenhum caso verifica comportamento (só `source` ou `io` com `contains`). */
function isWeakExercise(cases: readonly Record<string, unknown>[]): boolean {
  return cases.every((testCase) => testCase.kind === "source" || (testCase.kind === "io" && testCase.match === "contains"))
}

/** Média de uma lista (0 quando vazia). */
function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Calcula as métricas de uma lição. */
function measure(course: string, lesson: BundleLesson): LessonMetrics {
  const readings = lesson.steps.filter((step) => step.kind === "leitura")
  const exercises = lesson.steps.filter((step) => step.kind === "exercicio")
  const words = readings.map((step) => countWords(step.narrative_markdown))
  const casesPer = exercises.map((step) => step.test_cases.length)
  const caseKinds: Record<string, number> = {}
  for (const step of exercises) {
    for (const testCase of step.test_cases) {
      const key = testCase.kind === "io" ? `io-${testCase.match}` : testCase.kind
      caseKinds[key] = (caseKinds[key] ?? 0) + 1
    }
  }
  const allText = lesson.steps.map((step) => step.narrative_markdown).join("\n")
  return {
    course,
    slug: lesson.slug,
    isProject: lesson.is_project,
    steps: lesson.steps.length,
    readings: readings.length,
    exercises: exercises.length,
    quizzes: lesson.steps.filter((step) => step.kind === "quiz").length,
    predictions: lesson.steps.filter((step) => step.kind === "previsao").length,
    quizQuestions: lesson.steps.reduce((sum, step) => sum + step.quiz_questions.length, 0),
    wordsPerReading: Math.round(mean(words)),
    minWordsReading: words.length === 0 ? 0 : Math.min(...words),
    casesPerExercise: Number(mean(casesPer).toFixed(1)),
    minCasesExercise: casesPer.length === 0 ? 0 : Math.min(...casesPer),
    caseKinds,
    weakExercises: exercises.filter((step) => isWeakExercise(step.test_cases as unknown as Record<string, unknown>[])).length,
    wrongPerExercise: Number(mean(exercises.map((step) => step.wrong_solutions.length)).toFixed(1)),
    hints: exercises.reduce((sum, step) => sum + step.hints.length, 0),
    diagrams: (allText.match(/```mermaid/g) ?? []).length,
    visualizers: (allText.match(/```python visualizar/g) ?? []).length,
    formulas: countFormulas(allText),
    blanks: exercises.filter((step) => step.exercise_mode === "lacunas").length,
    ordering: exercises.filter((step) => step.exercise_mode === "ordenar").length,
    objectives: lesson.objectives.length,
  }
}

/** Lê a lista de valores de uma opção repetível (`--curso a --curso b`). */
function readOptions(argv: readonly string[], name: string): string[] {
  return argv.flatMap((arg, index) => (arg === name && argv[index + 1] !== undefined ? [argv[index + 1] as string] : []))
}

/** Formata uma linha de tabela Markdown. */
function row(cells: readonly (string | number)[]): string {
  return `| ${cells.join(" | ")} |`
}

const NUMERIC: readonly (keyof LessonMetrics)[] = [
  "steps", "readings", "exercises", "quizzes", "predictions", "quizQuestions", "wordsPerReading", "minWordsReading",
  "casesPerExercise", "minCasesExercise", "weakExercises", "wrongPerExercise", "hints", "diagrams", "visualizers",
  "formulas", "blanks", "ordering", "objectives",
]

const HEADERS: Readonly<Record<string, string>> = {
  steps: "passos", readings: "leit", exercises: "exer", quizzes: "quiz", predictions: "prev", quizQuestions: "perg",
  wordsPerReading: "pal/leit", minWordsReading: "pal mín", casesPerExercise: "casos/ex", minCasesExercise: "casos mín",
  weakExercises: "ex fracos", wrongPerExercise: "erradas/ex", hints: "dicas", diagrams: "diag", visualizers: "vis",
  formulas: "fórm", blanks: "lac", ordering: "ord", objectives: "obj",
}

usePortugueseMessages()
const argv = process.argv.slice(2)
const baseSlug = readOptions(argv, "--base")[0] ?? "n1-fundamentos"
const targets = readOptions(argv, "--curso")
const mdPath = readOptions(argv, "--md")[0]
const contentDir = path.resolve(REPO_ROOT, readOptions(argv, "--content")[0] ?? "content")
const compiled = compileContent({ contentDir })

/** Todas as lições de um curso, medidas. */
function measureCourse(slug: string): LessonMetrics[] {
  const course = compiled.bundle.courses.find((candidate) => candidate.slug === slug)
  if (course === undefined) throw new Error(`curso não encontrado: ${slug}`)
  return course.modules.flatMap((module) => module.lessons.map((lesson) => measure(slug, lesson)))
}

const base = measureCourse(baseSlug)
const lines: string[] = []
const kinds = [false, true] as const
const reference = new Map<boolean, { mean: Record<string, number>; min: Record<string, number> }>()
for (const isProject of kinds) {
  const group = base.filter((metrics) => metrics.isProject === isProject)
  const meanRow: Record<string, number> = {}
  const minRow: Record<string, number> = {}
  for (const key of NUMERIC) {
    const values = group.map((metrics) => metrics[key] as number)
    meanRow[key] = Number(mean(values).toFixed(1))
    minRow[key] = values.length === 0 ? 0 : Math.min(...values)
  }
  reference.set(isProject, { mean: meanRow, min: minRow })
}

lines.push(`# Métricas de conteúdo (referência: ${baseSlug})`, "")
lines.push(`Métricas centrais: ${CENTRAL.map((key) => HEADERS[key]).join(", ")}. "ex fracos" = exercícios em que nenhum caso verifica comportamento (só source ou io contains).`, "")
for (const isProject of kinds) {
  const ref = reference.get(isProject)
  if (ref === undefined) continue
  lines.push(`## Referência ${baseSlug} — ${isProject ? "projetos" : "lições guiadas"}`, "")
  lines.push(row(["", ...NUMERIC.map((key) => HEADERS[key] ?? key)]), row(["---", ...NUMERIC.map(() => "---:")]))
  lines.push(row(["média", ...NUMERIC.map((key) => ref.mean[key] ?? 0)]), row(["mínimo", ...NUMERIC.map((key) => ref.min[key] ?? 0)]), "")
}

let suspects = 0
for (const slug of targets) {
  const lessons = measureCourse(slug)
  lines.push(`## ${slug}`, "")
  lines.push(row(["lição", ...NUMERIC.map((key) => HEADERS[key] ?? key), "tipos de caso", "suspeita"]))
  lines.push(row(["---", ...NUMERIC.map(() => "---:"), "---", "---"]))
  for (const metrics of lessons) {
    const ref = reference.get(metrics.isProject)
    const below = CENTRAL.filter((key) => ref !== undefined && (metrics[key] as number) < (ref.min[key] ?? 0))
    if (metrics.weakExercises > 0) below.push("weakExercises")
    if (below.length > 0) suspects += 1
    const kindsText = Object.entries(metrics.caseKinds).map(([kind, count]) => `${kind}:${count}`).join(" ")
    lines.push(row([
      `${metrics.slug}${metrics.isProject ? " (projeto)" : ""}`,
      ...NUMERIC.map((key) => metrics[key] as number),
      kindsText,
      below.map((key) => HEADERS[key] ?? key).join(", "),
    ]))
  }
  const meanRow = NUMERIC.map((key) => Number(mean(lessons.filter((m) => !m.isProject).map((m) => m[key] as number)).toFixed(1)))
  lines.push(row(["**média (guiadas)**", ...meanRow, "", ""]), "")
}
lines.push(`Lições suspeitas: ${suspects}`)

const output = lines.join("\n")
if (mdPath === undefined) console.log(output)
else {
  writeFileSync(path.resolve(REPO_ROOT, mdPath), `${output}\n`, "utf8")
  console.log(`Métricas gravadas em ${mdPath} (${suspects} lições suspeitas)`)
}
