"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ResponsiveWorkspace } from "@/components/ide/responsive-workspace"
import { Header } from "@/components/ide/header"
import { LessonPanel, type Checkpoint } from "@/components/ide/lesson-panel"
import { LessonFooter } from "@/components/ide/lesson-footer"
import { CodeEditor } from "@/components/ide/code-editor"
import { ConsolePanel, type ConsoleOutput } from "@/components/ide/console-panel"
import { FileExplorer } from "@/components/ide/file-explorer"
import { SuccessFeedback } from "@/components/ide/success-feedback"
import { usePython } from "@/hooks/use-python"
import { parsePythonError } from "@/lib/parse-python-error"
import { createClient } from "@/lib/supabase/client"
import { fetchPublishedLessons, awardXp } from "@/lib/supabase/lessons"
import { evaluateOnServer } from "@/lib/evaluate"
import { useAuth } from "@/contexts/auth-context"
import type { Lesson } from "@/lib/database.types"

// ── Fallback local ────────────────────────────────────────────────────────────

const FALLBACK_LESSON: Lesson = {
  id: "local-1",
  title: "Variáveis e Tipos de Dados",
  description:
    "Aprenda a criar e utilizar variáveis em Python para armazenar diferentes tipos de informação.",
  slug: "variaveis-e-tipos-de-dados",
  module: "Python Básico",
  order: 1,
  difficulty: "iniciante",
  course_id: null,
  created_by: null,
  content_markdown: `
## O que são Variáveis?

Em Python, variáveis são utilizadas para armazenar valores na memória do computador.
Você pode pensar nelas como "etiquetas" que damos aos dados.

## Tipos de Dados Básicos

- **String (str)**: Texto entre aspas, ex: \`"Maria"\`
- **Inteiro (int)**: Números inteiros, ex: \`25\`
- **Decimal (float)**: Números com casas decimais, ex: \`1.75\`
- **Booleano (bool)**: Verdadeiro ou Falso (\`True\`/\`False\`)

## Seu Desafio

Complete o código criando variáveis com seu nome e idade, e depois execute para ver o resultado!
`,
  starter_code: `# Bem-vindo ao LevelUSP!
# Complete o exercício abaixo

# Crie uma variável chamada 'nome' com seu nome
nome = ""

# Crie uma variável chamada 'idade' com sua idade
idade = 0

# Imprima uma mensagem de boas-vindas
print(f"Olá, {nome}! Você tem {idade} anos.")
`,
  xp_reward: 50,
  time_limit: 300,
  libraries: [],
  checkpoints: [],
  starter_files: [],
  module_id: null,
  published: true,
  created_at: "",
  updated_at: "",
}


function createOutput(type: ConsoleOutput["type"], message: string): ConsoleOutput {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    timestamp: new Date(),
  }
}

/** Gera um checkpoint único a partir do enunciado da lição. */
function buildCheckpoints(lesson: Lesson): Checkpoint[] {
  return [
    {
      id: 1,
      instruction: lesson.description || "Complete o exercício e clique em Verificar Resposta.",
      hint: "Leia o enunciado com atenção e execute seu código antes de verificar.",
      completed: false,
    },
  ]
}

function xpForLevel(level: number) { return level * 1000 }

// ── Componente principal ───────────────────────────────────────────────────────

export default function LevelUSPIDE() {
  const router = useRouter()
  const supabase = createClient()
  const { user, profile, refreshProfile } = useAuth()

  // Ref for the XP badge in header — particles fly toward it
  const xpBadgeRef = useRef<HTMLDivElement>(null)

  // Lista de todas as lições para navegação
  const [allLessons, setAllLessons] = useState<Lesson[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Lição atual
  const [lesson, setLesson] = useState<Lesson>(FALLBACK_LESSON)
  const [isLoadingLesson, setIsLoadingLesson] = useState(true)

  // Editor state
  const [files, setFiles] = useState([
    { id: "main", name: "main.py", language: "python", content: FALLBACK_LESSON.starter_code },
  ])
  const [activeFileId, setActiveFileId] = useState("main")
  const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])

  // Feedback
  const [showSuccess, setShowSuccess] = useState(false)
  const [lessonProgress, setLessonProgress] = useState(0)

  // Level-up detection
  const [prevLevel, setPrevLevel] = useState<number | undefined>(undefined)
  const [awardedLevel, setAwardedLevel] = useState<number | undefined>(undefined)

  // Progresso dinâmico dos checkpoints de execução
  const [hasRun, setHasRun] = useState(false)
  const [hasOutput, setHasOutput] = useState(false)

  // Pyodide
  const { status: pyStatus, isExecuting, execute, installPackages } = usePython()

  // ── Helpers ───────────────────────────────────────────────────────────────

  const addOutput = useCallback((type: ConsoleOutput["type"], message: string) => {
    setConsoleOutputs((prev) => [...prev, createOutput(type, message)])
  }, [])

  function applyLesson(l: Lesson, idx: number, lessons: Lesson[]) {
    setLesson(l)
    setCurrentIndex(idx)
    setFiles([{ id: "main", name: "main.py", language: "python", content: l.starter_code }])
    setCheckpoints(buildCheckpoints(l))
    setConsoleOutputs([])
    setLessonProgress(0)
    setShowSuccess(false)
    setHasRun(false)
    setHasOutput(false)
    const url = new URL(window.location.href)
    url.searchParams.set("lesson", l.id)
    window.history.replaceState(null, "", url.toString())
    if (pyStatus === "ready" && l.libraries && l.libraries.length > 0) {
      addOutput("info", `Instalando pacotes: ${l.libraries.join(", ")}...`)
      installPackages(l.libraries)
    }
  }

  // ── Carrega lições ────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams(window.location.search)
        const lessonId = params.get("lesson")

        const lessons = await fetchPublishedLessons()
        setAllLessons(lessons)

        let targetIdx = 0

        if (lessonId) {
          const idx = lessons.findIndex((l) => l.id === lessonId)
          if (idx >= 0) targetIdx = idx
        } else {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: progress } = await supabase
              .from("lesson_progress")
              .select("lesson_id, status")
              .eq("user_id", user.id)
              .eq("status", "completed")
            const completedIds = new Set((progress ?? []).map((p: { lesson_id: string }) => p.lesson_id))
            const firstUndone = lessons.findIndex((l) => !completedIds.has(l.id))
            if (firstUndone >= 0) targetIdx = firstUndone
          }
        }

        const target = lessons[targetIdx] ?? lessons[0] ?? FALLBACK_LESSON
        applyLesson(target, targetIdx, lessons)
      } catch {
        setCheckpoints(buildCheckpoints(FALLBACK_LESSON))
      } finally {
        setIsLoadingLesson(false)
      }
    }

    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Instala pacotes quando Pyodide fica pronto ────────────────────────────

  useEffect(() => {
    if (pyStatus === "ready" && lesson.libraries && lesson.libraries.length > 0) {
      addOutput("info", `Instalando pacotes necessários: ${lesson.libraries.join(", ")}...`)
      installPackages(lesson.libraries)
    }
  }, [pyStatus, lesson.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Status Pyodide no console ─────────────────────────────────────────────

  useEffect(() => {
    if (pyStatus === "loading") {
      setConsoleOutputs([createOutput("info", "Inicializando Python no navegador...")])
    } else if (pyStatus === "ready") {
      setConsoleOutputs((prev) => [...prev, createOutput("success", "Python pronto! Você pode executar seu código.")])
    } else if (pyStatus === "error") {
      setConsoleOutputs((prev) => [...prev, createOutput("error", "Erro ao carregar Python. Verifique sua conexão e recarregue a página.")])
    }
  }, [pyStatus])

  // ── Executar código ───────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    const activeFile = files.find((f) => f.id === activeFileId)
    if (!activeFile) return

    setLessonProgress((p) => Math.max(p, 50))

    if (pyStatus !== "ready") {
      addOutput("warning", "Aguarde o Python terminar de carregar para executar.")
      return
    }

    setConsoleOutputs([createOutput("info", `Executando ${activeFile.name}...`)])
    setHasRun(true)

    execute(activeFile.content, {
      onResult: (result) => {
        if (result.stdout) {
          result.stdout.split("\n").filter(Boolean).forEach((line) => addOutput("output", line))
        }
        result.figures?.forEach((b64, i) => {
          setConsoleOutputs((prev) => [...prev, {
            id: `${Date.now()}-fig-${i}`,
            type: "figure" as const,
            message: `Figura ${i + 1}`,
            timestamp: new Date(),
            figureB64: b64,
          }])
        })
        if (result.stderr) {
          const parsed = parsePythonError(result.stderr)
          addOutput("error", `${parsed.title}: ${parsed.explanation}`)
          addOutput("warning", `Erro original: ${parsed.original}`)
          addOutput("warning", `Dica: ${parsed.hint}`)
          setHasOutput(false)
        } else {
          addOutput("success", "Código executado com sucesso!")
          setHasOutput(true)
        }
      },
      onError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("warning", `Erro original: ${parsed.original}`)
        addOutput("warning", `Dica: ${parsed.hint}`)
        setHasOutput(false)
      },
    })
  }, [files, activeFileId, pyStatus, execute, addOutput])

  // ── Verificar resposta ────────────────────────────────────────────────────

  const [isVerifyingServer, setIsVerifyingServer] = useState(false)

  const handleVerify = useCallback(async () => {
    const activeFile = files.find((f) => f.id === activeFileId)
    if (!activeFile) return

    if (lesson.id === "local-1") {
      addOutput("warning", "Carregue uma lição do servidor para verificar sua resposta.")
      return
    }

    if (!hasOutput) {
      addOutput("warning", "Execute seu código sem erros antes de verificar a resposta (Ctrl+Enter).")
      return
    }

    addOutput("info", "Verificando sua resposta...")
    setIsVerifyingServer(true)

    // Avaliação server-side: o gabarito nunca chega ao browser
    const res = await evaluateOnServer(
      lesson.id,
      files.map((f) => ({ path: f.name, content: f.content })),
    )
    setIsVerifyingServer(false)

    if (!res.ok) {
      switch (res.error.type) {
        case "unauthenticated": router.push("/login"); return
        case "not_found": addOutput("error", "Lição não encontrada no servidor."); return
        case "timeout": addOutput("error", res.error.message); return
        case "server_error": addOutput("error", res.error.message); return
        case "network_error": addOutput("error", "Erro de conexão ao verificar. Verifique sua internet e tente novamente."); return
      }
      return
    }

    const testResult = res.result
    if (testResult.allPassed) {
      addOutput("success", `Todos os ${testResult.testsRun} testes passaram! +${lesson.xp_reward} XP`)
      setCheckpoints((prev) => prev.map((c) => ({ ...c, completed: true })))
      setLessonProgress(100)

      if (user) {
        try {
          const currentLevel = profile?.level ?? 1
          setPrevLevel(currentLevel)
          await awardXp(user.id, lesson.id, lesson.xp_reward)
          await refreshProfile()
          const newLvl = Math.floor(((profile?.total_xp ?? 0) + lesson.xp_reward) / 1000) + 1
          setAwardedLevel(newLvl > currentLevel ? newLvl : currentLevel)
        } catch { /* sem auth configurado */ }
      }

      setShowSuccess(true)
    } else {
      const failCount = testResult.failures + testResult.errors
      addOutput("error", `${failCount} de ${testResult.testsRun} testes falharam.`)
      testResult.failureDetails.forEach((detail) => {
        const lines = detail.split("\n").filter(Boolean)
        addOutput("warning", `Falha: ${lines[lines.length - 1] || detail}`)
      })
      addOutput("info", "Revise seu código e tente novamente. Leia as dicas no painel de conteúdo!")
      setLessonProgress((p) => Math.max(p, 60))
    }
  }, [files, activeFileId, hasOutput, lesson, addOutput, user, profile, refreshProfile, router]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setFiles([{ id: "main", name: "main.py", language: "python", content: lesson.starter_code }])
    setConsoleOutputs([createOutput("info", "Código resetado para o estado inicial.")])
  }, [lesson])

  // ── Navegação entre lições ────────────────────────────────────────────────

  const handlePrev = useCallback(() => {
    const prevIdx = currentIndex - 1
    if (prevIdx < 0 || allLessons.length === 0) return
    applyLesson(allLessons[prevIdx], prevIdx, allLessons)
  }, [currentIndex, allLessons]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => {
    const nextIdx = currentIndex + 1
    if (nextIdx >= allLessons.length) {
      router.push("/dashboard")
      return
    }
    applyLesson(allLessons[nextIdx], nextIdx, allLessons)
  }, [currentIndex, allLessons, router]) // eslint-disable-line react-hooks/exhaustive-deps

  // Atalho Ctrl+Enter para executar
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        handleRun()
      }
      if (e.altKey && e.key === "g") {
        e.preventDefault()
        handleReset()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleRun, handleReset])

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasNextLesson = allLessons.length > 0 && currentIndex < allLessons.length - 1

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Header
        lessonTitle={isLoadingLesson ? "Carregando..." : `Módulo: ${lesson.module} — ${lesson.title}`}
        lessonProgress={lessonProgress}
        xpBadgeRef={xpBadgeRef}
      />

      <div className="flex-1 overflow-hidden">
        <ResponsiveWorkspace
          lessonPanel={
            <LessonPanel
              moduleName={lesson.module}
              title={lesson.title}
              estimatedTime={lesson.time_limit ? `${Math.round(lesson.time_limit / 60)} minutos` : undefined}
              content={lesson.content_markdown}
              checkpoints={checkpoints}
              hasRun={hasRun}
              hasOutput={hasOutput}
              onVerify={handleVerify}
              isVerifying={isVerifyingServer}
              canVerify={hasOutput || lessonProgress === 100}
            />
          }
          editor={
            <CodeEditor
              tabs={files.map((f) => ({ path: f.name, content: f.content }))}
              activePath={files.find((f) => f.id === activeFileId)?.name ?? "main.py"}
              onTabSelect={(path) => {
                const f = files.find((ff) => ff.name === path)
                if (f) setActiveFileId(f.id)
              }}
              onTabClose={() => { /* playground mono-arquivo: sem fechar */ }}
              onContentChange={(path, content) => {
                setHasOutput(false)
                setFiles((prev) => prev.map((f) => (f.name === path ? { ...f, content } : f)))
              }}
              onRun={handleRun}
              onReset={handleReset}
              isRunning={isExecuting}
              pyodideStatus={pyStatus}
              solutionCode={undefined}
            />
          }
          console={
            <ConsolePanel
              outputs={consoleOutputs}
              onClear={() => setConsoleOutputs([])}
              isRunning={isExecuting}
              onRunCommand={(cmd) => {
                if (pyStatus !== "ready") {
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
          }
          fileExplorer={
            <FileExplorer
              files={files.map((f) => ({ path: f.name, content: f.content }))}
              activePath={files.find((f) => f.id === activeFileId)?.name ?? "main.py"}
              onSelect={(path) => {
                const f = files.find((ff) => ff.name === path)
                if (f) setActiveFileId(f.id)
              }}
              readOnly
            />
          }
        />
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
        prevLevel={prevLevel}
        newLevel={awardedLevel}
        xpBadgeRef={xpBadgeRef as React.RefObject<HTMLElement | null>}
        onClose={() => setShowSuccess(false)}
        onNext={handleNext}
      />
    </div>
  )
}
