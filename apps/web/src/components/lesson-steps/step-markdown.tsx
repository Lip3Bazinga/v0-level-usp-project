"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface StepMarkdownProps {
  content: string
  className?: string
}

/**
 * Markdown do conteúdo das lições guiadas (narrativa, instruções, dicas e quiz). HTML bruto
 * não é interpretado (padrão do `react-markdown`): o texto do professor nunca vira marcação ativa.
 */
export function StepMarkdown({ content, className }: StepMarkdownProps): React.JSX.Element {
  return (
    <div className={cn("prose-lesson", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
