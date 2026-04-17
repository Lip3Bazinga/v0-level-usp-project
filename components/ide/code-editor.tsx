"use client"

import { useState, useCallback } from "react"
import { X, Plus, Play, RotateCcw, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { oneDark } from "@codemirror/theme-one-dark"

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

const extensions = [python()]

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

  const handleChange = useCallback(
    (value: string) => {
      onContentChange(activeFileId, value)
    },
    [activeFileId, onContentChange]
  )

  return (
    <div className="flex h-full flex-col bg-[#282c34]">
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
                  ? "bg-[#282c34] text-white"
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
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={activeFile?.content || ""}
          onChange={handleChange}
          theme={oneDark}
          extensions={extensions}
          height="100%"
          style={{ height: "100%" }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
            tabSize: 4,
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-[#3e4451] bg-[#21252b] px-3 py-1 text-xs text-[#abb2bf]">
        <div className="flex items-center gap-4">
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
