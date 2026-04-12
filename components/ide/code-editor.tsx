"use client"

import { useState, useCallback } from "react"
import { X, Plus, Play, RotateCcw, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FileTab {
  id: string
  name: string
  language: string
  content: string
}

interface CodeEditorProps {
  files: FileTab[]
  activeFileId: string
  onFileChange: (fileId: string) => void
  onContentChange: (fileId: string, content: string) => void
  onRun: () => void
  onReset: () => void
  isRunning?: boolean
  pyodideStatus?: "idle" | "loading" | "ready" | "error"
}

const getLanguageIcon = (lang: string) => {
  switch (lang) {
    case "python":
      return "🐍"
    case "csv":
      return "📊"
    case "json":
      return "📋"
    default:
      return "📄"
  }
}

const getLanguageColor = (lang: string) => {
  switch (lang) {
    case "python":
      return "text-level-purple"
    case "csv":
      return "text-success"
    case "json":
      return "text-warning"
    default:
      return "text-muted-foreground"
  }
}

export function CodeEditor({
  files,
  activeFileId,
  onFileChange,
  onContentChange,
  onRun,
  onReset,
  isRunning = false,
  pyodideStatus = "idle",
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false)
  const activeFile = files.find((f) => f.id === activeFileId)

  const handleCopy = useCallback(async () => {
    if (activeFile) {
      await navigator.clipboard.writeText(activeFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [activeFile])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault()
        const target = e.target as HTMLTextAreaElement
        const start = target.selectionStart
        const end = target.selectionEnd
        const value = target.value
        const newValue = value.substring(0, start) + "    " + value.substring(end)
        onContentChange(activeFileId, newValue)
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 4
        }, 0)
      }
    },
    [activeFileId, onContentChange]
  )

  const lines = activeFile?.content.split("\n") || []

  return (
    <div className="flex h-full flex-col bg-editor-bg">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-white px-2 py-1">
        {/* Tabs */}
        <div className="flex items-center">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => onFileChange(file.id)}
              className={`group flex items-center gap-2 border-r border-border px-3 py-2 text-sm transition-colors ${
                file.id === activeFileId
                  ? "bg-editor-bg text-white"
                  : "bg-level-purple-subtle text-muted-foreground hover:bg-level-purple-light"
              }`}
            >
              <span className="text-xs">{getLanguageIcon(file.language)}</span>
              <span className={file.id === activeFileId ? "text-white" : getLanguageColor(file.language)}>{file.name}</span>
              <X className="h-3 w-3 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" />
            </button>
          ))}
          <button className="flex items-center gap-1 px-3 py-2 text-muted-foreground transition-colors hover:text-level-purple">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-level-purple-light hover:text-level-purple"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copiar código</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-level-purple-light hover:text-level-purple" onClick={onReset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Resetar código</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="ml-2 gap-2 bg-level-purple hover:bg-level-purple-medium text-white rounded-lg disabled:opacity-50"
                  onClick={onRun}
                  disabled={isRunning || pyodideStatus === "loading"}
                >
                  {isRunning ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Executando...
                    </>
                  ) : pyodideStatus === "loading" ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Executar
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{pyodideStatus === "ready" ? "Ctrl + Enter" : "Aguarde o Python carregar"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Editor */}
      <ScrollArea className="flex-1">
        <div className="flex min-h-full">
          {/* Line numbers */}
          <div className="sticky left-0 flex flex-col bg-editor-bg px-3 py-3 text-right font-mono text-xs text-muted-foreground select-none">
            {lines.map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code area */}
          <div className="relative flex-1">
            <textarea
              value={activeFile?.content || ""}
              onChange={(e) => onContentChange(activeFileId, e.target.value)}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 w-full resize-none bg-transparent p-3 font-mono text-sm leading-6 text-foreground caret-primary outline-none"
              spellCheck={false}
              style={{ tabSize: 4 }}
            />
            {/* Syntax highlighted overlay would go here */}
          </div>
        </div>
      </ScrollArea>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-border bg-level-purple-subtle px-3 py-1 text-xs text-level-purple-dark">
        <div className="flex items-center gap-4">
          <span>Linha {lines.length}</span>
          <span>
            {activeFile?.language === "python"
              ? "Python 3.11 (Pyodide)"
              : activeFile?.language.toUpperCase()}
          </span>
          <span className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${
              pyodideStatus === "ready" ? "bg-success" :
              pyodideStatus === "loading" ? "bg-warning animate-pulse" :
              pyodideStatus === "error" ? "bg-destructive" : "bg-muted-foreground"
            }`} />
            {pyodideStatus === "ready" ? "Pronto" :
             pyodideStatus === "loading" ? "Carregando..." :
             pyodideStatus === "error" ? "Erro" : "Aguardando"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Espaços: 4</span>
        </div>
      </div>
    </div>
  )
}
