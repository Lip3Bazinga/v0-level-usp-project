/**
 * Verifica o gabarito declarativo do seed contra as soluções de referência,
 * usando o executor REAL (Wasmtime + CPython WASI) e o mesmo motor de correção
 * da API. Para cada lição:
 *   1. a solução de referência precisa ser APROVADA;
 *   2. o esqueleto inicial (starter) precisa ser REPROVADO;
 *   3. cada solução errada plausível (`wrong_solutions`, geradas por
 *      packages/db/tools/manual_conversions.py) precisa ser REPROVADA — prova
 *      de que os casos pegam os erros que os gabaritos antigos pegavam;
 *   4. a correção precisa ser forte (nenhum caso "legacy" no seed).
 * Uso: RUNNER_URL=http://localhost:8081 RUNNER_TOKEN=... pnpm --filter @levelusp/api verify:seed
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { DEFAULT_ENTRY_FILE, DEFAULT_RUNNER_LIMITS, testCasesSchema, type GradeResult, type ProjectFile, type RunnerResult, type TestCase } from "@levelusp/contracts"
import { buildProbes, grade } from "../src/modules/grading/grading.domain"

interface WrongSolution {
  name: string
  files: ProjectFile[]
}

interface SeedLesson {
  order: number
  title: string
  starter_files: ProjectFile[]
  reference_solution: ProjectFile[]
  test_cases: TestCase[]
  wrong_solutions?: WrongSolution[]
}

const MAX_PRINTED_FAILURES = 3
const TITLE_COLUMN_WIDTH = 34

const runnerUrl = process.env.RUNNER_URL ?? "http://localhost:8081"
const runnerToken = process.env.RUNNER_TOKEN ?? ""
const seedPath = path.resolve(process.cwd(), "../../packages/db/seed/python-completo.json")
// Arquivo versionado no repositório: este script é justamente a verificação dele.
const seed = JSON.parse(readFileSync(seedPath, "utf8")) as { lessons: SeedLesson[] }

async function gradeOnRunner(files: ProjectFile[], cases: TestCase[]): Promise<GradeResult> {
  const response = await fetch(new URL("/v1/run", runnerUrl), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${runnerToken}` },
    body: JSON.stringify({ files, entry: DEFAULT_ENTRY_FILE, probes: buildProbes(cases), limits: DEFAULT_RUNNER_LIMITS }),
  })
  if (!response.ok) throw new Error(`executor respondeu ${response.status}: ${await response.text()}`)
  // Executor local da própria verificação; o formato é o contrato RunnerResult.
  const result = (await response.json()) as RunnerResult
  return grade(cases, result.observations, result.durationMs)
}

/** Nomes das soluções erradas que a correção APROVOU (deveriam ser reprovadas). */
async function listApprovedWrongSolutions(lesson: SeedLesson, cases: TestCase[]): Promise<string[]> {
  const approved: string[] = []
  for (const wrongSolution of lesson.wrong_solutions ?? []) {
    const result = await gradeOnRunner(wrongSolution.files, cases)
    if (result.allPassed) approved.push(wrongSolution.name)
  }
  return approved
}

let failedLessons = 0
for (const lesson of seed.lessons) {
  const cases = testCasesSchema.parse(lesson.test_cases)
  const solution = await gradeOnRunner(lesson.reference_solution, cases)
  const starter = await gradeOnRunner(lesson.starter_files, cases)
  const approvedWrong = await listApprovedWrongSolutions(lesson, cases)
  const wrongCount = lesson.wrong_solutions?.length ?? 0
  const isConsistent = solution.allPassed && !starter.allPassed && approvedWrong.length === 0 && solution.strength === "strong"
  if (!isConsistent) failedLessons++
  const tag = isConsistent ? "OK  " : "FALHA"
  console.log(
    `${tag} ${String(lesson.order).padStart(2, "0")} ${lesson.title.padEnd(TITLE_COLUMN_WIDTH)} ` +
      `solução=${solution.allPassed ? "aprovada" : "REPROVADA"} esqueleto=${starter.allPassed ? "APROVADO" : "reprovado"} ` +
      `erradas=${wrongCount - approvedWrong.length}/${wrongCount} reprovadas (${solution.strength}, ${solution.durationMs} ms)`,
  )
  if (!solution.allPassed) for (const detail of solution.failureDetails.slice(0, MAX_PRINTED_FAILURES)) console.log(`        ${detail}`)
  for (const name of approvedWrong) console.log(`        solução errada APROVADA: ${name}`)
}
console.log(failedLessons ? `\n${failedLessons} lição(ões) com problema` : "\nTODAS AS LIÇÕES VERIFICADAS")
process.exit(failedLessons ? 1 : 0)
