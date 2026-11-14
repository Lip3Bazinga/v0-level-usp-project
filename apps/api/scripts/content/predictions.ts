import {
  DEFAULT_ENTRY_FILE, DEFAULT_RUNNER_LIMITS, MAX_EXPECTED_OUTPUT_LENGTH,
  type BundleCourse, type BundleLesson, type BundleModule, type BundleStep, type ProjectFile, type RunnerJob, type RunnerResult,
} from "@levelusp/contracts"
import { matchesPrediction, normalizePredictionOutput } from "../../src/modules/learning/steps.domain"
import type { CompiledBundle, CompiledContent } from "./compiler"
import { FLAG_VISUALIZE, scanMarkdown, toSourceLines } from "./markdown"
import { problemAt, type ContentProblem } from "./source-map"

/**
 * Trechos que só o executor REAL sabe responder: a saída esperada de cada passo
 * `Previsão` (gerada no `content:build`, nunca escrita à mão no pacote) e os blocos
 * ```python visualizar das narrativas (o `content:verify` confere que rodam sem erro).
 */

/** O que estes comandos precisam do executor (o mesmo contrato do `content:verify`). */
export interface SnippetRunner {
  run(job: RunnerJob): Promise<RunnerResult>
}

/** Restringe a um curso e/ou a uma lição (slugs). */
export interface SnippetFilter {
  course?: string
  lesson?: string
}

/** Um passo com o contexto de onde está no pacote. */
export interface StepLocation {
  course: BundleCourse
  module: BundleModule
  lesson: BundleLesson
  step: BundleStep
}

/** Linhas de saída que um passo Previsão pode ter (mais que isso não cabe numa resposta digitada). */
export const MAX_PREDICTION_LINES = 20
const RUN_PROBE_ID = "saida"
const MAX_ERROR_LENGTH = 300

/** Resultado de rodar um programa sem entrada: a saída padrão, ou por que não deu certo. */
export type SnippetRun = { ok: true; stdout: string } | { ok: false; message: string }

/** Todos os passos do pacote, na ordem, respeitando o filtro. */
export function listSteps(bundle: Pick<CompiledBundle, "courses">, filter: SnippetFilter = {}): StepLocation[] {
  const steps: StepLocation[] = []
  for (const course of bundle.courses) {
    if (filter.course !== undefined && course.slug !== filter.course) continue
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (filter.lesson !== undefined && lesson.slug !== filter.lesson) continue
        for (const step of lesson.steps) steps.push({ course, module, lesson, step })
      }
    }
  }
  return steps
}

/** Passos `Previsão` do pacote. */
export function listPredictionSteps(bundle: Pick<CompiledBundle, "courses">, filter: SnippetFilter = {}): StepLocation[] {
  return listSteps(bundle, filter).filter(({ step }) => step.kind === "previsao")
}

/**
 * Roda `main.py` do projeto no executor, sem entrada, com o motor da lição.
 * Erro do programa, estouro de tempo e saída truncada voltam como `ok: false`.
 *
 * @throws Error quando o executor não responde (repassa o erro do `SnippetRunner`).
 */
export async function runSnippet(runner: SnippetRunner, lesson: BundleLesson, files: ProjectFile[]): Promise<SnippetRun> {
  const result = await runner.run({
    files,
    entry: DEFAULT_ENTRY_FILE,
    probes: [{ id: RUN_PROBE_ID, kind: "run", stdin: "" }],
    limits: { ...DEFAULT_RUNNER_LIMITS },
    runtime: lesson.runtime,
    ...(lesson.runtime === "python-dados" ? { libraries: lesson.libraries } : {}),
  })
  const observation = result.observations.find((candidate) => candidate.id === RUN_PROBE_ID)
  if (!observation) return { ok: false, message: "o executor não devolveu a observação da execução" }
  if (observation.timedOut) return { ok: false, message: "o programa estourou o tempo limite" }
  // O executor manda `error: null` quando não houve erro (o tipo do contrato só prevê a ausência).
  const error: unknown = observation.error
  if (!observation.ok || typeof error === "string") {
    return { ok: false, message: `o programa terminou com erro: ${(typeof error === "string" ? error : "erro desconhecido").slice(0, MAX_ERROR_LENGTH)}` }
  }
  if (observation.truncated) return { ok: false, message: "a saída do programa foi truncada (grande demais)" }
  return { ok: true, stdout: observation.stdout ?? "" }
}

/** Por que uma saída não serve como gabarito de previsão, ou null quando serve. */
export function describeUnusableOutput(output: string): string | null {
  if (output === "") return "o programa não imprime nada: uma previsão precisa de saída"
  if (output.length > MAX_EXPECTED_OUTPUT_LENGTH) return `a saída tem ${output.length} caracteres (máximo ${MAX_EXPECTED_OUTPUT_LENGTH})`
  const lines = output.split("\n").length
  return lines > MAX_PREDICTION_LINES ? `a saída tem ${lines} linhas (máximo ${MAX_PREDICTION_LINES}: o aluno precisa digitá-la)` : null
}

/**
 * Gera, no executor real, a saída esperada de cada passo `Previsão` do conteúdo compilado e
 * a grava em `expected_output` (o pacote só é validado depois). Quando o autor escreveu
 * `### Saída esperada`, a saída gerada precisa bater com ela. Devolve os problemas (vazio = tudo gerado).
 */
export async function generatePredictions(compiled: CompiledContent, runner: SnippetRunner): Promise<ContentProblem[]> {
  const problems: ContentProblem[] = []
  for (const { lesson, step } of listPredictionSteps(compiled.bundle)) {
    const flag = (field: string, message: string): void => {
      problems.push(problemAt(compiled.locations.getField(step, field), lesson.slug, `passo ${step.order} (Previsão · ${step.title}): ${message}`))
    }
    let run: SnippetRun
    try {
      run = await runSnippet(runner, lesson, step.starter_files)
    } catch (error) {
      flag("starter_files", `executor: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!run.ok) {
      flag("starter_files", run.message)
      continue
    }
    const generated = normalizePredictionOutput(run.stdout)
    const unusable = describeUnusableOutput(generated)
    if (unusable !== null) flag("starter_files", unusable)
    else if (step.expected_output !== "" && !matchesPrediction(generated, step.expected_output)) {
      flag("expected_output", `a ### Saída esperada escrita não bate com a saída real do programa (${JSON.stringify(generated)})`)
    }
    step.expected_output = generated
  }
  return problems
}

/** Um bloco ```python visualizar de uma narrativa. */
export interface VisualizeBlock {
  /** Posição do bloco na narrativa (1 = primeiro bloco visualizar do passo). */
  index: number
  code: string
}

/** Blocos ```python visualizar da narrativa de um passo, na ordem. */
export function listVisualizeBlocks(narrativeMarkdown: string): VisualizeBlock[] {
  const blocks: VisualizeBlock[] = []
  for (const node of scanMarkdown(toSourceLines(narrativeMarkdown))) {
    if (node.kind === "fence" && node.attributes[FLAG_VISUALIZE] !== undefined) blocks.push({ index: blocks.length + 1, code: `${node.body.join("\n")}\n` })
  }
  return blocks
}

/** Veredito de um trecho executado: `ok`, `falha` (o conteúdo está errado) ou `erro` (o executor falhou). */
export interface SnippetVerdict {
  location: StepLocation
  label: string
  status: "ok" | "falha" | "erro"
  detail: string
}

async function verifyOne(runner: SnippetRunner, location: StepLocation, label: string, files: ProjectFile[], expectedOutput: string | null): Promise<SnippetVerdict> {
  try {
    const run = await runSnippet(runner, location.lesson, files)
    if (!run.ok) return { location, label, status: "falha", detail: run.message }
    if (expectedOutput !== null && !matchesPrediction(expectedOutput, run.stdout)) {
      return { location, label, status: "falha", detail: "a saída desta execução difere da saída esperada gravada (o programa não é determinístico?)" }
    }
    return { location, label, status: "ok", detail: expectedOutput === null ? "executa sem erro" : "a saída gerada bate com a esperada" }
  } catch (error) {
    return { location, label, status: "erro", detail: `executor: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * Verificação, no executor real, dos passos `Previsão` (uma nova execução precisa reproduzir
 * a saída esperada do pacote) e dos blocos visualizar (precisam rodar sem erro).
 */
export async function verifySnippets(bundle: Pick<CompiledBundle, "courses">, runner: SnippetRunner, filter: SnippetFilter = {}): Promise<SnippetVerdict[]> {
  const verdicts: SnippetVerdict[] = []
  for (const location of listSteps(bundle, filter)) {
    const { step } = location
    if (step.kind === "previsao") verdicts.push(await verifyOne(runner, location, "previsão", step.starter_files, step.expected_output))
    for (const block of listVisualizeBlocks(step.narrative_markdown)) {
      verdicts.push(await verifyOne(runner, location, `bloco visualizar ${block.index}`, [{ path: DEFAULT_ENTRY_FILE, content: block.code }], null))
    }
  }
  return verdicts
}

const STATUS_TAGS: Readonly<Record<SnippetVerdict["status"], string>> = { ok: "OK   ", falha: "FALHA", erro: "ERRO " }

/** Linha do relatório de um trecho, no estilo dos passos de exercício. */
export function formatSnippetVerdict(verdict: SnippetVerdict): string {
  const { lesson, step } = verdict.location
  return `  ${STATUS_TAGS[verdict.status]} ${lesson.slug} · passo ${String(step.order).padStart(2, "0")} · ${verdict.label}: ${verdict.detail}`
}
