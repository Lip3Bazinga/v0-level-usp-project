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
    <div className="flex h-full flex-col bg-white">
      {/* Header do painel */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-level-purple" />
          <span className="text-sm font-medium text-level-purple-dark">Conteúdo</span>
        </div>
        <Badge className="bg-level-purple-light text-level-purple-dark text-xs border-0">
          Lição 3 de 12
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Título e descrição */}
          <div className="mb-6">
            <h2 className="mb-2 text-lg font-bold text-level-purple-dark">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Conteúdo em Markdown simulado */}
          <div className="prose prose-sm max-w-none">
            <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-warning" />
                <span className="text-sm font-semibold text-warning">Dica</span>
              </div>
              <p className="text-sm text-foreground">
                Variáveis são como &quot;caixas&quot; que armazenam valores na memória do computador.
              </p>
            </div>

            <div className="space-y-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: content }} />

            {/* Exemplo de código */}
            <div className="mt-6 rounded-xl border border-border bg-editor-bg p-4">
              <div className="mb-2 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-level-purple-medium" />
                <span className="text-sm font-medium text-white">Exemplo</span>
              </div>
              <pre className="overflow-x-auto font-mono text-sm">
                <code className="text-gray-300">
                  <span className="text-level-purple-medium">nome</span> = <span className="text-green-400">&quot;Maria&quot;</span>{"\n"}
                  <span className="text-level-purple-medium">idade</span> = <span className="text-orange-400">25</span>{"\n"}
                  <span className="text-level-purple-medium">altura</span> = <span className="text-orange-400">1.68</span>{"\n\n"}
                  <span className="text-gray-500"># Exibindo os valores</span>{"\n"}
                  <span className="text-cyan-400">print</span>(<span className="text-green-400">f&quot;Nome: </span><span className="text-level-purple-medium">{"{"}nome{"}"}</span><span className="text-green-400">&quot;</span>)
                </code>
              </pre>
            </div>
          </div>

          {/* Passos da lição */}
          <div className="mt-8">
            <h3 className="mb-4 text-sm font-semibold text-level-purple-dark">Passos da Lição</h3>
            <div className="space-y-2">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => onStepClick(step.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                    step.active
                      ? "border-level-purple bg-level-purple-light"
                      : step.completed
                      ? "border-success/30 bg-success/10"
                      : "border-border bg-transparent hover:border-level-purple-medium hover:bg-level-purple-subtle"
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : step.active ? (
                    <PlayCircle className="h-5 w-5 text-level-purple" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span
                    className={`text-sm ${
                      step.active ? "font-medium text-level-purple-dark" : step.completed ? "text-success" : "text-muted-foreground"
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
            <button className="w-full rounded-xl bg-level-purple py-3 text-sm font-semibold text-white btn-3d flex items-center justify-center gap-2 hover:bg-level-purple-medium transition-colors">
              <PlayCircle className="h-4 w-4" />
              Continuar Exercício
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
