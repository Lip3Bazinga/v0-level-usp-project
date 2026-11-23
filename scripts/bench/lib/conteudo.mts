/**
 * Lições e passos reais do pacote de conteúdo usados nas medições.
 *
 * O pacote (`packages/db/seed/trilha-python-ia.json`) traz as soluções de referência e as
 * soluções erradas; os ids da lição e dos passos vêm da API (o banco precisa ter importado o
 * mesmo pacote). Os scripts de medição existem para exercitar a correção: enviar a solução
 * correta de um exercício é exatamente o que um aluno faz ao clicar em Verificar.
 */
import { readFileSync } from "node:fs"
import type { ApiClient } from "./api.mts"
import { sleep } from "./sistema.mts"

/** Motores medidos: `python` (CPython WASI), `dados` (Pyodide, perfil dados) e `ml` (Pyodide, perfil ml). */
export type Motor = "python" | "dados" | "ml"

export interface ProjectFile {
  path: string
  content: string
}

interface BundleStep {
  order: number
  kind: "leitura" | "previsao" | "exercicio" | "quiz"
  title: string
  exercise_mode: "codigo" | "lacunas" | "ordenar"
  solution_files: ProjectFile[]
  test_cases: unknown[]
  quiz_questions: { correct_index: number }[]
  parsons_lines: { id: string; text: string }[]
  expected_output: string
  wrong_solutions: { name: string; files: ProjectFile[] }[]
}

interface BundleLesson {
  slug: string
  title: string
  runtime: "python" | "python-dados"
  libraries: string[]
  steps: BundleStep[]
}

/** Lê o pacote e indexa as lições pelo `slug`. */
export function loadBundle(file: string): Map<string, BundleLesson> {
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { courses?: { modules: { lessons: BundleLesson[] }[] }[] }
  if (!Array.isArray(parsed.courses)) throw new Error(`pacote inválido (sem "courses"): ${file}`)
  const lessons = new Map<string, BundleLesson>()
  for (const course of parsed.courses) for (const module of course.modules) for (const lesson of module.lessons) lessons.set(lesson.slug, lesson)
  return lessons
}

/** Exercício escolhido para medir: lição do pacote + posição do passo (1, 2, 3…). */
export interface Alvo {
  chave: string
  descricao: string
  motor: Motor
  /** `slug` da lição no pacote. */
  licao: string
  /** `order` do passo de exercício. */
  passo: number
}

/**
 * Exercícios do pacote atual usados na LATÊNCIA (um por cenário a–e da spec). Todos são passos
 * `exercicio` de lições publicadas; os passos anteriores da lição são concluídos antes (a API
 * exige a sequência).
 */
export const ALVOS_LATENCIA: readonly Alvo[] = [
  { chave: "a", descricao: "lote trivial: N1, hardware/bits (lacunas, 3 casos)", motor: "python", licao: "n1-m1-01-hardware-bits-e-bytes", passo: 4 },
  { chave: "b", descricao: "exercício típico do N1: for/range (código, 6 casos)", motor: "python", licao: "n1-m4-02-for-e-range", passo: 4 },
  { chave: "c", descricao: "pandas do N4: Series e DataFrame (código, 9 casos)", motor: "dados", licao: "n4-m2-01-series-e-dataframe", passo: 5 },
  { chave: "d", descricao: "scikit-learn do N5: fit/predict/transform (código, 8 casos)", motor: "ml", licao: "n5-m4-01-api-fit-predict-transform", passo: 5 },
  { chave: "e", descricao: "treino numpy do N6: laço de treino (código, 10 casos)", motor: "dados", licao: "n6-m3-02-loop-de-treino-e-gradiente-descendente", passo: 5 },
]

/**
 * Exercícios usados na CARGA, um por motor. São o PRIMEIRO exercício da lição: a preparação do
 * aluno virtual (passos anteriores) é só leitura, previsão e quiz, sem rodar código no executor.
 */
export const ALVOS_CARGA: Readonly<Record<Motor, Alvo>> = {
  python: { chave: "python", descricao: "N1: and/or/not (código, 9 casos)", motor: "python", licao: "n1-m3-04-and-or-not-e-aninhamento", passo: 3 },
  dados: { chave: "dados", descricao: "N4: Series e DataFrame (lacunas, 12 casos)", motor: "dados", licao: "n4-m2-01-series-e-dataframe", passo: 3 },
  ml: { chave: "ml", descricao: "N5: fit/predict/transform (lacunas, 9 casos)", motor: "ml", licao: "n5-m4-01-api-fit-predict-transform", passo: 3 },
}

/** Passo como a API o devolve (o gabarito nunca sai de lá; só ids, ordem e tipo). */
interface ApiStep {
  id: string
  order: number
  kind: string
  test_case_count: number
}

/** Alvo pronto para uso: ids da API + os códigos do pacote. */
export interface AlvoResolvido {
  alvo: Alvo
  lessonId: string
  stepId: string
  /** Passos da lição na API, em ordem. */
  apiSteps: ApiStep[]
  /** Passos do pacote (solução, quiz, previsão…), pela mesma ordem. */
  bundleSteps: BundleStep[]
  /** Solução correta do exercício (projeto completo). */
  correta: ProjectFile[]
  /** Soluções erradas verificadas do pacote. */
  erradas: ProjectFile[][]
  /** Pacotes que o motor Pyodide carrega (define o perfil de worker). */
  perfil: "dados" | "ml" | null
}

/** `ml` quando o alvo pede scikit-learn/scipy/matplotlib…, `dados` nos demais Pyodide, `null` no WASI. */
export function perfilDoMotor(motor: Motor): "dados" | "ml" | null {
  return motor === "python" ? null : motor
}

/**
 * Descobre na API os ids do alvo e confere que o banco tem o MESMO conteúdo do pacote.
 *
 * @throws Error com instrução quando a lição não existe (banco sem importar), está desatualizada
 * ou o passo não é um exercício.
 */
export async function resolverAlvo(client: ApiClient, bundle: ReadonlyMap<string, BundleLesson>, alvo: Alvo): Promise<AlvoResolvido> {
  const lesson = bundle.get(alvo.licao)
  if (!lesson) throw new Error(`lição "${alvo.licao}" não existe no pacote de conteúdo`)
  const bundleStep = lesson.steps.find((step) => step.order === alvo.passo)
  if (bundleStep?.kind !== "exercicio") throw new Error(`o passo ${alvo.passo} de "${alvo.licao}" não é um exercício no pacote`)

  const summaries = await client.request<{ id: string; slug: string | null }[]>("GET", "/api/lessons/summaries")
  const summary = summaries.body?.find((item) => item.slug === alvo.licao)
  if (!summary) {
    throw new Error(`lição "${alvo.licao}" não encontrada na API (${summaries.status}). Importe o pacote atual no banco (pnpm db:seed ou POST /admin/content/import) e confira que o curso está publicado.`)
  }
  const detail = await client.request<{ steps: ApiStep[] }>("GET", `/api/lessons/${summary.id}`)
  const apiSteps = detail.body?.steps.toSorted((a, b) => a.order - b.order)
  if (!apiSteps) throw new Error(`não consegui ler a lição ${alvo.licao} (${detail.status})`)
  const apiStep = apiSteps.find((step) => step.order === alvo.passo)
  if (!apiStep || apiStep.kind !== "exercicio") throw new Error(`o passo ${alvo.passo} de "${alvo.licao}" não é um exercício na API: o banco está desatualizado em relação ao pacote (reimporte).`)
  if (apiSteps.length !== lesson.steps.length || apiStep.test_case_count !== bundleStep.test_cases.length) {
    throw new Error(`a lição "${alvo.licao}" no banco difere do pacote (${apiSteps.length} passos / ${apiStep.test_case_count} casos vs ${lesson.steps.length} / ${bundleStep.test_cases.length}): reimporte o pacote antes de medir.`)
  }
  return {
    alvo,
    lessonId: summary.id,
    stepId: apiStep.id,
    apiSteps,
    bundleSteps: lesson.steps.toSorted((a, b) => a.order - b.order),
    correta: bundleStep.solution_files,
    erradas: bundleStep.wrong_solutions.map((wrong) => wrong.files),
    perfil: perfilDoMotor(alvo.motor),
  }
}

/** Rota do envio de um passo de exercício. */
export function submitRoute(alvo: AlvoResolvido): string {
  return `/api/me/lessons/${alvo.lessonId}/steps/${alvo.stepId}/submit`
}

/** Resposta de `POST …/submit` (só o necessário). */
export interface SubmitResponse {
  passed: boolean
  attempts: number
}

/**
 * Chama a API repetindo quando o limite por usuário responde 429 (espera o `Retry-After` ou 6 s).
 *
 * @throws Error quando a resposta final não é 200.
 */
async function callOrThrow<T>(client: ApiClient, route: string, body: unknown, what: string): Promise<T> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await client.request<T>("POST", route, body)
    if (response.status === 429) {
      await sleep((response.retryAfterSeconds ?? 6) * 1000 + 250)
      continue
    }
    if (response.status !== 200 || response.body === null) throw new Error(`${what}: resposta ${response.status} ${response.code ?? ""}`.trim())
    return response.body
  }
  throw new Error(`${what}: limite de requisições persistente (429)`)
}

/**
 * Corpo de envio de um exercício `ordenar`: as linhas da solução, na ordem, com a indentação
 * (4 espaços por nível) e o `id` do embaralhado correspondente; os distratores ficam de fora.
 */
function arrangementDe(step: BundleStep): { line_id: string; indent: number }[] {
  const pool = [...step.parsons_lines]
  const arrangement: { line_id: string; indent: number }[] = []
  const solution = step.solution_files[0]?.content ?? ""
  for (const rawLine of solution.split("\n")) {
    if (rawLine.trim() === "") continue
    const text = rawLine.trim()
    const position = pool.findIndex((line) => line.text.trim() === text)
    const matched = position >= 0 ? pool.splice(position, 1)[0] : undefined
    if (!matched) throw new Error(`linha "${text}" da solução não está nas linhas embaralhadas do passo ${step.order}`)
    const leading = rawLine.length - rawLine.trimStart().length
    arrangement.push({ line_id: matched.id, indent: Math.round(leading / 4) })
  }
  return arrangement
}

/**
 * Conclui todos os passos ANTERIORES ao alvo, como um aluno que seguiu a lição: lê (leitura),
 * acerta a previsão, passa no quiz e resolve os exercícios.
 *
 * @throws Error se algum passo não concluir (o aluno não está pronto para medir).
 */
export async function prepararAluno(client: ApiClient, alvo: AlvoResolvido): Promise<void> {
  const base = `/api/me/lessons/${alvo.lessonId}/steps`
  for (const apiStep of alvo.apiSteps) {
    if (apiStep.order >= alvo.alvo.passo) break
    const bundleStep = alvo.bundleSteps.find((step) => step.order === apiStep.order)
    if (!bundleStep) throw new Error(`passo ${apiStep.order} sem par no pacote`)
    const what = `passo ${apiStep.order} (${bundleStep.kind}) de ${alvo.alvo.licao}`
    if (bundleStep.kind === "leitura") {
      await callOrThrow(client, `${base}/${apiStep.id}/complete`, {}, what)
    } else if (bundleStep.kind === "previsao") {
      const result = await callOrThrow<{ passed: boolean }>(client, `${base}/${apiStep.id}/predict`, { output: bundleStep.expected_output }, what)
      if (!result.passed) throw new Error(`${what}: a previsão do pacote não passou`)
    } else if (bundleStep.kind === "quiz") {
      const answers = bundleStep.quiz_questions.map((question) => question.correct_index)
      const result = await callOrThrow<{ passed: boolean }>(client, `${base}/${apiStep.id}/quiz`, { answers }, what)
      if (!result.passed) throw new Error(`${what}: o quiz do pacote não passou`)
    } else {
      const body = bundleStep.exercise_mode === "ordenar" ? { arrangement: arrangementDe(bundleStep) } : { files: bundleStep.solution_files }
      const result = await callOrThrow<SubmitResponse>(client, `${base}/${apiStep.id}/submit`, body, what)
      if (!result.passed) throw new Error(`${what}: a solução do pacote não passou na API (conteúdo e banco divergem?)`)
    }
  }
}
