"use client"

import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { sanitizeLessonHtml } from "@/lib/sanitize"

/** Conteúdo salvo pelo editor rico é HTML (começa com tag); o antigo é Markdown. */
function isHtmlContent(text: string): boolean {
  return /^\s*<[a-zA-Z]/.test(text.trim())
}

/** Blocos de código no tema escuro da IDE; código em linha com o destaque roxo. */
const MARKDOWN_COMPONENTS: Components = {
  code({ children, className }) {
    if (className?.startsWith("language-")) {
      return (
        <div className="relative my-3 overflow-hidden rounded-lg">
          <pre className="overflow-x-auto bg-[#1e1e1e] p-4 text-xs leading-relaxed text-gray-200">
            <code>{children}</code>
          </pre>
        </div>
      )
    }
    return (
      <code className="rounded bg-level-purple-subtle px-1.5 py-0.5 font-mono text-[11px] text-level-purple-dark">{children}</code>
    )
  },
}

interface LessonContentPreviewProps {
  content: string
  className?: string
}

/**
 * Renderiza o conteúdo de uma lição EXATAMENTE como o aluno vê no painel da
 * lição (mesma classe prose-lesson, mesmo tratamento HTML/Markdown). É a fonte
 * única usada tanto pelo LessonPanel quanto pela pré-visualização do professor.
 */
export function LessonContentPreview({ content, className = "prose-lesson text-sm" }: LessonContentPreviewProps) {
  if (!content.trim()) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Nada para pré-visualizar ainda. Comece a escrever no editor.
      </p>
    )
  }

  if (isHtmlContent(content)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(content) }} />
  }

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
