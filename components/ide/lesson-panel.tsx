"use client"

import { useState, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  ShieldCheck,
  ExternalLink,
  FileText,
  MessageCircle,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export interface Checkpoint {
  id: number
  instruction: string
  hint?: string
  completed?: boolean
}

interface LessonPanelProps {
  moduleName: string
  title: string
  estimatedTime?: string
  content: string
  checkpoints: Checkpoint[]
  cheatsheetUrl?: string
  /** true quando o aluno já clicou em Executar pelo menos uma vez */
  hasRun?: boolean
  /** true quando a execução produziu saída sem erro */
  hasOutput?: boolean
  onVerify?: () => void
  isVerifying?: boolean
}

function HintAccordion({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((v) => !v), [])

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
      >
        <span>Está com dificuldades? Veja uma dica.</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        )}
      </button>
      {open && (
        <div className="border-t border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-800 leading-relaxed">{hint}</p>
        </div>
      )}
    </div>
  )
}

function StepItem({
  done,
  label,
  sublabel,
}: {
  done: boolean
  label: string
  sublabel?: string
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border-2 p-3 transition-all duration-300 ${
        done ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
      }`}
    >
      {done ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      )}
      <div className="min-w-0">
        <p className={`text-sm font-medium ${done ? "text-green-700" : "text-gray-600"}`}>
          {label}
        </p>
        {sublabel && (
          <p className="mt-0.5 text-xs text-gray-400">{sublabel}</p>
        )}
      </div>
    </div>
  )
}

export function LessonPanel({
  moduleName,
  title,
  estimatedTime,
  content,
  checkpoints,
  cheatsheetUrl,
  hasRun = false,
  hasOutput = false,
  onVerify,
  isVerifying,
}: LessonPanelProps) {
  const allCheckpointsDone = checkpoints.every((c) => c.completed)

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Label "Aprender" */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
        <BookOpen className="h-4 w-4 text-level-purple" />
        <span className="text-sm font-semibold text-level-purple-dark">Aprender</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5">
          {/* Breadcrumb/tag do módulo */}
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-level-purple">
            {moduleName}
          </p>

          {/* Título do exercício */}
          <h2 className="mb-1 text-xl font-bold text-level-purple-dark leading-tight">{title}</h2>

          {/* Tempo estimado */}
          {estimatedTime && (
            <p className="mb-5 text-xs text-gray-400">{estimatedTime}</p>
          )}

          {/* Corpo da teoria (Markdown) */}
          <div className="prose-lesson text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ children, className }) {
                  const isBlock = className?.startsWith("language-")
                  if (isBlock) {
                    return (
                      <div className="relative my-3 overflow-hidden rounded-lg">
                        <pre className="overflow-x-auto bg-[#1e1e1e] p-4 text-xs text-gray-200 leading-relaxed">
                          <code>{children}</code>
                        </pre>
                      </div>
                    )
                  }
                  return (
                    <code className="rounded bg-level-purple-subtle px-1.5 py-0.5 font-mono text-[11px] text-level-purple-dark">
                      {children}
                    </code>
                  )
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* ── Seção de Instruções ──────────────────────────────── */}
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-level-purple" />
              <h3 className="text-sm font-bold text-level-purple-dark">Instruções</h3>
            </div>

            {/* Checkpoints pedagógicos da lição */}
            {checkpoints.length > 0 && (
              <div className="mb-4 space-y-3">
                {checkpoints.map((cp) => (
                  <div
                    key={cp.id}
                    className={`rounded-xl border-2 p-3 transition-all duration-300 ${
                      cp.completed
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {cp.completed ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 mb-0.5">{cp.id}.</p>
                        <div className="prose-lesson text-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {cp.instruction}
                          </ReactMarkdown>
                        </div>
                        {cp.hint && <HintAccordion hint={cp.hint} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Checkpoints de execução — sempre presentes, ficam dinâmicos */}
            <div className="space-y-2">
              <StepItem
                done={hasRun}
                label="Executar o código"
                sublabel='Clique em "Executar" ou pressione Ctrl+Enter'
              />
              <StepItem
                done={hasOutput}
                label="Código executou sem erros"
                sublabel="Verifique a saída no terminal"
              />
            </div>

            {/* Botão Verificar — sempre visível quando onVerify existe */}
            {onVerify && (
              <div className="mt-5">
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
                  ) : allCheckpointsDone ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Resposta Verificada!
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Verificar Resposta
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Seção de Revisão */}
          <div className="mt-8 space-y-2 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText className="h-3.5 w-3.5 shrink-0 text-level-purple" />
              <span>Revisão do conceito: </span>
              {cheatsheetUrl ? (
                <a
                  href={cheatsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-level-purple hover:underline"
                >
                  Ver cheatsheet
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="italic text-gray-400">Não disponível</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MessageCircle className="h-3.5 w-3.5 shrink-0 text-level-purple" />
              <span>Apoio comunitário: </span>
              <a
                href="https://discord.gg/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-level-purple hover:underline"
              >
                Fórum
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
