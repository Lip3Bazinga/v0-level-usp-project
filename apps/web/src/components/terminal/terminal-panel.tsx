"use client"

import "@xterm/xterm/css/xterm.css"
import { ImageOff, Square } from "lucide-react"
import type { ProjectFile } from "@levelusp/contracts"
import { Spinner } from "@/components/design-system/spinner"
import { useTerminal } from "@/hooks/use-terminal"
import type { TerminalClient } from "@/lib/python/terminal-client"
import { cn } from "@/lib/utils"

interface TerminalPanelProps {
  /** Arquivos do projeto (o que `ls`, `cat` e `python arquivo.py` enxergam). */
  files: readonly ProjectFile[]
  /** Cliente do Pyodide; só os testes passam um. */
  client?: TerminalClient
  /** Foca o terminal ao abrir. */
  autoFocus?: boolean
}

const TOOL_BUTTON_CLASS = "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-50"

/**
 * Terminal do aluno: xterm.js sobre o Pyodide, com `python arquivo.py`, REPL, `ls`, `cat`,
 * `clear`, `pip list` e `help`. Os gráficos do matplotlib aparecem num painel ao lado.
 * Carregue-o com `next/dynamic` (ver `LazyTerminalPanel`): o xterm não entra no bundle inicial.
 */
export function TerminalPanel({ files, client, autoFocus = false }: TerminalPanelProps): React.JSX.Element {
  const { containerRef, isLoaded, phase, figures, stop, clearFigures } = useTerminal({ files, ...(client ? { client } : {}), autoFocus })
  const isRunning = phase !== "prompt"

  return (
    <section aria-label="Terminal" className="flex h-full min-h-0 flex-col bg-gray-900 text-gray-200">
      <div className="flex items-center justify-between gap-2 border-b border-gray-700 px-3 py-1">
        <p className="text-xs text-gray-400">
          <kbd className="rounded bg-gray-800 px-1">Ctrl+C</kbd> interrompe · <kbd className="rounded bg-gray-800 px-1">Tab</kbd> sai do terminal
        </p>
        <button
          type="button"
          onClick={stop}
          disabled={!isRunning}
          className={cn(TOOL_BUTTON_CLASS, "bg-red-600 text-white hover:bg-red-700")}
          aria-label="Parar o programa em execução no terminal"
        >
          <Square className="h-3.5 w-3.5" aria-hidden="true" /> Parar
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-40 min-w-0 flex-1 p-2">
          {!isLoaded && (
            <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Spinner tone="brand" /> Abrindo o terminal…
            </div>
          )}
          <div ref={containerRef} className="h-full w-full" />
        </div>
        {figures.length > 0 && (
          <aside aria-label="Gráficos do matplotlib" className="flex max-h-64 min-h-0 flex-col border-t border-gray-700 bg-white text-gray-900 lg:max-h-none lg:w-2/5 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-600">Gráficos</h3>
              <button type="button" onClick={clearFigures} className={cn(TOOL_BUTTON_CLASS, "text-gray-600 hover:bg-gray-100")}>
                <ImageOff className="h-3.5 w-3.5" aria-hidden="true" /> Fechar gráficos
              </button>
            </div>
            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {figures.map((figure, index) => (
                <li key={`${index}-${figure.length}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- PNG gerado no navegador (data URL), sem otimização possível */}
                  <img src={`data:image/png;base64,${figure}`} alt={`Gráfico ${index + 1} gerado pelo matplotlib`} className="mx-auto h-auto max-w-full" />
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
      <p role="status" className="sr-only">
        {figures.length > 0 ? `${figures.length} ${figures.length > 1 ? "gráficos disponíveis" : "gráfico disponível"} no painel ao lado do terminal.` : ""}
      </p>
    </section>
  )
}
