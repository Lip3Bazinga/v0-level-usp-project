"use client"

import { useState, useCallback } from "react"
import { useParams } from "next/navigation"
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

// Mock lesson data - in production, fetch from Supabase by params.id
const lessonData: Record<string, { title: string; module: string; content: string; starterCode: string }> = {
  "1": {
    title: "Variaveis e Tipos de Dados",
    module: "Modulo 1: Python Basico",
    content: `
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
    starterCode: `# Bem-vindo ao LevelUSP!
# Complete o exercicio abaixo

# Crie uma variavel chamada 'nome' com seu nome
nome = ""

# Crie uma variavel chamada 'idade' com sua idade
idade = 0

# Imprima uma mensagem de boas-vindas
print(f"Ola, {nome}! Voce tem {idade} anos.")
`,
  },
  "4": {
    title: "Loops e Iteracao",
    module: "Modulo 1: Python Basico",
    content: `
<h3 class="text-base font-semibold text-foreground mb-3">O que sao Loops?</h3>
<p class="text-muted-foreground mb-4">
  Loops permitem executar um bloco de codigo repetidamente. Python tem dois tipos principais: for e while.
</p>
<h3 class="text-base font-semibold text-foreground mb-3">Loop For</h3>
<p class="text-muted-foreground mb-4">
  Usado para iterar sobre sequencias (listas, strings, ranges).
</p>
<h3 class="text-base font-semibold text-foreground mb-3">Seu Desafio</h3>
<p class="text-muted-foreground">
  Use um loop for para calcular a soma dos numeros de 1 a 10.
</p>
`,
    starterCode: `# Calcule a soma dos numeros de 1 a 10 usando um loop for
soma = 0

# Seu codigo aqui:
for i in range(1, 11):
    pass  # Substitua o 'pass' pela logica correta

print(f"A soma de 1 a 10 e: {soma}")
`,
  },
}

const defaultLesson = {
  title: "Licao",
  module: "Modulo",
  content: "<p class='text-muted-foreground'>Conteudo da licao sera carregado do banco de dados.</p>",
  starterCode: "# Seu codigo aqui\n",
}

export default function LessonPage() {
  const params = useParams()
  const lessonId = params.id as string
  const lesson = lessonData[lessonId] || defaultLesson

  const initialFiles = [
    {
      id: "main",
      name: "main.py",
      language: "python",
      content: lesson.starterCode,
    },
  ]

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

  const lessonSteps = [
    { id: 1, title: "Ler a teoria", completed: true, active: false },
    { id: 2, title: "Escrever o codigo", completed: false, active: true },
    { id: 3, title: "Executar e validar", completed: false, active: false },
  ]

  const [files, setFiles] = useState(initialFiles)
  const [activeFileId, setActiveFileId] = useState("main")
  const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState(lessonSteps)

  const handleContentChange = useCallback((fileId: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content } : f))
    )
  }, [])

  const handleRun = useCallback(() => {
    setIsRunning(true)
    setConsoleOutputs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "info",
        message: "Executando main.py...",
        timestamp: new Date(),
      },
    ])

    setTimeout(() => {
      setConsoleOutputs((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "output",
          message: "Codigo executado.",
          timestamp: new Date(),
        },
        {
          id: (Date.now() + 2).toString(),
          type: "success",
          message: "Codigo executado com sucesso! +50 XP",
          timestamp: new Date(),
        },
      ])
      setIsRunning(false)
    }, 1500)
  }, [])

  const handleReset = useCallback(() => {
    setFiles(initialFiles)
    setConsoleOutputs([
      {
        id: Date.now().toString(),
        type: "info",
        message: "Codigo resetado para o estado inicial.",
        timestamp: new Date(),
      },
    ])
  }, [])

  const handleClearConsole = useCallback(() => {
    setConsoleOutputs([])
  }, [])

  const handleStepClick = useCallback((stepId: number) => {
    setSteps((prev) =>
      prev.map((s) => ({
        ...s,
        active: s.id === stepId,
      }))
    )
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Header
        xp={2450}
        maxXp={3000}
        streak={7}
        level={12}
        lessonTitle={lesson.module}
        lessonProgress={45}
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <LessonPanel
              title={lesson.title}
              description="Complete o desafio para ganhar XP e avancar."
              content={lesson.content}
              steps={steps}
              onStepClick={handleStepClick}
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
                  isRunning={isRunning}
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
    </div>
  )
}
