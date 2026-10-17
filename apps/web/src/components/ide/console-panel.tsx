"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Terminal, Trash2, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ConsoleOutput } from "@/lib/types"

// Fonte única em @/lib/types; re-exportado por compatibilidade.
export type { ConsoleOutput }

interface ConsolePanelProps {
  outputs: ConsoleOutput[]
  onClear: () => void
  isRunning: boolean
  /** Chamado quando o usuário pressiona Enter no input >>>. Recebe o comando digitado. */
  onRunCommand?: (command: string) => void
}

const getIcon = (type: ConsoleOutput["type"]) => {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
    case "error":
      return <XCircle className="h-4 w-4 shrink-0 text-red-400" />
    case "warning":
      return <AlertCircle className="h-4 w-4 shrink-0 text-yellow-400" />
    default:
      return null
  }
}

const getTextColor = (type: ConsoleOutput["type"]) => {
  switch (type) {
    case "success": return "text-green-400"
    case "error":   return "text-red-400"
    case "warning": return "text-yellow-400"
    case "output":  return "text-gray-200"
    default:        return "text-gray-400"
  }
}

export function ConsolePanel({ outputs, onClear, isRunning, onRunCommand }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const [command, setCommand] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)

  // Auto-scroll quando saída muda
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [outputs])

  // Foca o input quando clica na área do console
  const focusInput = useCallback(() => inputRef.current?.focus(), [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const cmd = command.trim()
      if (!cmd) return
      setHistory((h) => [cmd, ...h].slice(0, 50))
      setHistoryIdx(-1)
      setCommand("")
      onRunCommand?.(cmd)
      return
    }
    // Navegar histórico com setas
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHistoryIdx((idx) => {
        const next = Math.min(idx + 1, history.length - 1)
        setCommand(history[next] ?? "")
        return next
      })
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHistoryIdx((idx) => {
        const next = Math.max(idx - 1, -1)
        setCommand(next === -1 ? "" : (history[next] ?? ""))
        return next
      })
    }
  }, [command, history, onRunCommand])

  const handleDownload = useCallback(() => {
    const text = outputs.map((o) => `[${o.timestamp.toLocaleTimeString()}] ${o.message}`).join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "console-output.txt"
    a.click()
    URL.revokeObjectURL(url)
  }, [outputs])

  return (
    <div className="flex h-full flex-col bg-[#1e1e2e]" onClick={focusInput}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3e4451] px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-green-400" />
          <span className="text-sm font-semibold text-gray-200">Console</span>
          {isRunning && (
            <Badge className="animate-pulse text-xs bg-level-purple text-white border-0">
              Executando...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:bg-[#2d2d3d] hover:text-gray-200"
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            title="Baixar saída"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:bg-[#2d2d3d] hover:text-gray-200"
            onClick={(e) => { e.stopPropagation(); onClear() }}
            title="Limpar console"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Área de saída */}
      <div className="flex-1 overflow-auto p-3" ref={scrollRef}>
        {outputs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            <p>Clique em &quot;Executar&quot; para ver a saída do seu código</p>
          </div>
        ) : (
          <div className="space-y-1 font-mono text-sm">
            {outputs.map((output) => (
              <div key={output.id} className="flex flex-col gap-1">
                {output.type === "figure" && output.figureB64 ? (
                  <div className="mt-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getIcon("success")}
                      <span className="text-[10px] text-gray-600">[{output.timestamp.toLocaleTimeString()}]</span>
                      <span className="text-xs text-green-400">{output.message}</span>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-[#3e4451] bg-white">
                      <img
                        src={`data:image/png;base64,${output.figureB64}`}
                        alt="Gráfico gerado"
                        className="max-w-full"
                        style={{ maxHeight: 320 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    {getIcon(output.type)}
                    <span className="shrink-0 text-[10px] text-gray-600">
                      [{output.timestamp.toLocaleTimeString()}]
                    </span>
                    <span className={`break-all ${getTextColor(output.type)}`}>{output.message}</span>
                  </div>
                )}
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-level-purple border-t-transparent" />
                <span className="text-purple-400">Processando...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input interativo */}
      <div
        className="border-t border-[#3e4451] px-3 py-2 bg-[#16162a] shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="shrink-0 text-green-400 font-bold select-none">{">>>"}</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={onRunCommand ? "Digite um comando Python e pressione Enter..." : "Terminal somente de saída"}
            readOnly={!onRunCommand}
            className="flex-1 bg-transparent text-gray-200 placeholder:text-gray-600 outline-none disabled:opacity-50"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  )
}
