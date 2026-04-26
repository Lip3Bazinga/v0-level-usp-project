"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
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
  hidden_tests: `import unittest

class TestVariaveis(unittest.TestCase):
    def test_nome_preenchido(self):
        self.assertIsInstance(nome, str)
        self.assertTrue(len(nome) > 0, "A variável 'nome' deve ter pelo menos um caractere")

    def test_idade_valida(self):
        self.assertIsInstance(idade, int)
        self.assertGreater(idade, 0, "A variável 'idade' deve ser maior que zero")
`,
  xp_reward: 50,
  time_limit: 300,
  libraries: [],
  published: true,
  created_at: "",
  updated_at: "",
}

const defaultFileTree = [
  {
    id: "project",
    name: "meu-projeto",
    type: "folder" as const,
    children: [
      { id: "main", name: "main.py", type: "file" as const, language: "python" },
    ],
  },
]

function createOutput(type: ConsoleOutput["type"], message: string): ConsoleOutput {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    timestamp: new Date(),
  }
}

/** Converte content_markdown + hidden_tests de uma lição em checkpoints simples. */
function buildCheckpoints(lesson: Lesson): Checkpoint[] {
  if (!lesson.hidden_tests) {
    return [
      {
        id: 1,
        instruction: lesson.description,
        hint: "Execute o código e verifique a saída no terminal.",
        completed: false,
      },
    ]
  }

  const matches = [...lesson.hidden_tests.matchAll(/def (test_\w+)/g)]
  if (matches.length === 0) {
    return [
      {
        id: 1,
        instruction: lesson.description,
        hint: "Execute o código e clique em Verificar Resposta.",
        completed: false,
      },
    ]
  }

  return matches.map((m, i) => ({
    id: i + 1,
    instruction: `Complete o requisito: \`${m[1].replace("test_", "").replaceAll("_", " ")}\``,
    hint: "Leia o enunciado com atenção e execute seu código antes de verificar.",
    completed: false,
  }))
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

  const handleVerify = useCallback(() => {
    const activeFile = files.find((f) => f.id === activeFileId)
    if (!activeFile) return

    if (pyStatus !== "ready") {
      addOutput("warning", "Aguarde o Python terminar de carregar para verificar sua resposta.")
      return
    }

    addOutput("info", "Verificando sua resposta...")

    execute(activeFile.content, {
      testCode: lesson.hidden_tests,
      onResult: (result) => {
        if (result.stdout) {
          result.stdout.split("\n").filter(Boolean).forEach((line) => addOutput("output", line))
        }
      },
      onTestResult: async (testResult) => {
        if (testResult.allPassed) {
          addOutput("success", `Todos os ${testResult.testsRun} testes passaram! +${lesson.xp_reward} XP`)

          setCheckpoints((prev) => prev.map((c) => ({ ...c, completed: true })))
          setLessonProgress(100)

          if (user) {
            try {
              // Snapshot level before awarding xp
              const currentLevel = profile?.level ?? 1
              setPrevLevel(currentLevel)

              await awardXp(user.id, lesson.id, lesson.xp_reward)
              await refreshProfile()

              // After refresh, newLevel will be read from updated profile in the modal
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
      },
      onTestError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `Erro na verificação: ${parsed.explanation}`)
        addOutput("warning", `Dica: ${parsed.hint}`)
      },
      onError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("warning", `Dica: ${parsed.hint}`)
      },
    })
  }, [files, activeFileId, pyStatus, execute, lesson, addOutput, user, profile, refreshProfile]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Painel de conteúdo (esquerda) */}
          <ResizablePanel defaultSize={28} minSize={22} maxSize={42}>
            <LessonPanel
              moduleName={lesson.module}
              title={lesson.title}
              estimatedTime={lesson.time_limit ? `${Math.round(lesson.time_limit / 60)} minutos` : undefined}
              content={lesson.content_markdown}
              checkpoints={checkpoints}
              hasRun={hasRun}
              hasOutput={hasOutput}
              onVerify={handleVerify}
              isVerifying={isExecuting}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor + Console (centro) */}
          <ResizablePanel defaultSize={52} minSize={38}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={70} minSize={30}>
                <CodeEditor
                  files={files}
                  activeFileId={activeFileId}
                  onFileChange={setActiveFileId}
                  onContentChange={(fileId, content) =>
                    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content } : f)))
                  }
                  onRun={handleRun}
                  onReset={handleReset}
                  isRunning={isExecuting}
                  pyodideStatus={pyStatus}
                  solutionCode={lesson.solution_code ?? undefined}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
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
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Explorador de arquivos (direita) */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
            <FileExplorer
              files={defaultFileTree}
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
        prevLevel={prevLevel}
        newLevel={awardedLevel}
        xpBadgeRef={xpBadgeRef as React.RefObject<HTMLElement | null>}
        onClose={() => setShowSuccess(false)}
        onNext={handleNext}
      />
    </div>
  )
}
