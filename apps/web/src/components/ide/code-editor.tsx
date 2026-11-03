"use client"

import type { ReactNode } from "react"
import { X, Play, Square, RotateCcw, Copy, Check } from "lucide-react"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { oneDark } from "@codemirror/theme-one-dark"
import type { ProjectFile } from "@levelusp/contracts"
import { Spinner } from "@/components/design-system/spinner"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTransientFlag } from "@/hooks/use-transient-value"
import type { PyodideStatus } from "@/hooks/use-python"
import { COPIED_FEEDBACK_DURATION_MS } from "@/lib/constants"
import { BROWSER_PYTHON_MINOR_VERSION } from "@/lib/python/runtime-config"
import { cn } from "@/lib/utils"

interface CodeEditorProps {
  /** Abas abertas, na ordem em que aparecem. */
  tabs: readonly ProjectFile[]
  activePath: string
  onTabSelect: (path: string) => void
  onTabClose: (path: string) => void
  onContentChange: (path: string, content: string) => void
  onRun: () => void
  onReset: () => void
  onStop?: () => void
  isRunning?: boolean
  isInstalling?: boolean
  pythonStatus?: PyodideStatus
}

// Nome acessível do editor: o Tab indenta, então a saída do teclado precisa ser anunciada.
const EDITOR_EXTENSIONS = [
  python(),
  EditorView.contentAttributes.of({ "aria-label": "Editor de código Python. Pressione Esc e depois Tab para sair do editor." }),
]

const BASIC_SETUP = {
  lineNumbers: true,
  highlightActiveLineGutter: true,
  highlightActiveLine: true,
  foldGutter: true,
  autocompletion: true,
  bracketMatching: true,
  closeBrackets: true,
  indentOnInput: true,
  tabSize: 4,
}

const STATUS_DOT_CLASSES: Record<PyodideStatus, string> = {
  idle: "bg-gray-500",
  loading: "animate-pulse bg-yellow-500",
  ready: "bg-green-500",
  error: "bg-red-500",
}

const STATUS_LABELS: Record<PyodideStatus, string> = {
  idle: "Aguardando",
  loading: "Carregando...",
  ready: "Pronto",
  error: "Erro",
}

/** Nome curto do arquivo (último segmento do path). */
function fileName(path: string): string {
  return path.split("/").pop() ?? path
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
  pythonStatus = "idle",
}: CodeEditorProps): React.JSX.Element {
  const copiedFeedback = useTransientFlag(COPIED_FEEDBACK_DURATION_MS)
  const activeFile = tabs.find((tab) => tab.path === activePath)

  const handleCopy = async (): Promise<void> => {
    if (!activeFile) return
    await navigator.clipboard.writeText(activeFile.content)
    copiedFeedback.activate()
  }

  return (
    <div className="flex h-full flex-col bg-[#282c34]">
      <div className="flex items-center justify-between border-b border-border bg-white px-2 py-1">
        <div className="flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <EditorTab
              key={tab.path}
              path={tab.path}
              isActive={tab.path === activePath}
              onSelect={onTabSelect}
              onClose={onTabClose}
            />
          ))}
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <IconAction label="Copiar arquivo" tooltip="Copiar arquivo" onClick={() => void handleCopy()}>
              {copiedFeedback.isActive ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </IconAction>
            <IconAction label="Restaurar código inicial" tooltip="Restaurar código inicial (Alt+G)" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
            </IconAction>

            {isRunning && onStop && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="destructive" className="ml-2 gap-2 rounded-lg" onClick={onStop}>
                    <Square className="h-4 w-4" />
                    Parar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Interromper execução</p>
                </TooltipContent>
              </Tooltip>
            )}

            <RunButton isRunning={isRunning} isInstalling={isInstalling} pythonStatus={pythonStatus} onRun={onRun} />
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={activeFile?.content ?? ""}
          onChange={(content) => onContentChange(activePath, content)}
          theme={oneDark}
          extensions={EDITOR_EXTENSIONS}
          height="100%"
          style={{ height: "100%" }}
          basicSetup={BASIC_SETUP}
        />
      </div>

      <div className="flex items-center justify-between border-t border-[#3e4451] bg-[#21252b] px-3 py-1 text-xs text-[#abb2bf]">
        <div className="flex items-center gap-4">
          <span>Python {BROWSER_PYTHON_MINOR_VERSION} (Pyodide)</span>
          <span className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", STATUS_DOT_CLASSES[pythonStatus])} />
            {STATUS_LABELS[pythonStatus]}
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

interface EditorTabProps {
  path: string
  isActive: boolean
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

function EditorTab({ path, isActive, onSelect, onClose }: EditorTabProps): React.JSX.Element {
  return (
    <div
      onClick={() => onSelect(path)}
      className={cn(
        "group flex cursor-pointer items-center gap-2 border-r border-border px-3 py-2 text-sm transition-colors",
        isActive ? "bg-[#282c34] text-white" : "bg-level-purple-subtle text-muted-foreground hover:bg-level-purple-light",
      )}
    >
      <span className="text-xs">🐍</span>
      <span className={isActive ? "text-white" : "text-level-purple"}>{fileName(path)}</span>
      <button
        onClick={(event) => {
          event.stopPropagation()
          onClose(path)
        }}
        className="rounded p-0.5 opacity-0 transition-opacity hover:bg-white/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        title="Fechar aba"
        aria-label={`Fechar aba ${path}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

interface IconActionProps {
  label: string
  tooltip: string
  onClick: () => void
  children: ReactNode
}

function IconAction({ label, tooltip, onClick, children }: IconActionProps): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          className="h-8 w-8 hover:bg-level-purple-light hover:text-level-purple"
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

interface RunButtonProps {
  isRunning: boolean
  isInstalling: boolean
  pythonStatus: PyodideStatus
  onRun: () => void
}

/** Rótulo do botão enquanto ele está ocupado; `null` quando está livre para executar. */
function busyLabel({ isRunning, isInstalling, pythonStatus }: Omit<RunButtonProps, "onRun">): string | null {
  if (isInstalling) return "Instalando..."
  if (isRunning) return "Executando..."
  if (pythonStatus === "loading") return "Carregando..."
  return null
}

function RunButton({ isRunning, isInstalling, pythonStatus, onRun }: RunButtonProps): React.JSX.Element {
  const label = busyLabel({ isRunning, isInstalling, pythonStatus })
  const tooltip = isInstalling
    ? "Aguarde a instalação dos pacotes"
    : pythonStatus === "ready"
      ? "Ctrl+Enter"
      : "Aguarde o Python carregar"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          className="ml-2 gap-2 rounded-lg bg-level-purple text-white hover:bg-level-purple-dark disabled:opacity-50"
          onClick={onRun}
          disabled={label !== null}
        >
          {label ? (
            <>
              <Spinner />
              {label}
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
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}
