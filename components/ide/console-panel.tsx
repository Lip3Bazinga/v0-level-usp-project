"use client"

import { useRef, useEffect } from "react"
import { Terminal, Trash2, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export type ConsoleOutput = {
  id: string
  type: "info" | "success" | "error" | "warning" | "output"
  message: string
  timestamp: Date
}

interface ConsolePanelProps {
  outputs: ConsoleOutput[]
  onClear: () => void
  isRunning: boolean
}

const getIcon = (type: ConsoleOutput["type"]) => {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-400" />
    case "error":
      return <XCircle className="h-4 w-4 text-red-400" />
    case "warning":
      return <AlertCircle className="h-4 w-4 text-yellow-400" />
    default:
      return null
  }
}

const getTextColor = (type: ConsoleOutput["type"]) => {
  switch (type) {
    case "success":
      return "text-green-400"
    case "error":
      return "text-red-400"
    case "warning":
      return "text-yellow-400"
    case "output":
      return "text-gray-200"
    default:
      return "text-gray-400"
  }
}

export function ConsolePanel({ outputs, onClear, isRunning }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [outputs])

  return (
    <div className="flex h-full flex-col bg-[#1e1e2e]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3e4451] px-3 py-2">
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:bg-[#2d2d3d] hover:text-gray-200">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:bg-[#2d2d3d] hover:text-gray-200" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-auto p-3" ref={scrollRef}>
        {outputs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            <p>Clique em &quot;Executar&quot; para ver a saída do seu código</p>
          </div>
        ) : (
          <div className="space-y-1 font-mono text-sm">
            {outputs.map((output) => (
              <div key={output.id} className="flex items-start gap-2">
                {getIcon(output.type)}
                <span className="text-[10px] text-gray-600">
                  [{output.timestamp.toLocaleTimeString()}]
                </span>
                <span className={getTextColor(output.type)}>{output.message}</span>
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

      {/* Input line */}
      <div className="border-t border-[#3e4451] px-3 py-2 bg-[#16162a]">
        <div className="flex items-center gap-2 font-mono text-sm text-gray-400">
          <span className="text-green-400 font-bold">{">>>"}</span>
          <input
            type="text"
            placeholder="Digite um comando..."
            className="flex-1 bg-transparent text-gray-200 placeholder:text-gray-600 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
