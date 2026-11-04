"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Terminal, Trash2, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Spinner } from "@/components/design-system/spinner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ConsoleOutput, ConsoleOutputType } from "@/lib/types"
import { downloadText, formatTime, cn } from "@/lib/utils"

interface ConsolePanelProps {
  outputs: ConsoleOutput[]
  onClear: () => void
  isRunning: boolean
  /** Chamado quando o usuário pressiona Enter no input >>>. Recebe o comando digitado. */
  onRunCommand?: (command: string) => void
}

const MAX_HISTORY_SIZE = 50
const DOWNLOAD_FILE_NAME = "console-output.txt"
const FIGURE_MAX_HEIGHT_PX = 320

const OUTPUT_TEXT_CLASSES: Record<ConsoleOutputType, string> = {
  success: "text-green-400",
  error: "text-red-400",
  warning: "text-yellow-400",
  output: "text-gray-200",
  info: "text-gray-400",
  figure: "text-gray-400",
}

function OutputIcon({ type }: { type: ConsoleOutputType }) {
  if (type === "success") return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
  if (type === "error") return <XCircle className="h-4 w-4 shrink-0 text-red-400" />
  if (type === "warning") return <AlertCircle className="h-4 w-4 shrink-0 text-yellow-400" />
  return null
}

/** Histórico de comandos do console, navegado com as setas (o mais recente primeiro). */
function useCommandHistory() {
  const [commands, setCommands] = useState<string[]>([])
  /** -1 é a linha nova, ainda fora do histórico. */
  const [position, setPosition] = useState(-1)

  const record = (command: string) => {
    setCommands((current) => [command, ...current].slice(0, MAX_HISTORY_SIZE))
    setPosition(-1)
  }

  const recall = (nextPosition: number): string => {
    setPosition(nextPosition)
    return nextPosition === -1 ? "" : (commands[nextPosition] ?? "")
  }

  return {
    record,
    recallOlder: () => recall(Math.min(position + 1, commands.length - 1)),
    recallNewer: () => recall(Math.max(position - 1, -1)),
  }
}

export function ConsolePanel({ outputs, onClear, isRunning, onRunCommand }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [command, setCommand] = useState("")
  const history = useCommandHistory()

  useEffect(() => {
    const scrollArea = scrollRef.current
    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight
  }, [outputs])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const trimmedCommand = command.trim()
      if (!trimmedCommand) return
      history.record(trimmedCommand)
      setCommand("")
      onRunCommand?.(trimmedCommand)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setCommand(history.recallOlder())
    }
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setCommand(history.recallNewer())
    }
  }

  const handleDownload = () => {
    downloadText(outputs.map((output) => `[${formatTime(output.timestamp)}] ${output.message}`).join("\n"), DOWNLOAD_FILE_NAME)
  }

  return (
    <div className="flex h-full flex-col bg-[#1e1e2e]" onClick={() => inputRef.current?.focus()}>
      <div className="flex shrink-0 items-center justify-between border-b border-[#3e4451] px-3 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-green-400" />
          <span className="text-sm font-semibold text-gray-200">Console</span>
          {isRunning && <Badge className="animate-pulse border-0 bg-level-purple text-xs text-white">Executando...</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:bg-[#2d2d3d] hover:text-gray-200"
            onClick={(event) => {
              event.stopPropagation()
              handleDownload()
            }}
            title="Baixar saída"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:bg-[#2d2d3d] hover:text-gray-200"
            onClick={(event) => {
              event.stopPropagation()
              onClear()
            }}
            title="Limpar console"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3" ref={scrollRef}>
        {outputs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            <p>Clique em &quot;Executar&quot; para ver a saída do seu código</p>
          </div>
        ) : (
          <div className="space-y-1 font-mono text-sm">
            {outputs.map((output) => (
              <div key={output.id} className="flex flex-col gap-1">
                <ConsoleLine output={output} />
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2">
                <Spinner tone="brand" />
                <span className="text-purple-400">Processando...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#3e4451] bg-[#16162a] px-3 py-2" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="shrink-0 select-none font-bold text-green-400">{">>>"}</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={onRunCommand ? "Digite um comando Python e pressione Enter..." : "Terminal somente de saída"}
            readOnly={!onRunCommand}
            className="flex-1 bg-transparent text-gray-200 outline-none placeholder:text-gray-600 disabled:opacity-50"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  )
}

function ConsoleLine({ output }: { output: ConsoleOutput }) {
  const timestamp = `[${formatTime(output.timestamp)}]`
  if (output.type === "figure" && output.figureB64) {
    return (
      <div className="mt-1">
        <div className="mb-1 flex items-center gap-2">
          <OutputIcon type="success" />
          <span className="text-[10px] text-gray-400">{timestamp}</span>
          <span className="text-xs text-green-400">{output.message}</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#3e4451] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- gráfico gerado no navegador (data URI do matplotlib) */}
          <img
            src={`data:image/png;base64,${output.figureB64}`}
            alt="Gráfico gerado"
            className="max-w-full"
            style={{ maxHeight: FIGURE_MAX_HEIGHT_PX }}
          />
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2">
      <OutputIcon type={output.type} />
      <span className="shrink-0 text-[10px] text-gray-400">{timestamp}</span>
      <span className={cn("break-all", OUTPUT_TEXT_CLASSES[output.type])}>{output.message}</span>
    </div>
  )
}
