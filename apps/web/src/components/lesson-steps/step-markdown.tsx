"use client"

// CSS e fontes do KaTeX vêm do pacote npm e são servidos pelo próprio site (sem CDN).
import "katex/dist/katex.min.css"
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { cn } from "@/lib/utils"
import { codeBlockKind, parseVideoEmbedUrl, VIDEO_DIRECTIVE } from "@/lib/utils/rich-markdown"
import { MermaidDiagram } from "./mermaid-diagram"
import { TraceBlock } from "./trace-block"
import { VideoEmbed } from "./video-embed"

interface StepMarkdownProps {
  content: string
  className?: string
}

type HastElement = NonNullable<ExtraProps["node"]>
type HastNode = HastElement["children"][number]

const LANGUAGE_CLASS_PREFIX = "language-"

function isElement(node: HastNode | undefined, tagName: string): node is HastElement {
  return node?.type === "element" && node.tagName === tagName
}

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value
  return node.type === "element" ? node.children.map(textOf).join("") : ""
}

function languageOf(code: HastElement): string | null {
  const { className } = code.properties
  const classes = Array.isArray(className) ? className : []
  const languageClass = classes.find((item): item is string => typeof item === "string" && item.startsWith(LANGUAGE_CLASS_PREFIX))
  return languageClass ? languageClass.slice(LANGUAGE_CLASS_PREFIX.length) : null
}

/** Bloco de código: ```mermaid vira diagrama, ```python visualizar ganha o visualizador, o resto é `<pre>` comum. */
function CodeBlock({ node, children }: React.ComponentProps<"pre"> & ExtraProps): React.JSX.Element {
  const [code] = node?.children ?? []
  if (isElement(code, "code")) {
    const kind = codeBlockKind(languageOf(code), code.data?.meta ?? null)
    const source = textOf(code).replace(/\n$/, "")
    if (kind === "mermaid") return <MermaidDiagram code={source} />
    if (kind === "visualizer") return <TraceBlock code={source} />
  }
  return <pre>{children}</pre>
}

/**
 * Parágrafo: uma linha `::video[título](url)` sozinha vira o vídeo incorporado, e só quando a URL
 * é de um dos dois serviços aceitos. Com outro endereço a linha aparece como texto, sem link.
 */
function Paragraph({ node, children }: React.ComponentProps<"p"> & ExtraProps): React.JSX.Element {
  const [directive, link, ...rest] = node?.children ?? []
  if (directive?.type !== "text" || directive.value !== VIDEO_DIRECTIVE || !isElement(link, "a") || rest.length > 0) return <p>{children}</p>
  const title = textOf(link)
  const { href } = link.properties
  const url = typeof href === "string" ? href : ""
  const video = parseVideoEmbedUrl(url)
  if (!video) return <p>{`${VIDEO_DIRECTIVE}[${title}](${url})`}</p>
  return <VideoEmbed title={title} video={video} />
}

function LessonImage({ src, alt, title }: React.ComponentProps<"img"> & ExtraProps): React.JSX.Element | null {
  if (typeof src !== "string" || src === "") return null
  // eslint-disable-next-line @next/next/no-img-element -- imagem da lição servida pela API (/api/content/assets/…), já versionada por hash; o otimizador do next/image não se aplica
  return <img src={src} alt={alt ?? ""} title={title} loading="lazy" decoding="async" />
}

const COMPONENTS: Components = { pre: CodeBlock, p: Paragraph, img: LessonImage }
const REMARK_PLUGINS = [remarkGfm, remarkMath]
// Fórmula que o KaTeX recusa não lança: o `rehype-katex` mostra o texto original no lugar.
const REHYPE_PLUGINS = [rehypeKatex]

/**
 * Markdown do conteúdo das lições guiadas (narrativa, instruções, dicas e quiz), com fórmulas
 * (KaTeX), diagramas (```mermaid), imagens, visualizador de execução (```python visualizar) e
 * vídeo (`::video[título](url)`). HTML bruto não é interpretado (padrão do `react-markdown`): o
 * texto do professor nunca vira marcação ativa, e fórmula, diagrama ou vídeo inválidos aparecem
 * como texto em vez de quebrar a página.
 */
export function StepMarkdown({ content, className }: StepMarkdownProps): React.JSX.Element {
  return (
    <div className={cn("prose-lesson", className)}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} components={COMPONENTS}>{content}</ReactMarkdown>
    </div>
  )
}
