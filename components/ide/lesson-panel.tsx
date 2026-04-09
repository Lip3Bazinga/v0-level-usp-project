"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, PlayCircle, BookOpen, Code2, Lightbulb } from "lucide-react"

interface LessonStep {
  id: number
  title: string
  completed: boolean
  active: boolean
}

interface LessonPanelProps {
  title: string
  description: string
  content: string
  steps: LessonStep[]
  onStepClick: (stepId: number) => void
}

export function LessonPanel({ title, description, content, steps, onStepClick }: LessonPanelProps) {
  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header do painel */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Conteúdo</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          Lição 3 de 12
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Título e descrição */}
          <div className="mb-6">
            <h2 className="mb-2 text-lg font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Conteúdo em Markdown simulado */}
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="mb-6 rounded-lg border border-border bg-secondary/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Dica</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Variáveis são como &quot;caixas&quot; que armazenam valores na memória do computador.
              </p>
            </div>

            <div className="space-y-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: content }} />

            {/* Exemplo de código */}
            <div className="mt-6 rounded-lg border border-border bg-editor-bg p-4">
              <div className="mb-2 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Exemplo</span>
              </div>
              <pre className="overflow-x-auto font-mono text-sm">
                <code className="text-muted-foreground">
                  <span className="text-primary">nome</span> = <span className="text-accent">&quot;Maria&quot;</span>{"\n"}
                  <span className="text-primary">idade</span> = <span className="text-chart-4">25</span>{"\n"}
                  <span className="text-primary">altura</span> = <span className="text-chart-4">1.68</span>{"\n\n"}
                  <span className="text-muted-foreground"># Exibindo os valores</span>{"\n"}
                  <span className="text-chart-5">print</span>(<span className="text-accent">f&quot;Nome: </span><span className="text-primary">{"{"}nome{"}"}</span><span className="text-accent">&quot;</span>)
                </code>
              </pre>
            </div>
          </div>

          {/* Passos da lição */}
          <div className="mt-8">
            <h3 className="mb-4 text-sm font-medium text-foreground">Passos da Lição</h3>
            <div className="space-y-2">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => onStepClick(step.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    step.active
                      ? "border-primary bg-primary/10"
                      : step.completed
                      ? "border-border bg-secondary/30"
                      : "border-border bg-transparent hover:bg-secondary/50"
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : step.active ? (
                    <PlayCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span
                    className={`text-sm ${
                      step.active ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Botão de ação */}
          <div className="mt-6">
            <Button className="w-full" size="lg">
              <PlayCircle className="mr-2 h-4 w-4" />
              Continuar Exercício
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
