"use client"

import { Footprints, Loader2, Play, RotateCcw, Square } from "lucide-react"

interface RunToolbarProps {
  title: string
  isRunning: boolean
  /** O visualizador está preparando a execução passo a passo. */
  isTracing: boolean
  onRun: () => void
  onStop: () => void
  onVisualize: () => void
  onReset: () => void
}

const TOOL_BUTTON_CLASS = "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"

/** Barra dos exercícios sem editor livre (lacunas e ordenar): Executar/Parar, Visualizar e Recomeçar. */
export function RunToolbar({ title, isRunning, isTracing, onRun, onStop, onVisualize, onReset }: RunToolbarProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-white px-3 py-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-level-purple">{title}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onReset} className={`${TOOL_BUTTON_CLASS} text-muted-foreground hover:bg-level-purple-light hover:text-level-purple`}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Recomeçar
        </button>
        <button type="button" onClick={onVisualize} disabled={isTracing || isRunning} className={`${TOOL_BUTTON_CLASS} border border-level-purple text-level-purple hover:bg-level-purple-light`}>
          {isTracing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Footprints className="h-4 w-4" aria-hidden="true" />} Visualizar
        </button>
        {isRunning ? (
          <button type="button" onClick={onStop} className={`${TOOL_BUTTON_CLASS} bg-red-600 text-white hover:bg-red-700`}>
            <Square className="h-4 w-4" aria-hidden="true" /> Parar
          </button>
        ) : (
          <button type="button" onClick={onRun} className={`${TOOL_BUTTON_CLASS} bg-level-purple text-white hover:bg-level-purple-dark`}>
            <Play className="h-4 w-4" aria-hidden="true" /> Executar
          </button>
        )}
      </div>
    </div>
  )
}
