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
import { LessonFooter } from "@/components/ide/lesson-footer"
import { CodeEditor } from "@/components/ide/code-editor"
import { ConsolePanel, type ConsoleOutput } from "@/components/ide/console-panel"
import { FileExplorer } from "@/components/ide/file-explorer"
import { SuccessFeedback } from "@/components/ide/success-feedback"
import { usePython } from "@/hooks/use-python"
import { parsePythonError } from "@/lib/parse-python-error"
import { fetchPublishedLessons, fetchLessonById, awardXp } from "@/lib/supabase/lessons"
import { useAuth } from "@/contexts/auth-context"
import type { Lesson } from "@/lib/supabase/types"
import { Loader2, BookOpen } from "lucide-react"

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = params.id as string
  const { profile, refreshProfile } = useAuth()

  // Lista completa de lições para navegação com footer
  const [allLessons, setAllLessons] = useState<Lesson[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Lição ativa
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [lessonLoading, setLessonLoading] = useState(true)
  const [lessonError, setLessonError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLessonLoading(true)
      setLessonError(null)
      try {
        // Busca a lição diretamente e a lista completa em paralelo
        const [lessons, direct] = await Promise.all([
          fetchPublishedLessons(),
          fetchLessonById(lessonId),
        ])
        setAllLessons(lessons)
        const idx = lessons.findIndex((l) => l.id === lessonId)
        if (idx >= 0) {
          setCurrentIndex(idx)
          setLesson(lessons[idx])
        } else if (direct) {
          // Lição existe mas não apareceu no array (ex: ordenação edge case)
          setLesson(direct)
          setCurrentIndex(0)
        } else {
          setLessonError("Lição não encontrada.")
        }
      } catch {
        setLessonError("Erro ao carregar lição.")
      } finally {
        setLessonLoading(false)
      }
    }
    load()
  }, [lessonId])

  // Pyodide
  const { status: pythonStatus, isExecuting, execute, installPackages } = usePython()

  // Editor
  const [files, setFiles] = useState([
    { id: "main", name: "main.py", language: "python" as const, content: "# Carregando lição..." },
  ])
  const [activeFileId, setActiveFileId] = useState("main")

  useEffect(() => {
    if (lesson) {
      setFiles([{ id: "main", name: "main.py", language: "python" as const, content: lesson.starter_code }])
    }
  }, [lesson?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Instala pacotes quando Pyodide fica pronto
  useEffect(() => {
    if (pythonStatus === "ready" && lesson?.libraries?.length) {
      addOutput("info", `Instalando pacotes: ${lesson.libraries.join(", ")}...`)
      installPackages(lesson.libraries)
    }
  }, [pythonStatus, lesson?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Console
  const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([])

  // Progresso dinâmico
  const [hasRun, setHasRun] = useState(false)
  const [hasOutput, setHasOutput] = useState(false)
  const [lessonProgress, setLessonProgress] = useState(0)
  const [allPassed, setAllPassed] = useState(false)

  const [showSuccess, setShowSuccess] = useState(false)
  const lessonCompletedRef = useRef(false)

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

  // ── Helpers de console ────────────────────────────────────────────────────────
  const addOutput = useCallback((type: ConsoleOutput["type"], message: string) => {
    setConsoleOutputs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type, message, timestamp: new Date() },
    ])
  }, [])

  // ── Status Pyodide no console ─────────────────────────────────────────────────
  useEffect(() => {
    if (pythonStatus === "loading") {
      setConsoleOutputs([{ id: crypto.randomUUID(), type: "info", message: "Inicializando Python no navegador...", timestamp: new Date() }])
    } else if (pythonStatus === "ready") {
      setConsoleOutputs((prev) => [...prev, { id: crypto.randomUUID(), type: "success", message: "Python pronto! Você pode executar seu código.", timestamp: new Date() }])
    } else if (pythonStatus === "error") {
      setConsoleOutputs((prev) => [...prev, { id: crypto.randomUUID(), type: "error", message: "Erro ao carregar Python. Verifique sua conexão e recarregue a página.", timestamp: new Date() }])
    }
  }, [pythonStatus])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleContentChange = useCallback((fileId: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content } : f)))
  }, [])

  const handleReset = useCallback(() => {
    if (!lesson) return
    setFiles([{ id: "main", name: "main.py", language: "python" as const, content: lesson.starter_code }])
    setConsoleOutputs([{ id: crypto.randomUUID(), type: "info", message: "Código resetado para o estado inicial.", timestamp: new Date() }])
    setHasRun(false)
    setHasOutput(false)
    lessonCompletedRef.current = false
  }, [lesson])

  const handleClearConsole = useCallback(() => setConsoleOutputs([]), [])

  // ── Executar código ───────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    const activeFile = files.find((f) => f.id === activeFileId)
    if (!activeFile || activeFile.language !== "python") return

    if (pythonStatus === "loading") {
      addOutput("warning", "O runtime Python ainda está carregando. Aguarde...")
      return
    }
    if (pythonStatus !== "ready") return

    setHasRun(true)
    setLessonProgress((p) => Math.max(p, 40))
    setConsoleOutputs([{ id: crypto.randomUUID(), type: "info", message: `Executando ${activeFile.name}...`, timestamp: new Date() }])

    execute(activeFile.content, {
      onResult: (result) => {
        if (result.stdout) {
          result.stdout.split("\n").filter((l) => l.length > 0).forEach((l) => addOutput("output", l))
        }
        // Renderiza figuras matplotlib inline
        result.figures?.forEach((b64, i) => {
          setConsoleOutputs((prev) => [...prev, {
            id: crypto.randomUUID(),
            type: "figure",
            message: `Figura ${i + 1}`,
            timestamp: new Date(),
            figureB64: b64,
          }])
        })
        if (result.stderr) {
          const parsed = parsePythonError(result.stderr)
          addOutput("error", `${parsed.title}: ${parsed.explanation}`)
          addOutput("warning", `Erro original: ${parsed.original}`)
          addOutput("warning", `💡 Dica: ${parsed.hint}`)
          setHasOutput(false)
        } else {
          addOutput("success", "✓ Código executado com sucesso!")
          setHasOutput(true)
          setLessonProgress((p) => Math.max(p, 60))
        }
      },
      onError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("warning", `Erro original: ${parsed.original}`)
        addOutput("warning", `💡 Dica: ${parsed.hint}`)
        setHasOutput(false)
      },
    })
  }, [files, activeFileId, pythonStatus, execute, addOutput])

  // ── Verificar resposta ────────────────────────────────────────────────────────
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
        addOutput("warning", `💡 Dica: ${parsed.hint}`)
      },
      onTestResult: async (result) => {
        if (result.allPassed) {
          addOutput("success", `✓ Todos os testes passaram! +${lesson.xp_reward} XP conquistado!`)
          lessonCompletedRef.current = true
          setAllPassed(true)
          setLessonProgress(100)
          setShowSuccess(true)
          if (profile) {
            try {
              await awardXp(profile.id, lesson.id, lesson.xp_reward)
              await refreshProfile()
            } catch { /* silencioso */ }
          }
        } else {
          const failCount = result.failures + result.errors
          addOutput("error", `${failCount} de ${result.testsRun} testes falharam.`)
          result.failureDetails.forEach((msg) => addOutput("warning", msg))
          addOutput("info", "Continue tentando! Leia o feedback acima e ajuste seu código.")
          setLessonProgress((p) => Math.max(p, 70))
        }
      },
      onTestError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("warning", `💡 Dica: ${parsed.hint}`)
      },
    })
  }, [files, activeFileId, pythonStatus, execute, lesson, addOutput, profile, refreshProfile])

  // ── Navegação ─────────────────────────────────────────────────────────────────
  const handlePrev = useCallback(() => {
    const prev = allLessons[currentIndex - 1]
    if (prev) router.push(`/lesson/${prev.id}`)
  }, [allLessons, currentIndex, router])

  const handleNext = useCallback(() => {
    const next = allLessons[currentIndex + 1]
    if (next) router.push(`/lesson/${next.id}`)
    else router.push("/dashboard")
  }, [allLessons, currentIndex, router])

  // ── Atalhos de teclado ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRun() }
      if (e.altKey && e.key === "g") { e.preventDefault(); handleReset() }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleRun, handleReset])

  // ── Loading / erro ────────────────────────────────────────────────────────────
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

  const hasNextLesson = currentIndex < allLessons.length - 1

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Header
        lessonTitle={`Módulo: ${lesson.module} — ${lesson.title}`}
        lessonProgress={lessonProgress}
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Painel esquerdo: teoria + instruções */}
          <ResizablePanel defaultSize={28} minSize={22} maxSize={42}>
            <LessonPanel
              moduleName={lesson.module}
              title={lesson.title}
              estimatedTime={`Dificuldade: ${lesson.difficulty} · +${lesson.xp_reward} XP`}
              content={lesson.content_markdown}
              checkpoints={[]}
              hasRun={hasRun}
              hasOutput={hasOutput}
              onVerify={handleVerify}
              isVerifying={isExecuting}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor + Console */}
          <ResizablePanel defaultSize={52} minSize={38}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={65} minSize={30}>
                <CodeEditor
                  files={files}
                  activeFileId={activeFileId}
                  onFileChange={setActiveFileId}
                  onContentChange={handleContentChange}
                  onRun={handleRun}
                  onReset={handleReset}
                  isRunning={isExecuting}
                  pyodideStatus={pythonStatus}
                  solutionCode={lesson.solution_code ?? undefined}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={35} minSize={20} maxSize={55}>
                <ConsolePanel
                  outputs={consoleOutputs}
                  onClear={handleClearConsole}
                  isRunning={isExecuting}
                  onRunCommand={(cmd) => {
                    // Executa linha avulsa no mesmo namespace do Pyodide
                    if (pythonStatus !== "ready") {
                      addOutput("warning", "Python ainda não está pronto.")
                      return
                    }
                    addOutput("info", `>>> ${cmd}`)
                    execute(cmd, {
                      onResult: (r) => {
                        if (r.stdout) r.stdout.split("\n").filter(Boolean).forEach((l) => addOutput("output", l))
                        if (r.stderr) addOutput("error", r.stderr.trim())
                      },
                      onError: (e) => addOutput("error", e),
                    })
                  }}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Explorador de arquivos */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
            <FileExplorer
              files={fileTree}
              activeFileId={activeFileId}
              onFileSelect={setActiveFileId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <LessonFooter
        currentIndex={currentIndex}
        total={allLessons.length || 1}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <SuccessFeedback
        show={showSuccess}
        xpEarned={lesson.xp_reward}
        hasNextLesson={hasNextLesson}
        onClose={() => setShowSuccess(false)}
        onNext={handleNext}
      />
    </div>
  )
}
