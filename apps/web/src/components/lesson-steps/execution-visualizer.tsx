"use client"

import { useState, type KeyboardEvent } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react"
import { MAX_TRACE_STEPS, type ProjectTrace, type TraceVariable } from "@/lib/python/project-execution"
import { cn } from "@/lib/utils"
import { changedVariables, clampStepIndex, describeTraceStep, stdoutAtStep, stepIndexForKey, traceVariableKey, type TraceScope } from "@/lib/utils/execution-trace"

interface ExecutionVisualizerProps {
  /** Código executado (o arquivo de entrada), para mostrar com a linha atual destacada. */
  code: string
  trace: ProjectTrace
  onClose?: (() => void) | undefined
}

const NAV_BUTTON_CLASS = "flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-level-purple-dark hover:bg-level-purple-light disabled:opacity-40"

/**
 * Visualizador de execução (estilo Python Tutor): o código com a linha atual destacada, as
 * variáveis de cada passo (as que mudaram em destaque) e a saída impressa até ali. Navegação
 * por botões, controle deslizante e teclado (setas, Home e End).
 */
export function ExecutionVisualizer({ code, trace, onClose }: ExecutionVisualizerProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const total = trace.steps.length
  const index = clampStepIndex(selectedIndex, total)
  const step = trace.steps[index]
  const isLast = index === total - 1

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // O controle deslizante já trata as setas sozinho.
    if (event.target instanceof HTMLInputElement) return
    const next = stepIndexForKey(event.key, index, total)
    if (next === null) return
    event.preventDefault()
    setSelectedIndex(next)
  }

  if (!step) {
    return (
      <div className="rounded-xl border border-border bg-white p-4 text-sm text-gray-700">
        <p role="status">{trace.error ? `O código parou antes da primeira linha: ${trace.error.summary}` : "O código não tem linhas para executar."}</p>
        {onClose && <button type="button" onClick={onClose} className={cn(NAV_BUTTON_CLASS, "mt-3")}>Fechar</button>}
      </div>
    )
  }

  const changed = changedVariables(trace.steps[index - 1], step)
  const lines = code.replace(/\n$/, "").split("\n")
  const output = stdoutAtStep(trace, index)

  return (
    // O grupo recebe foco (tabIndex) para os atalhos de teclado descritos no rótulo.
    <div role="group" aria-label="Visualizador de execução. Use as setas esquerda e direita para andar pelos passos." tabIndex={0} onKeyDown={handleKeyDown} className="lesson-widget rounded-xl border-2 border-level-purple/30 bg-white text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-level-purple">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-xs font-bold uppercase tracking-wide text-level-purple">Execução passo a passo</p>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fechar o visualizador" className="rounded p-1 text-muted-foreground hover:bg-level-purple-light hover:text-level-purple">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="grid gap-3 p-3 md:grid-cols-2">
        <ol aria-label="Código em execução" className="overflow-x-auto rounded-lg bg-gray-900 py-2 font-mono text-xs text-gray-100">
          {lines.map((line, lineIndex) => {
            const isCurrent = step.event !== "end" && step.line === lineIndex + 1
            return (
              <li key={lineIndex} aria-current={isCurrent ? "true" : undefined} className={cn("flex whitespace-pre px-2", isCurrent && "bg-level-purple/60 font-semibold")}>
                <span aria-hidden="true" className="mr-3 w-6 shrink-0 select-none text-right text-gray-500">{lineIndex + 1}</span>
                <span>{line === "" ? " " : line}</span>
              </li>
            )
          })}
        </ol>

        <div className="space-y-3">
          <VariableTable title="Variáveis globais" scope="global" variables={step.globals} changed={changed} />
          {step.locals && <VariableTable title={`Variáveis locais de ${step.function_name ?? "função"}`} scope="local" variables={step.locals} changed={changed} />}
          <div>
            <p className="mb-1 text-xs font-bold text-level-purple-dark">Saída até aqui</p>
            <pre aria-label="Saída até este passo" className="max-h-40 min-h-8 overflow-auto rounded-lg bg-gray-900 p-2 font-mono text-xs text-gray-100">{output === "" ? <span className="text-gray-500">(nada impresso ainda)</span> : output}</pre>
          </div>
        </div>
      </div>

      {isLast && trace.error && <p role="alert" className="mx-3 mb-3 rounded-lg bg-red-50 p-2 font-mono text-xs text-red-700">O programa parou com erro nesta linha: {trace.error.summary}</p>}
      {trace.truncated && (
        <p role="status" className="mx-3 mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
          A execução passou de {MAX_TRACE_STEPS} passos e foi interrompida: só os primeiros {total} aparecem aqui. Confira se algum laço não termina.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        <button type="button" onClick={() => setSelectedIndex(0)} disabled={index === 0} aria-label="Primeiro passo" className={NAV_BUTTON_CLASS}>
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setSelectedIndex(index - 1)} disabled={index === 0} className={NAV_BUTTON_CLASS}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
        </button>
        <button type="button" onClick={() => setSelectedIndex(index + 1)} disabled={isLast} className={NAV_BUTTON_CLASS}>
          Próximo <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setSelectedIndex(total - 1)} disabled={isLast} aria-label="Último passo" className={NAV_BUTTON_CLASS}>
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          type="range"
          min={1}
          max={total}
          value={index + 1}
          onChange={(event) => setSelectedIndex(Number(event.target.value) - 1)}
          aria-label="Passo da execução"
          aria-valuetext={describeTraceStep(step, index, total)}
          className="min-w-32 flex-1 accent-level-purple"
        />
        <p aria-live="polite" className="w-full text-xs text-muted-foreground">{describeTraceStep(step, index, total)}</p>
      </div>
    </div>
  )
}

interface VariableTableProps {
  title: string
  scope: TraceScope
  variables: readonly TraceVariable[]
  /** Chaves (`traceVariableKey`) das variáveis que mudaram neste passo. */
  changed: ReadonlySet<string>
}

function VariableTable({ title, scope, variables, changed }: VariableTableProps): React.JSX.Element {
  return (
    <table className="w-full border-collapse text-xs">
      <caption className="mb-1 text-left text-xs font-bold text-level-purple-dark">{title}</caption>
      <tbody>
        {variables.length === 0 && (
          <tr><td className="rounded-lg border border-dashed border-border p-2 text-muted-foreground">Nenhuma variável ainda.</td></tr>
        )}
        {variables.map((variable) => {
          const isChanged = changed.has(traceVariableKey(scope, variable.name))
          return (
            <tr key={variable.name} data-changed={isChanged ? "true" : undefined} className={cn(isChanged && "bg-amber-100")}>
              <th scope="row" className="border border-border px-2 py-1 text-left font-mono font-semibold">{variable.name}</th>
              <td className="border border-border px-2 py-1 font-mono">
                {variable.value}
                {isChanged && <span className="sr-only"> (mudou neste passo)</span>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
