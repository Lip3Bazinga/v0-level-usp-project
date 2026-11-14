import { MAX_TRACE_STEPS, type ProjectTrace, type TraceStep, type TraceVariable } from "@/lib/python/project-execution"

/** Escopo de uma variável no painel do visualizador. */
export type TraceScope = "global" | "local"

/** Chave única de uma variável num passo (`global:total`, `local:nota`). */
export function traceVariableKey(scope: TraceScope, name: string): string {
  return `${scope}:${name}`
}

function changedInScope(scope: TraceScope, previous: readonly TraceVariable[], current: readonly TraceVariable[], changed: Set<string>): void {
  const before = new Map(previous.map((variable) => [variable.name, variable.value]))
  for (const variable of current) {
    if (before.get(variable.name) !== variable.value) changed.add(traceVariableKey(scope, variable.name))
  }
}

/**
 * Variáveis que apareceram ou mudaram de valor entre dois passos (chaves de
 * {@link traceVariableKey}). Sem passo anterior, tudo o que existe é novidade. As locais só são
 * comparadas dentro da mesma função: ao entrar em outra, todas as locais contam como novas.
 */
export function changedVariables(previous: TraceStep | undefined, current: TraceStep): Set<string> {
  const changed = new Set<string>()
  changedInScope("global", previous?.globals ?? [], current.globals, changed)
  const isSameFunction = previous?.function_name === current.function_name
  changedInScope("local", isSameFunction ? (previous.locals ?? []) : [], current.locals ?? [], changed)
  return changed
}

/**
 * Garante o limite de passos também do lado da página: um registro maior que
 * {@link MAX_TRACE_STEPS} é cortado e marcado como `truncated`.
 */
export function limitTrace(trace: ProjectTrace, maxSteps: number = MAX_TRACE_STEPS): ProjectTrace {
  if (trace.steps.length <= maxSteps) return trace
  return { ...trace, steps: trace.steps.slice(0, maxSteps), truncated: true }
}

/** Saída impressa até o passo `index` (inclusive o que as linhas anteriores imprimiram). */
export function stdoutAtStep(trace: ProjectTrace, index: number): string {
  return trace.stdout.slice(0, trace.steps[index]?.stdout_length ?? 0)
}

/** Mantém o índice do passo dentro de 0..total-1 (0 quando não há passos). */
export function clampStepIndex(index: number, total: number): number {
  return Math.min(Math.max(index, 0), Math.max(total - 1, 0))
}

/**
 * Passo para onde um atalho de teclado leva: setas esquerda/direita (anterior/próximo), Home
 * (primeiro) e End (último). Devolve null para as demais teclas.
 */
export function stepIndexForKey(key: string, index: number, total: number): number | null {
  switch (key) {
    case "ArrowLeft":
      return clampStepIndex(index - 1, total)
    case "ArrowRight":
      return clampStepIndex(index + 1, total)
    case "Home":
      return 0
    case "End":
      return clampStepIndex(total - 1, total)
    default:
      return null
  }
}

/** Frase que descreve o passo para leitores de tela e para o rodapé do visualizador. */
export function describeTraceStep(step: TraceStep, index: number, total: number): string {
  const position = `Passo ${index + 1} de ${total}`
  if (step.event === "end") return `${position}: fim do programa`
  const where = step.function_name ? `linha ${step.line}, na função ${step.function_name}` : `linha ${step.line}`
  return step.event === "return" ? `${position}: a função ${step.function_name ?? ""} devolve o resultado (${where})` : `${position}: prestes a executar a ${where}`
}
