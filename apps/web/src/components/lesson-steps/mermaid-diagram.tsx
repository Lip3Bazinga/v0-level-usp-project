"use client"

import { useEffect, useId, useState } from "react"
import { renderMermaidDiagram } from "@/lib/mermaid"

interface MermaidDiagramProps {
  /** Texto do bloco ```mermaid, como o professor escreveu. */
  code: string
}

/** Resultado do desenho, guardado junto do código a que pertence (o conteúdo pode mudar). */
interface DiagramResult {
  code: string
  /** SVG gerado pelo Mermaid; null quando o texto não é um diagrama válido. */
  svg: string | null
}

/**
 * Diagrama de um bloco ```mermaid. Enquanto a biblioteca carrega — e sempre que o Mermaid recusa
 * o texto — o código aparece como bloco comum: diagrama inválido nunca quebra a lição.
 */
export function MermaidDiagram({ code }: MermaidDiagramProps): React.JSX.Element {
  const elementId = `diagrama-${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const [result, setResult] = useState<DiagramResult | null>(null)

  useEffect(() => {
    let isCurrent = true
    void renderMermaidDiagram(code, elementId).then((svg) => {
      if (isCurrent) setResult({ code, svg })
    })
    return () => {
      isCurrent = false
    }
  }, [code, elementId])

  const svg = result?.code === code ? result.svg : null
  if (svg === null) {
    return (
      <pre data-diagram-state={result?.code === code ? "invalid" : "loading"}>
        <code>{code}</code>
      </pre>
    )
  }
  return (
    <figure className="my-4">
      {/* O SVG é gerado pelo próprio Mermaid com securityLevel "strict" (rótulos codificados, sem cliques nem scripts); o texto do professor nunca é inserido como HTML diretamente. */}
      <div role="img" aria-label="Diagrama da lição" className="lesson-widget flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Ver o diagrama como texto</summary>
        <pre><code>{code}</code></pre>
      </details>
    </figure>
  )
}
