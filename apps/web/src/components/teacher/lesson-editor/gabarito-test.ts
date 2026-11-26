import {
  draftExerciseStepSchema,
  type DraftStepVerifyInput, type DraftStepVerifyResult, type LessonRuntime, type LessonStepInput,
} from "@levelusp/contracts"
import { MAIN_FILE_PATH } from "@/lib/constants"

/** Solução errada digitada no painel "Testar gabarito": vive só na memória do editor, nunca é salva. */
export interface WrongSolutionDraft {
  name: string
  /** Conteúdo do `main.py`; os demais arquivos vêm da solução de referência. */
  code: string
}

/** Soluções erradas de cada passo, pela `order` do passo. */
export type WrongSolutionsByStep = Readonly<Record<number, readonly WrongSolutionDraft[]>>

/**
 * Acompanha a renumeração dos passos (remover ou mover): cada lista de soluções erradas vai para a
 * `order` nova do seu passo e as do passo removido são descartadas.
 *
 * @param previousOrders para cada posição da lista nova de passos, a `order` que o passo dali tinha.
 */
export function remapWrongSolutions(wrongSolutions: WrongSolutionsByStep, previousOrders: readonly number[]): WrongSolutionsByStep {
  const remapped: Record<number, readonly WrongSolutionDraft[]> = {}
  previousOrders.forEach((previousOrder, index) => {
    const drafts = wrongSolutions[previousOrder]
    if (drafts && drafts.length > 0) remapped[index + 1] = drafts
  })
  return remapped
}

/** O que o teste do gabarito lê do formulário da lição (o estado ainda não salvo). */
export interface GabaritoLesson {
  runtime: LessonRuntime
  libraries: readonly string[]
  steps: readonly LessonStepInput[]
}

/** Situação de um passo no painel de teste do gabarito. */
export type StepTestState =
  | { status: "pending" }
  | { status: "running" }
  /** O teste parou antes deste passo (limite de pedidos ou corretor fora do ar). */
  | { status: "skipped" }
  | { status: "done"; result: DraftStepVerifyResult; signature: string }
  | { status: "error"; message: string; signature: string }

/** Pedido de teste de um passo, ou o motivo (pt-BR) de ele não poder ser enviado. */
export type GabaritoRequest = { ok: true; input: DraftStepVerifyInput } | { ok: false; error: string }

/** Passos que têm gabarito para testar: os de exercício, na ordem da lição. */
export function exerciseSteps(steps: readonly LessonStepInput[]): LessonStepInput[] {
  return steps.filter((step) => step.kind === "exercicio")
}

/**
 * Código inicial herdado de um passo sem código inicial próprio: a solução do exercício anterior
 * (a mesma regra de `pnpm content:verify` para lições guiadas). null quando não há de quem herdar.
 */
export function inheritedStarterOf(steps: readonly LessonStepInput[], step: LessonStepInput): DraftStepVerifyInput["inherited_starter"] {
  const previous = exerciseSteps(steps).filter((candidate) => candidate.order < step.order && candidate.solution_files.length > 0).pop()
  return previous ? { order: previous.order, files: previous.solution_files } : null
}

/** Rascunhos com código viram soluções erradas do pedido; sem nome, ganham um pela posição. */
export function toWrongSolutions(drafts: readonly WrongSolutionDraft[]): DraftStepVerifyInput["step"]["wrong_solutions"] {
  return drafts
    .map((draft, index) => ({ name: draft.name.trim() === "" ? `Solução errada ${index + 1}` : draft.name.trim(), code: draft.code }))
    .filter((draft) => draft.code.trim() !== "")
    .map((draft) => ({ name: draft.name, files: [{ path: MAIN_FILE_PATH, content: draft.code }] }))
}

/**
 * Monta o pedido de teste de um passo com o contrato da API; passo incompleto (sem casos, sem
 * lacunas, linhas que não montam a solução…) devolve a primeira mensagem de validação.
 */
export function buildVerifyRequest(lesson: GabaritoLesson, step: LessonStepInput, drafts: readonly WrongSolutionDraft[]): GabaritoRequest {
  const parsed = draftExerciseStepSchema.safeParse({ ...step, wrong_solutions: toWrongSolutions(drafts) })
  if (!parsed.success) {
    const [issue] = parsed.error.issues
    return { ok: false, error: issue ? `${issue.path.join(".") || "passo"}: ${issue.message}` : "Passo inválido." }
  }
  return { ok: true, input: { runtime: lesson.runtime, libraries: [...lesson.libraries], step: parsed.data, inherited_starter: inheritedStarterOf(lesson.steps, step) } }
}

/**
 * Assinatura do que o teste de um passo usou (motor, gabarito do passo, código herdado e soluções
 * erradas): se ela muda depois do teste, o resultado mostrado está desatualizado.
 */
export function requestSignature(lesson: GabaritoLesson, step: LessonStepInput, drafts: readonly WrongSolutionDraft[]): string {
  return JSON.stringify([
    lesson.runtime, lesson.libraries, step.exercise_mode, step.starter_files, step.solution_files, step.parsons_lines, step.test_cases,
    inheritedStarterOf(lesson.steps, step), toWrongSolutions(drafts),
  ])
}
