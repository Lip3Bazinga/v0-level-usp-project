"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, PlayCircle, BookOpen, ShieldCheck } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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
  onVerify?: () => void
  isVerifying?: boolean
}

export function LessonPanel({ title, description, content, steps, onStepClick, onVerify, isVerifying }: LessonPanelProps) {
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header do painel */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-level-purple" />
          <span className="text-sm font-medium text-level-purple-dark">Conteúdo</span>
        </div>
        <Badge className="bg-level-purple-light text-level-purple-dark text-xs border-0">
          Lição
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Título e descrição */}
          <div className="mb-6">
            <h2 className="mb-2 text-lg font-bold text-level-purple-dark">{title}</h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>

          {/* Conteúdo Markdown renderizado */}
          <div className="prose-lesson">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-transparent hover:border-level-purple-medium hover:bg-level-purple-subtle"
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : step.active ? (
                    <PlayCircle className="h-5 w-5 text-level-purple" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                  <span
                    className={`text-sm ${
                      step.active ? "font-medium text-level-purple-dark" : step.completed ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Botoes de acao */}
          <div className="mt-6 space-y-3">
            {onVerify && (
              <button
                onClick={onVerify}
                disabled={isVerifying}
                className="w-full rounded-xl bg-green-500 py-3 text-sm font-semibold text-white btn-3d flex items-center justify-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verificar Resposta
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
