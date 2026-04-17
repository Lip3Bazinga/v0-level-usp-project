"use client"

import { useState, useCallback, useEffect } from "react"
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
import { createClient } from "@/lib/supabase/client"
import type { Lesson } from "@/lib/database.types"

// Dados fallback para quando Supabase nao esta configurado
const FALLBACK_LESSON: Lesson = {
  id: "local-1",
  title: "Variaveis e Tipos de Dados",
  description:
    "Aprenda a criar e utilizar variaveis em Python para armazenar diferentes tipos de informacao.",
  module: "python-basico",
  order: 1,
  difficulty: "iniciante",
  content_markdown: `
<h3 class="text-base font-semibold text-foreground mb-3">O que sao Variaveis?</h3>
<p class="text-muted-foreground mb-4">
  Em Python, variaveis sao utilizadas para armazenar valores na memoria do computador.
  Voce pode pensar nelas como "etiquetas" que damos aos dados.
</p>

<h3 class="text-base font-semibold text-foreground mb-3">Tipos de Dados Basicos</h3>
<ul class="list-disc list-inside space-y-2 text-muted-foreground mb-4">
  <li><strong class="text-foreground">String (str)</strong>: Texto entre aspas, ex: "Maria"</li>
  <li><strong class="text-foreground">Inteiro (int)</strong>: Numeros inteiros, ex: 25</li>
  <li><strong class="text-foreground">Decimal (float)</strong>: Numeros com casas decimais, ex: 1.75</li>
  <li><strong class="text-foreground">Booleano (bool)</strong>: Verdadeiro ou Falso (True/False)</li>
</ul>

<h3 class="text-base font-semibold text-foreground mb-3">Seu Desafio</h3>
<p class="text-muted-foreground">
  No editor ao lado, complete o codigo criando variaveis com seu nome e idade,
  e depois execute para ver o resultado!
</p>
`,
  starter_code: `# Bem-vindo ao LevelUSP!
# Complete o exercicio abaixo

# Crie uma variavel chamada 'nome' com seu nome
nome = ""

# Crie uma variavel chamada 'idade' com sua idade
idade = 0

# Imprima uma mensagem de boas-vindas
print(f"Ola, {nome}! Voce tem {idade} anos.")
`,
  hidden_tests: `import unittest

class TestVariaveis(unittest.TestCase):
    def test_nome_preenchido(self):
        self.assertIsInstance(nome, str)
        self.assertTrue(len(nome) > 0, "A variavel 'nome' deve ter pelo menos um caractere")

    def test_idade_valida(self):
        self.assertIsInstance(idade, int)
        self.assertGreater(idade, 0, "A variavel 'idade' deve ser maior que zero")

if __name__ == '__main__':
    unittest.main()
`,
  xp_reward: 50,
  time_limit: 300,
  libraries: [],
  published: true,
  created_at: "",
  updated_at: "",
}

const fileTree = [
  {
    id: "project",
    name: "meu-projeto",
    type: "folder" as const,
    children: [
      { id: "main", name: "main.py", type: "file" as const, language: "python" },
    ],
  },
]

const defaultSteps = [
  { id: 1, title: "Ler o conteudo", completed: false, active: true },
  { id: 2, title: "Escrever o codigo", completed: false, active: false },
  { id: 3, title: "Executar e testar", completed: false, active: false },
  { id: 4, title: "Verificar resposta", completed: false, active: false },
]

function createOutput(
  type: ConsoleOutput["type"],
  message: string
): ConsoleOutput {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    timestamp: new Date(),
  }
}

export default function LevelUSPIDE() {
  // Lesson state
  const [lesson, setLesson] = useState<Lesson>(FALLBACK_LESSON)
  const [isLoadingLesson, setIsLoadingLesson] = useState(true)

  // Editor state
  const [files, setFiles] = useState([
    {
      id: "main",
      name: "main.py",
      language: "python",
      content: FALLBACK_LESSON.starter_code,
    },
  ])
  const [activeFileId, setActiveFileId] = useState("main")
  const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([])
  const [steps, setSteps] = useState(defaultSteps)

  // Feedback state
  const [showSuccess, setShowSuccess] = useState(false)

  // Gamification state
  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [lessonProgress, setLessonProgress] = useState(0)

  // Pyodide engine
  const { status: pyStatus, isExecuting, execute } = usePython()

  // ──────────────────────────────────────────────
  // Fetch lesson from Supabase
  // ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchLesson() {
      try {
        // Pega lesson_id da URL ou carrega a primeira licao
        const params = new URLSearchParams(window.location.search)
        const lessonId = params.get("lesson")

        let query = supabase
          .from("lessons")
          .select("*")
          .eq("published", true)

        if (lessonId) {
          query = query.eq("id", lessonId)
        } else {
          query = query.order("order", { ascending: true }).limit(1)
        }

        const { data, error } = await query.single()

        if (error || !data) {
          // Supabase nao configurado ou sem dados — usa fallback
          console.info("Usando licao local (Supabase nao configurado):", error?.message)
          setIsLoadingLesson(false)
          return
        }

        const fetchedLesson = data as Lesson
        setLesson(fetchedLesson)
        setFiles([
          {
            id: "main",
            name: "main.py",
            language: "python",
            content: fetchedLesson.starter_code,
          },
        ])
      } catch {
        // Supabase nao configurado — usa fallback silenciosamente
        console.info("Supabase nao disponivel, usando licao local.")
      } finally {
        setIsLoadingLesson(false)
      }
    }

    // Fetch user progress
    async function fetchUserProgress() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from("profiles")
          .select("total_xp, level, current_streak")
          .eq("id", user.id)
          .single()

        if (profile) {
          setXp(profile.total_xp)
          setLevel(profile.level)
          setStreak(profile.current_streak)
        }
      } catch {
        // Sem auth configurado — ignora
      }
    }

    fetchLesson()
    fetchUserProgress()
  }, [])

  // ──────────────────────────────────────────────
  // Editor handlers
  // ──────────────────────────────────────────────
  const handleContentChange = useCallback((fileId: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content } : f))
    )
  }, [])

  const addOutput = useCallback((type: ConsoleOutput["type"], message: string) => {
    setConsoleOutputs((prev) => [...prev, createOutput(type, message)])
  }, [])

  // ──────────────────────────────────────────────
  // Run code (Pyodide)
  // ──────────────────────────────────────────────
  const handleRun = useCallback(() => {
    const activeFile = files.find((f) => f.id === activeFileId)
    if (!activeFile) return

    // Atualiza steps
    setSteps((prev) =>
      prev.map((s) =>
        s.id <= 2 ? { ...s, completed: true, active: false } : s.id === 3 ? { ...s, active: true } : s
      )
    )
    setLessonProgress(50)

    if (pyStatus !== "ready") {
      addOutput("info", "Carregando Python... Aguarde um momento.")
      addOutput("warning", "O runtime Python (Pyodide) ainda esta inicializando. Tente novamente em alguns segundos.")
      return
    }

    addOutput("info", `Executando ${activeFile.name}...`)

    execute(activeFile.content, {
      onResult: (result) => {
        if (result.stdout) {
          result.stdout.split("\n").filter(Boolean).forEach((line) => {
            addOutput("output", line)
          })
        }
        if (result.stderr) {
          const parsed = parsePythonError(result.stderr)
          addOutput("error", `${parsed.title}: ${parsed.explanation}`)
          addOutput("warning", `Dica: ${parsed.hint}`)
        }
        if (!result.stderr) {
          addOutput("success", "Codigo executado com sucesso!")
        }
      },
      onError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("warning", `Dica: ${parsed.hint}`)
        if (parsed.original !== error) {
          addOutput("output", `Detalhe: ${parsed.original.split("\n").pop()}`)
        }
      },
    })
  }, [files, activeFileId, pyStatus, execute, addOutput])

  // ──────────────────────────────────────────────
  // Verify answer (run + hidden tests)
  // ──────────────────────────────────────────────
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
          result.stdout.split("\n").filter(Boolean).forEach((line) => {
            addOutput("output", line)
          })
        }
      },
      onTestResult: async (testResult) => {
        if (testResult.allPassed) {
          addOutput(
            "success",
            `Todos os ${testResult.testsRun} testes passaram! +${lesson.xp_reward} XP`
          )

          // Atualiza steps
          setSteps((prev) => prev.map((s) => ({ ...s, completed: true, active: false })))
          setLessonProgress(100)

          // Mostra feedback de sucesso com confetti
          setShowSuccess(true)

          // Atualiza XP local
          setXp((prev) => prev + lesson.xp_reward)

          // Persiste no Supabase
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              // Atualiza user_progress
              await supabase.from("user_progress").upsert({
                user_id: user.id,
                lesson_id: lesson.id,
                completed: true,
                xp_earned: lesson.xp_reward,
                attempts: 1,
              }, { onConflict: "user_id,lesson_id" })

              // Atualiza user_daily_activity
              const today = new Date().toISOString().split("T")[0]
              const { data: existing } = await supabase
                .from("user_daily_activity")
                .select("*")
                .eq("user_id", user.id)
                .eq("date", today)
                .single()

              if (existing) {
                await supabase
                  .from("user_daily_activity")
                  .update({
                    xp_earned: existing.xp_earned + lesson.xp_reward,
                    lessons_completed: existing.lessons_completed + 1,
                  })
                  .eq("id", existing.id)
              } else {
                await supabase.from("user_daily_activity").insert({
                  user_id: user.id,
                  date: today,
                  xp_earned: lesson.xp_reward,
                  lessons_completed: 1,
                  streak_count: streak + 1,
                })
                setStreak((prev) => prev + 1)
              }

              // Atualiza profile (XP total)
              await supabase
                .from("profiles")
                .update({
                  total_xp: xp + lesson.xp_reward,
                  current_streak: streak + 1,
                })
                .eq("id", user.id)
            }
          } catch {
            // Sem auth — progresso so local
          }
        } else {
          addOutput(
            "error",
            `${testResult.failures + testResult.errors} de ${testResult.testsRun} testes falharam.`
          )
          testResult.failureDetails.forEach((detail) => {
            const lines = detail.split("\n").filter(Boolean)
            const lastLine = lines[lines.length - 1] || detail
            addOutput("warning", `Falha: ${lastLine}`)
          })
          addOutput(
            "info",
            "Revise seu codigo e tente novamente. Leia as dicas no painel de conteudo!"
          )

          // Marca step 3 como ativo
          setSteps((prev) =>
            prev.map((s) =>
              s.id <= 2 ? { ...s, completed: true, active: false } : s.id === 3 ? { ...s, active: true } : s
            )
          )
          setLessonProgress(60)
        }
      },
      onTestError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `Erro na verificacao: ${parsed.explanation}`)
        addOutput("warning", `Dica: ${parsed.hint}`)
      },
      onError: (error) => {
        const parsed = parsePythonError(error)
        addOutput("error", `${parsed.title}: ${parsed.explanation}`)
        addOutput("warning", `Dica: ${parsed.hint}`)
      },
    })
  }, [files, activeFileId, pyStatus, execute, lesson, xp, streak, addOutput])

  // ──────────────────────────────────────────────
  // Reset & clear
  // ──────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setFiles([
      {
        id: "main",
        name: "main.py",
        language: "python",
        content: lesson.starter_code,
      },
    ])
    setConsoleOutputs([createOutput("info", "Codigo resetado para o estado inicial.")])
  }, [lesson])

  const handleClearConsole = useCallback(() => {
    setConsoleOutputs([])
  }, [])

  const handleStepClick = useCallback((stepId: number) => {
    setSteps((prev) =>
      prev.map((s) => ({ ...s, active: s.id === stepId }))
    )
  }, [])

  // Status do Pyodide no console
  useEffect(() => {
    if (pyStatus === "loading") {
      setConsoleOutputs([createOutput("info", "Inicializando Python no navegador...")])
    } else if (pyStatus === "ready") {
      setConsoleOutputs((prev) => [
        ...prev,
        createOutput("success", "Python pronto! Voce pode executar seu codigo."),
      ])
    } else if (pyStatus === "error") {
      setConsoleOutputs((prev) => [
        ...prev,
        createOutput(
          "error",
          "Erro ao carregar Python. Verifique sua conexao e recarregue a pagina."
        ),
      ])
    }
  }, [pyStatus])

  // XP necessario para o proximo nivel
  const maxXp = level * 500

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* Header com gamificacao */}
      <Header
        xp={xp}
        maxXp={maxXp}
        streak={streak}
        level={level}
        lessonTitle={`Modulo: ${lesson.title}`}
        lessonProgress={lessonProgress}
      />

      {/* Layout principal */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Painel de conteudo educativo (esquerda) */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <LessonPanel
              title={lesson.title}
              description={lesson.description}
              content={lesson.content_markdown}
              steps={steps}
              onStepClick={handleStepClick}
              onVerify={handleVerify}
              isVerifying={isExecuting}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor e Console (centro) */}
          <ResizablePanel defaultSize={55} minSize={40}>
            <ResizablePanelGroup direction="vertical">
              {/* Editor de codigo */}
              <ResizablePanel defaultSize={70} minSize={30}>
                <CodeEditor
                  files={files}
                  activeFileId={activeFileId}
                  onFileChange={setActiveFileId}
                  onContentChange={handleContentChange}
                  onRun={handleRun}
                  onReset={handleReset}
                  isRunning={isExecuting}
                  pyodideStatus={pyStatus}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Console */}
              <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                <ConsolePanel
                  outputs={consoleOutputs}
                  onClear={handleClearConsole}
                  isRunning={isExecuting}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Explorador de arquivos (direita) */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <FileExplorer
              files={fileTree}
              activeFileId={activeFileId}
              onFileSelect={setActiveFileId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Feedback de sucesso com confetti */}
      <SuccessFeedback
        show={showSuccess}
        xpEarned={lesson.xp_reward}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}
