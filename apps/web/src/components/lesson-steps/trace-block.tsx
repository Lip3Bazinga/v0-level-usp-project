"use client"

import { Footprints, Loader2 } from "lucide-react"
import { MAIN_FILE_PATH } from "@/lib/constants"
import { ExecutionVisualizer } from "./execution-visualizer"
import { useExecutionTrace } from "./use-execution-trace"

interface TraceBlockProps {
  /** Código do bloco ```python visualizar. */
  code: string
}

/**
 * Bloco de código da narrativa com o botão "Visualizar": roda o código no navegador e mostra a
 * execução passo a passo logo abaixo. O Python só é carregado quando o aluno clica.
 */
export function TraceBlock({ code }: TraceBlockProps): React.JSX.Element {
  const { state, start, close } = useExecutionTrace()

  return (
    <div className="my-3">
      {state.status !== "ready" && <pre className="!mb-0"><code>{code}</code></pre>}
      {state.status === "ready" ? (
        <ExecutionVisualizer code={state.code} trace={state.trace} onClose={close} />
      ) : (
        <button
          type="button"
          onClick={() => start([{ path: MAIN_FILE_PATH, content: code }], MAIN_FILE_PATH)}
          disabled={state.status === "loading"}
          className="mt-2 flex items-center gap-2 rounded-lg border border-level-purple px-3 py-1.5 text-xs font-semibold text-level-purple hover:bg-level-purple-light disabled:opacity-60"
        >
          {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Footprints className="h-4 w-4" aria-hidden="true" />}
          {state.status === "loading" ? "Preparando a visualização…" : "Visualizar"}
        </button>
      )}
      {state.status === "error" && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{state.message}</p>}
    </div>
  )
}
