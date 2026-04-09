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
      return <CheckCircle2 className="h-4 w-4 text-success" />
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />
    case "warning":
      return <AlertCircle className="h-4 w-4 text-warning" />
    default:
      return null
  }
}

const getTextColor = (type: ConsoleOutput["type"]) => {
  switch (type) {
    case "success":
      return "text-success"
    case "error":
      return "text-destructive"
    case "warning":
      return "text-warning"
    default:
      return "text-foreground"
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
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-level-purple" />
          <span className="text-sm font-semibold text-level-purple-dark">Console</span>
          {isRunning && (
            <Badge className="animate-pulse text-xs bg-level-purple text-white border-0">
              Executando...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-level-purple-light hover:text-level-purple">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-level-purple-light hover:text-level-purple" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-auto p-3" ref={scrollRef}>
        {outputs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <p>Clique em &quot;Executar&quot; para ver a saída do seu código</p>
          </div>
        ) : (
          <div className="space-y-1 font-mono text-sm">
            {outputs.map((output) => (
              <div key={output.id} className="flex items-start gap-2">
                {getIcon(output.type)}
                <span className="text-[10px] text-muted-foreground">
                  [{output.timestamp.toLocaleTimeString()}]
                </span>
                <span className={getTextColor(output.type)}>{output.message}</span>
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-level-purple border-t-transparent" />
                <span className="text-level-purple">Processando...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input line (opcional) */}
      <div className="border-t border-border px-3 py-2 bg-level-purple-subtle">
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <span className="text-level-purple font-bold">{">>>"}</span>
          <input
            type="text"
            placeholder="Digite um comando..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>
    </div>
  )
}
