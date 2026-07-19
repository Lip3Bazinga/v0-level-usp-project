"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** Detecta se o conteúdo é HTML (começa com tag) para usar dangerouslySetInnerHTML. */
function isHtmlContent(text: string): boolean {
  return /^\s*<[a-zA-Z]/.test(text.trim())
}

/**
 * Renderiza o conteúdo de uma lição EXATAMENTE como o aluno vê no painel da
 * lição (mesma classe prose-lesson, mesmo tratamento HTML/Markdown). É a fonte
 * única usada tanto pelo LessonPanel quanto pela pré-visualização do professor.
 */
export function LessonContentPreview({
  content,
  className = "prose-lesson text-sm",
}: {
  content: string
  className?: string
}) {
  if (!content?.trim()) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Nada para pré-visualizar ainda. Comece a escrever no editor.
      </p>
    )
  }

  if (isHtmlContent(content)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: content }} />
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ children, className: cls }) {
            const isBlock = cls?.startsWith("language-")
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
  )
}
