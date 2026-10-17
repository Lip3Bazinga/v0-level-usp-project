/**
 * Verifica o gabarito declarativo do seed contra as soluções de referência,
 * usando o executor REAL (Wasmtime + CPython WASI) e o mesmo motor de correção
 * da API. Para cada lição:
 *   1. a solução de referência precisa ser APROVADA;
 *   2. o esqueleto inicial (starter) precisa ser REPROVADO.
 * Uso: RUNNER_URL=http://localhost:8081 RUNNER_TOKEN=... pnpm --filter @levelusp/api verify:seed
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import type { ProjectFile, RunnerResult, TestCase } from "@levelusp/contracts"
import { testCasesSchema } from "@levelusp/contracts"
import { buildProbes, grade } from "../src/modules/grading/grading.domain"

interface SeedLesson {
  order: number
  title: string
  starter_files: ProjectFile[]
  reference_solution: ProjectFile[]
  test_cases: TestCase[]
}

const runnerUrl = process.env.RUNNER_URL ?? "http://localhost:8081"
const token = process.env.RUNNER_TOKEN ?? ""
const seedPath = path.resolve(process.cwd(), "../../packages/db/seed/python-completo.json")
const seed = JSON.parse(readFileSync(seedPath, "utf8")) as { lessons: SeedLesson[] }

async function run(files: ProjectFile[], cases: TestCase[]) {
  const probes = buildProbes(cases)
  const res = await fetch(new URL("/v1/run", runnerUrl), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ files, entry: "main.py", probes, limits: { timeoutMs: 10_000, memoryMb: 128 } }),
  })
  if (!res.ok) throw new Error(`executor respondeu ${res.status}: ${await res.text()}`)
  const out = (await res.json()) as RunnerResult
  return grade(cases, out.observations, out.durationMs)
}

let failures = 0
for (const lesson of seed.lessons) {
  const cases = testCasesSchema.parse(lesson.test_cases)
  const good = await run(lesson.reference_solution, cases)
  const bad = await run(lesson.starter_files, cases)
  const ok = good.allPassed && !bad.allPassed
  if (!ok) failures++
  const tag = ok ? "OK  " : "FALHA"
  console.log(`${tag} ${String(lesson.order).padStart(2, "0")} ${lesson.title.padEnd(34)} solução=${good.allPassed ? "aprovada" : "REPROVADA"} esqueleto=${bad.allPassed ? "APROVADO" : "reprovado"} (${good.strength}, ${good.durationMs} ms)`)
  if (!good.allPassed) for (const d of good.failureDetails.slice(0, 3)) console.log(`        ${d}`)
}
console.log(failures ? `\n${failures} lição(ões) com problema` : "\nTODAS AS LIÇÕES VERIFICADAS")
process.exit(failures ? 1 : 0)
