"use client"

import { useState, useCallback } from "react"
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

// Dados iniciais simulados
const initialFiles = [
  {
    id: "main",
    name: "main.py",
    language: "python",
    content: `# Bem-vindo ao LevelUSP!
# Complete o exercício abaixo

# Crie uma variável chamada 'nome' com seu nome
nome = ""

# Crie uma variável chamada 'idade' com sua idade
idade = 0

# Imprima uma mensagem de boas-vindas
print(f"Olá, {nome}! Você tem {idade} anos.")
`,
  },
  {
    id: "data",
    name: "data.csv",
    language: "csv",
    content: `nome,idade,cidade
Ana,25,São Paulo
Bruno,30,Rio de Janeiro
Carla,22,Belo Horizonte
Daniel,28,Curitiba
Elena,35,Porto Alegre`,
  },
  {
    id: "config",
    name: "config.json",
    language: "json",
    content: `{
  "lesson_id": 3,
  "difficulty": "iniciante",
  "language": "python",
  "time_limit": 300
}`,
  },
]

const fileTree = [
  {
    id: "project",
    name: "meu-projeto",
    type: "folder" as const,
    children: [
      { id: "main", name: "main.py", type: "file" as const, language: "python" },
      { id: "data", name: "data.csv", type: "file" as const, language: "csv" },
      { id: "config", name: "config.json", type: "file" as const, language: "json" },
    ],
  },
]

const lessonSteps = [
  { id: 1, title: "Entender variáveis", completed: true, active: false },
  { id: 2, title: "Tipos de dados", completed: true, active: false },
  { id: 3, title: "Criar suas variáveis", completed: false, active: true },
  { id: 4, title: "Exibir valores", completed: false, active: false },
  { id: 5, title: "Desafio final", completed: false, active: false },
]

const lessonContent = `
<h3 class="text-base font-semibold text-foreground mb-3">O que são Variáveis?</h3>
<p class="text-muted-foreground mb-4">
  Em Python, variáveis são utilizadas para armazenar valores na memória do computador. 
  Você pode pensar nelas como "etiquetas" que damos aos dados.
</p>

<h3 class="text-base font-semibold text-foreground mb-3">Tipos de Dados Básicos</h3>
<ul class="list-disc list-inside space-y-2 text-muted-foreground mb-4">
  <li><strong class="text-foreground">String (str)</strong>: Texto entre aspas, ex: "Maria"</li>
  <li><strong class="text-foreground">Inteiro (int)</strong>: Números inteiros, ex: 25</li>
  <li><strong class="text-foreground">Decimal (float)</strong>: Números com casas decimais, ex: 1.75</li>
  <li><strong class="text-foreground">Booleano (bool)</strong>: Verdadeiro ou Falso (True/False)</li>
</ul>

<h3 class="text-base font-semibold text-foreground mb-3">Seu Desafio</h3>
<p class="text-muted-foreground">
  No editor ao lado, complete o código criando variáveis com seu nome e idade, 
  e depois execute para ver o resultado!
</p>
`

export default function LevelUSPIDE() {
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

    // Simular execução
    setTimeout(() => {
      const activeFile = files.find((f) => f.id === activeFileId)
      if (activeFile?.language === "python") {
        // Simular output
        const nomeMatch = activeFile.content.match(/nome\s*=\s*["'](.*)["']/)
        const idadeMatch = activeFile.content.match(/idade\s*=\s*(\d+)/)
        
        const nome = nomeMatch?.[1] || ""
        const idade = idadeMatch?.[1] || "0"

        if (nome && nome.length > 0) {
          setConsoleOutputs((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              type: "output",
              message: `Olá, ${nome}! Você tem ${idade} anos.`,
              timestamp: new Date(),
            },
            {
              id: (Date.now() + 2).toString(),
              type: "success",
              message: "✓ Código executado com sucesso! +50 XP",
              timestamp: new Date(),
            },
          ])
        } else {
          setConsoleOutputs((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              type: "warning",
              message: "Dica: Não se esqueça de preencher a variável 'nome' com seu nome!",
              timestamp: new Date(),
            },
          ])
        }
      }
      setIsRunning(false)
    }, 1500)
  }, [files, activeFileId])

  const handleReset = useCallback(() => {
    setFiles(initialFiles)
    setConsoleOutputs([
      {
        id: Date.now().toString(),
        type: "info",
        message: "Código resetado para o estado inicial.",
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
      {/* Header com gamificação */}
      <Header
        xp={2450}
        maxXp={3000}
        streak={7}
        level={12}
        lessonTitle="Módulo 1: Variáveis em Python"
        lessonProgress={45}
      />

      {/* Layout principal */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Painel de conteúdo educativo (esquerda) */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <LessonPanel
              title="Variáveis e Tipos de Dados"
              description="Aprenda a criar e utilizar variáveis em Python para armazenar diferentes tipos de informação."
              content={lessonContent}
              steps={steps}
              onStepClick={handleStepClick}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor e Console (centro) */}
          <ResizablePanel defaultSize={55} minSize={40}>
            <ResizablePanelGroup direction="vertical">
              {/* Editor de código */}
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

              {/* Console */}
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
    </div>
  )
}
