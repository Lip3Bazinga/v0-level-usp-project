import type { Checkpoint, LessonStep, LessonStepProgress, ProjectFile, StepCaseResult, StepOutcome } from "@levelusp/contracts"
import { MAIN_FILE_PATH, STORAGE_KEYS } from "@/lib/constants"
import type { CompletionLike } from "@/contexts/progress-context"

/** Situação de um passo na lista lateral. */
export type StepState = "completed" | "current" | "available" | "locked"

/** Resultado de uma instrução numerada depois do "Verificar". */
export type CheckpointStatus = "pending" | "passed" | "failed"

/** Se o aluno já concluiu o passo. */
export function isStepCompleted(progressByStep: ReadonlyMap<string, LessonStepProgress>, stepId: string): boolean {
  return progressByStep.get(stepId)?.status === "completed"
}

/** Índice do primeiro passo ainda não concluído; o último quando todos estão concluídos (lição revisitada). */
export function firstPendingStepIndex(steps: readonly LessonStep[], progressByStep: ReadonlyMap<string, LessonStepProgress>): number {
  const pending = steps.findIndex((step) => !isStepCompleted(progressByStep, step.id))
  return pending === -1 ? Math.max(steps.length - 1, 0) : pending
}

/**
 * Situação de cada passo: os concluídos podem ser revistos, o primeiro pendente está
 * liberado (`available`, ou `current` quando é o que está na tela) e os seguintes ficam
 * travados — a API recusa passos fora de ordem.
 */
export function stepStates(steps: readonly LessonStep[], progressByStep: ReadonlyMap<string, LessonStepProgress>, currentIndex: number): StepState[] {
  const firstPending = steps.findIndex((step) => !isStepCompleted(progressByStep, step.id))
  return steps.map((step, index) => {
    if (index === currentIndex) return "current"
    if (isStepCompleted(progressByStep, step.id)) return "completed"
    return index === firstPending ? "available" : "locked"
  })
}

/**
 * Marca cada instrução com ✓ ou ✗ a partir dos casos do último "Verificar": falhou se algum
 * caso dela falhou; passou se todos os casos dela passaram. Instrução sem caso próprio
 * acompanha o veredito geral. Antes de verificar, tudo fica pendente.
 */
export function checkpointStatuses(checkpoints: readonly Checkpoint[], cases: readonly StepCaseResult[] | null): Map<number, CheckpointStatus> {
  const statuses = new Map<number, CheckpointStatus>()
  const allPassed = cases !== null && cases.length > 0 && cases.every((result) => result.passed)
  for (const checkpoint of checkpoints) {
    const own = cases?.filter((result) => result.checkpoint === checkpoint.id) ?? []
    if (cases === null) statuses.set(checkpoint.id, "pending")
    else if (own.length === 0) statuses.set(checkpoint.id, allPassed ? "passed" : "pending")
    else statuses.set(checkpoint.id, own.every((result) => result.passed) ? "passed" : "failed")
  }
  return statuses
}

/** A solução pode ser pedida depois de `solutionAfterAttempts` verificações reprovadas (0 = nunca) ou com o passo concluído. */
export function canRevealSolution(progress: LessonStepProgress | undefined, solutionAfterAttempts: number): boolean {
  if (progress?.status === "completed" || progress?.solution_viewed) return true
  return solutionAfterAttempts > 0 && (progress?.attempts ?? 0) >= solutionAfterAttempts
}

/** Progresso local de um passo depois de uma resposta da API (a linha pode ainda não existir). */
export function mergeStepProgress(current: LessonStepProgress | undefined, stepId: string, patch: Partial<LessonStepProgress>): LessonStepProgress {
  return {
    step_id: stepId,
    status: "in_progress",
    attempts: 0,
    hints_revealed: 0,
    solution_viewed: false,
    xp_awarded: 0,
    completed_at: null,
    ...current,
    ...patch,
  }
}

/** Efeito de um passo no formato que o `ProgressContext.applyCompletion` entende. */
export function toCompletionLike(outcome: StepOutcome): CompletionLike {
  return {
    lesson_completed: outcome.lesson_completed,
    xp_awarded: outcome.xp_awarded,
    new_badges: outcome.granted_badges,
    level_up: outcome.level_up,
    new_level: outcome.new_level,
  }
}

function isProjectFiles(value: unknown): value is ProjectFile[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((file: unknown) => typeof file === "object" && file !== null && "path" in file && typeof file.path === "string" && "content" in file && typeof file.content === "string")
  )
}

/** Rascunho do passo guardado no navegador; null quando não há, está corrompido ou o `localStorage` está bloqueado. */
export function readStepDraft(stepId: string): ProjectFile[] | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEYS.stepDraftPrefix}${stepId}`)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return isProjectFiles(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Guarda o rascunho do passo no navegador; falha em silêncio (modo privado, cota cheia). */
export function writeStepDraft(stepId: string, files: readonly ProjectFile[]): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEYS.stepDraftPrefix}${stepId}`, JSON.stringify(files))
  } catch {
    // Sem armazenamento, o aluno só perde o rascunho ao recarregar; a lição continua funcionando.
  }
}

/** Apaga o rascunho do passo (ao restaurar o código inicial). */
export function clearStepDraft(stepId: string): void {
  try {
    window.localStorage.removeItem(`${STORAGE_KEYS.stepDraftPrefix}${stepId}`)
  } catch {
    // Nada a fazer: sem armazenamento não havia rascunho.
  }
}

/**
 * Código com que o aluno começa o passo `index`: o código inicial do passo; se o passo não
 * traz um, o que ele escreveu no exercício anterior (rascunho) ou o inicial daquele; por
 * fim um `main.py` vazio. `readDraft` é injetado para o teste.
 */
export function initialStepFiles(steps: readonly LessonStep[], index: number, readDraft: (stepId: string) => ProjectFile[] | null = readStepDraft): ProjectFile[] {
  const step = steps[index]
  if (step && step.starter_files.length > 0) return step.starter_files
  for (let previous = index - 1; previous >= 0; previous--) {
    const candidate = steps[previous]
    if (candidate?.kind !== "exercicio") continue
    const draft = readDraft(candidate.id)
    if (draft) return draft
    if (candidate.starter_files.length > 0) return candidate.starter_files
  }
  return [{ path: MAIN_FILE_PATH, content: "" }]
}
