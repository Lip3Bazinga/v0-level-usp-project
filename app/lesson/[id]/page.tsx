"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Header } from "@/components/ide/header"
import { LessonPanel } from "@/components/ide/lesson-panel"
import { CodeEditor } from "@/components/ide/code-editor"
import { ConsolePanel, type ConsoleOutput } from "@/components/ide/console-panel"
import { FileExplorer } from "@/components/ide/file-explorer"
import { SuccessFeedback } from "@/components/ide/success-feedback"
import { usePython } from "@/hooks/use-python"
import { parsePythonError } from "@/lib/parse-python-error"
import { fetchLessonById, awardXp } from "@/lib/supabase/lessons"
import { useAuth } from "@/contexts/auth-context"
import type { Lesson } from "@/lib/supabase/types"
import { Loader2, BookOpen } from "lucide-react"

// ── Componente principal ──────────────────────────────────────────────────────

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = params.id as string
  const { profile, refreshProfile } = useAuth()

  // Lição carregada do Supabase
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [lessonLoading, setLessonLoading] = useState(true)
  const [lessonError, setLessonError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLessonLoading(true)
      setLessonError(null)
      const data = await fetchLessonById(lessonId)
      if (!data) {
        setLessonError("Lição não encontrada.")
      } else {
        setLesson(data)
      }
      setLessonLoading(false)
    }
    load()
  }, [lessonId])

  // Python runtime (Pyodide via Web Worker)
  const { status: pythonStatus, execute } = usePython()

  // Arquivos do editor (populados quando a lição carrega)
  const [files, setFiles] = useState([
    { id: "main", name: "main.py", language: "python" as const, content: "# Carregando lição..." },
  ])
  const [activeFileId, setActiveFileId] = useState("main")

  // Popula o editor assim que a lição carrega
  useEffect(() => {
    if (lesson) {
      setFiles([
        { id: "main", name: "main.py", language: "python" as const, content: lesson.starter_code },
      ])
    }
  }, [lesson])

  // Console
  const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([])

  // Estado de execução
  const [isRunning, setIsRunning] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  // Overlay de sucesso
  const [showSuccess, setShowSuccess] = useState(false)
  const lessonCompletedRef = useRef(false)

  // Passos da lição
  const [steps, setSteps] = useState([
    { id: 1, title: "Ler a teoria", completed: true, active: false },
    { id: 2, title: "Escrever o código", completed: false, active: true },
    { id: 3, title: "Verificar a solução", completed: false, active: false },
  ])

  const fileTree = [
    {
      id: "project",
      name: "meu-projeto",
      type: "folder" as const,
      children: [
        { id: "main", name: "main.py", type: "file" as const, language: "python" as const },
      ],
    },
  ]

  // ── Helpers de console ──────────────────────────────────────────────────────
  const addOutput = useCallback((type: ConsoleOutput["type"], message: string) => {
    setConsoleOutputs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type, message, timestamp: new Date() },
    ])
  }, [])

  // ── Handlers do editor ──────────────────────────────────────────────────────
  const handleContentChange = useCallback((fileId: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content } : f)))
  }, [])

  const handleReset = useCallback(() => {
    if (!lesson) return
    setFiles([{ id: "main", name: "main.py", language: "python" as const, content: lesson.starter_code }])
    setConsoleOutputs([
      { id: crypto.randomUUID(), type: "info", message: "Código resetado para o estado inicial.", timestamp: new Date() },
    ])
    lessonCompletedRef.current = false
  }, [lesson])

  const handleClearConsole = useCallback(() => setConsoleOutputs([]), [])

  const handleStepClick = useCallback((stepId: number) => {
    setSteps((prev) => prev.map((s) => ({ ...s, active: s.id === stepId })))
  }, [])

  // ── Executar código ─────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    const activeFile = files.find((f) => f.id === activeFileId)
    if (!activeFile || activeFile.language !== "python") return

    if (pythonStatus === "loading") {
      addOutput("warning", "O runtime Python ainda está carregando. Aguarde...")
      return
    }
    if (pythonStatus === "error") {
      addOutput("error", "Erro ao carregar o runtime Python. Recarregue a página.")
      return
    }
    if (pythonStatus !== "ready") return

    setIsRunning(true)
    addOutput("info", "▶ Executando main.py...")

    execute(activeFile.content, {
      onResult: (result) => {
        if (result.stdout) {
          result.stdout.split("\n").filter((l) => l.length > 0).forEach((l) => addOutput("output", l))
        }
        if (result.stderr) {
          result.stderr.split("\n").filter((l) => l.length > 0).forEach((l) => addOutput("warning", l))
        }
        if (!result.stderr) {
          addOutput("success", "✓ Código executado com sucesso!")
        }
        setIsRunning(false)
      },
      onError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("info", `💡 Dica: ${parsed.hint}`)
        setIsRunning(false)
      },
    })
  }, [files, activeFileId, pythonStatus, execute, addOutput])

  // ── Verificar resposta ──────────────────────────────────────────────────────
  const handleVerify = useCallback(() => {
    if (!lesson) return
    if (lessonCompletedRef.current) {
      addOutput("info", "Você já completou essa lição! Avance para a próxima.")
      return
    }

    const activeFile = files.find((f) => f.id === activeFileId)
    if (!activeFile || activeFile.language !== "python") return

    if (pythonStatus !== "ready") {
      addOutput("warning",
        pythonStatus === "loading"
          ? "O runtime Python ainda está carregando. Aguarde..."
          : "Erro no runtime Python. Recarregue a página."
      )
      return
    }

    setIsVerifying(true)
    addOutput("info", "🔬 Verificando sua solução com testes ocultos...")

    execute(activeFile.content, {
      testCode: lesson.hidden_tests,
      onResult: (result) => {
        if (result.stdout) {
          result.stdout.split("\n").filter((l) => l.length > 0).forEach((l) => addOutput("output", l))
        }
      },
      onError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("info", `💡 Dica: ${parsed.hint}`)
        setIsVerifying(false)
      },
      onTestResult: async (result) => {
        if (result.allPassed) {
          addOutput("success", `✓ Todos os testes passaram! +${lesson.xp_reward} XP conquistado!`)
          lessonCompletedRef.current = true
          setShowSuccess(true)
          setSteps((prev) =>
            prev.map((s) => (s.id === 3 ? { ...s, completed: true, active: false } : s))
          )
          // Salva progresso e credita XP no Supabase
          if (profile) {
            try {
              await awardXp(profile.id, lesson.id, lesson.xp_reward)
              await refreshProfile()
            } catch {
              // Silencioso — o aluno já viu o feedback de sucesso
            }
          }
        } else {
          result.failureDetails.forEach((msg) => addOutput("error", msg))
          addOutput("info", "Continue tentando! Leia o feedback acima e ajuste seu código.")
        }
        setIsVerifying(false)
      },
      onTestError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("info", `💡 Dica: ${parsed.hint}`)
        setIsVerifying(false)
      },
    })
  }, [files, activeFileId, pythonStatus, execute, lesson, addOutput, profile, refreshProfile])

  // ── Atalho Ctrl+Enter ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        handleRun()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleRun])

  // ── Estados de carregamento / erro ──────────────────────────────────────────
  if (lessonLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
        <p className="text-sm text-muted-foreground">Carregando lição...</p>
      </div>
    )
  }

  if (lessonError || !lesson) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <BookOpen className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-level-purple-dark">Lição não encontrada</h2>
        <p className="text-sm text-muted-foreground">{lessonError ?? "Esta lição não existe ou não está disponível."}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors"
        >
          Voltar ao Dashboard
        </button>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Header lessonTitle={lesson.module} lessonProgress={45} />

      {/* Barra de status do runtime Python */}
      {pythonStatus !== "ready" && (
        <div className={`flex items-center justify-center gap-2 py-1.5 text-xs font-medium ${
          pythonStatus === "loading" ? "bg-amber-50 text-amber-700"
          : pythonStatus === "idle" ? "bg-blue-50 text-blue-700"
          : "bg-red-50 text-red-700"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            pythonStatus === "loading" ? "animate-pulse bg-amber-500"
            : pythonStatus === "idle" ? "bg-blue-400"
            : "bg-red-500"
          }`} />
          {pythonStatus === "loading" && "Carregando runtime Python (Pyodide)..."}
          {pythonStatus === "idle" && "Inicializando runtime Python..."}
          {pythonStatus === "error" && "Erro ao carregar o runtime Python. Recarregue a página."}
        </div>
      )}

      {/* Layout principal */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <LessonPanel
              title={lesson.title}
              description={`Dificuldade: ${lesson.difficulty} · +${lesson.xp_reward} XP`}
              content={lesson.content_markdown}
              steps={steps}
              onStepClick={handleStepClick}
              onVerify={handleVerify}
              isVerifying={isVerifying}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={55} minSize={40}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={70} minSize={30}>
                <CodeEditor
                  files={files}
                  activeFileId={activeFileId}
                  onFileChange={setActiveFileId}
                  onContentChange={handleContentChange}
                  onRun={handleRun}
                  onReset={handleReset}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                <ConsolePanel
                  outputs={consoleOutputs}
                  onClear={handleClearConsole}
                  isRunning={isRunning || isVerifying}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <FileExplorer
              files={fileTree}
              activeFileId={activeFileId}
              onFileSelect={setActiveFileId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <SuccessFeedback
        show={showSuccess}
        xpEarned={lesson.xp_reward}
        onClose={() => {
          setShowSuccess(false)
          router.push("/dashboard")
        }}
      />
    </div>
  )
}
