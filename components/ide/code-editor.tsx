"use client"

import { useState, useCallback } from "react"
import { X, Play, Square, RotateCcw, Copy, Check, Lightbulb } from "lucide-react"
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

interface OpenTab {
  path: string
  content: string
}

interface CodeEditorProps {
  /** Abas abertas (path + conteúdo). */
  tabs: OpenTab[]
  activePath: string
  onTabSelect: (path: string) => void
  onTabClose: (path: string) => void
  onContentChange: (path: string, content: string) => void
  onRun: () => void
  onReset: () => void
  onStop?: () => void
  isRunning?: boolean
  isInstalling?: boolean
  pyodideStatus?: "idle" | "loading" | "ready" | "error"
  solutionCode?: string
}

/** Nome curto do arquivo (último segmento do path). */
function fileName(path: string): string {
  return path.split("/").pop() ?? path
}

const extensions = [python()]

function SolutionModal({
  myCode,
  solutionCode,
  onKeep,
  onReplace,
}: {
  myCode: string
  solutionCode: string
  onKeep: () => void
  onReplace: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onKeep}
    >
      <div
        className="mx-4 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[#1e1e1e] shadow-2xl"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3e4451] px-5 py-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-200">Exemplo de Solução</span>
          </div>
          <button
            onClick={onKeep}
            className="rounded p-1 text-gray-400 hover:bg-[#3e4451] hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid flex-1 grid-cols-2 overflow-hidden divide-x divide-[#3e4451]">
          <div className="flex flex-col overflow-hidden">
            <p className="shrink-0 border-b border-[#3e4451] px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Meu Código
            </p>
            <pre className="flex-1 overflow-auto p-4 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
              {myCode}
            </pre>
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="shrink-0 border-b border-[#3e4451] px-4 py-2 text-xs font-semibold text-yellow-400 uppercase tracking-wider">
              Exemplo de Solução
            </p>
            <pre className="flex-1 overflow-auto p-4 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
              {solutionCode}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[#3e4451] px-5 py-3">
          <button
            onClick={onKeep}
            className="rounded-lg border border-[#3e4451] px-4 py-2 text-xs font-medium text-gray-300 hover:bg-[#3e4451] transition-colors"
          >
            Guardar meu código
          </button>
          <button
            onClick={onReplace}
            className="rounded-lg bg-yellow-500 px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-400 transition-colors"
          >
            Substituir pela solução
          </button>
        </div>
      </div>
    </div>
  )
}

export function CodeEditor({
  tabs,
  activePath,
  onTabSelect,
  onTabClose,
  onContentChange,
  onRun,
  onReset,
  onStop,
  isRunning = false,
  isInstalling = false,
  pyodideStatus = "idle",
  solutionCode,
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const activeFile = tabs.find((f) => f.path === activePath)

  const handleCopy = useCallback(async () => {
    if (activeFile) {
      await navigator.clipboard.writeText(activeFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [activeFile])

  const handleChange = useCallback(
    (value: string) => {
      onContentChange(activePath, value)
    },
    [activePath, onContentChange]
  )

  const handleReplaceSolution = useCallback(() => {
    if (solutionCode) {
      onContentChange(activePath, solutionCode)
    }
    setShowSolution(false)
  }, [solutionCode, activePath, onContentChange])

  return (
    <div className="flex h-full flex-col bg-[#282c34]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-white px-2 py-1">
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto">
          {tabs.map((file) => (
            <div
              key={file.path}
              onClick={() => onTabSelect(file.path)}
              className={`group flex cursor-pointer items-center gap-2 border-r border-border px-3 py-2 text-sm transition-colors ${
                file.path === activePath
                  ? "bg-[#282c34] text-white"
                  : "bg-level-purple-subtle text-muted-foreground hover:bg-level-purple-light"
              }`}
            >
              <span className="text-xs">🐍</span>
              <span className={file.path === activePath ? "text-white" : "text-level-purple"}>
                {fileName(file.path)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onTabClose(file.path) }}
                className="rounded p-0.5 opacity-0 transition-opacity hover:bg-white/10 hover:text-destructive group-hover:opacity-100"
                title="Fechar aba"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {/* Copiar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-level-purple-light hover:text-level-purple"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copiar arquivo</p>
              </TooltipContent>
            </Tooltip>

            {/* Reset */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-level-purple-light hover:text-level-purple"
                  onClick={onReset}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Resetar workspace (Alt+G)</p>
              </TooltipContent>
            </Tooltip>

            {/* Ver Solução */}
            {solutionCode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setShowSolution(true)}
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver solução</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Parar (visível só durante execução) */}
            {isRunning && onStop && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="ml-2 gap-2 rounded-lg"
                    onClick={onStop}
                  >
                    <Square className="h-4 w-4" />
                    Parar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Interromper execução</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Executar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="ml-2 gap-2 bg-level-purple hover:bg-level-purple-medium text-white rounded-lg disabled:opacity-50"
                  onClick={onRun}
                  disabled={isRunning || isInstalling || pyodideStatus === "loading"}
                >
                  {isInstalling ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Instalando...
                    </>
                  ) : isRunning ? (
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
                <p>
                  {isInstalling
                    ? "Aguarde a instalação dos pacotes"
                    : pyodideStatus === "ready"
                    ? "Ctrl+Enter"
                    : "Aguarde o Python carregar"}
                </p>
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
          <span>Python 3.11 (Pyodide)</span>
          <span className="flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${
                pyodideStatus === "ready"
                  ? "bg-green-500"
                  : pyodideStatus === "loading"
                  ? "animate-pulse bg-yellow-500"
                  : pyodideStatus === "error"
                  ? "bg-red-500"
                  : "bg-gray-500"
              }`}
            />
            {pyodideStatus === "ready"
              ? "Pronto"
              : pyodideStatus === "loading"
              ? "Carregando..."
              : pyodideStatus === "error"
              ? "Erro"
              : "Aguardando"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Espaços: 4</span>
        </div>
      </div>

      {/* Modal Ver Solução */}
      {showSolution && solutionCode && (
        <SolutionModal
          myCode={activeFile?.content ?? ""}
          solutionCode={solutionCode}
          onKeep={() => setShowSolution(false)}
          onReplace={handleReplaceSolution}
        />
      )}
    </div>
  )
}
