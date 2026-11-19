import type { Mermaid } from "mermaid"

/*
 * Diagramas Mermaid das lições. A biblioteca é grande e só entra na página quando a lição tem um
 * bloco ```mermaid: por isso o `import()` dinâmico (um chunk à parte, fora do bundle do player).
 */

let mermaidPromise: Promise<Mermaid> | null = null

function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((module) => {
    const mermaid = module.default
    mermaid.initialize({
      startOnLoad: false,
      // O texto do diagrama vem do professor: no modo "strict" o Mermaid codifica HTML nos
      // rótulos e desliga os links/cliques (`click … call`), e o SVG sai já sanitizado.
      securityLevel: "strict",
      theme: "neutral",
      fontFamily: "inherit",
    })
    return mermaid
  })
  return mermaidPromise
}

/**
 * Confere só a sintaxe do diagrama (`mermaid.parse`), sem desenhar. Serve à prévia do professor,
 * que avisa de diagrama inválido. Nunca lança: se a biblioteca não carrega não há como julgar e
 * o resultado é `true` (sem falso alarme).
 */
export async function isValidMermaidDiagram(code: string): Promise<boolean> {
  let mermaid: Mermaid
  try {
    mermaid = await loadMermaid()
  } catch {
    return true
  }
  try {
    return (await mermaid.parse(code, { suppressErrors: true })) !== false
  } catch {
    return false
  }
}

/**
 * Desenha o diagrama e devolve o SVG gerado pelo próprio Mermaid (modo `strict`). Devolve null
 * quando o texto não é um diagrama válido ou a biblioteca não carrega — quem chama mostra o
 * código como bloco comum. Nunca lança.
 *
 * @param elementId id único (só letras, números e hífen) usado pelo Mermaid no SVG.
 */
export async function renderMermaidDiagram(code: string, elementId: string): Promise<string | null> {
  try {
    const mermaid = await loadMermaid()
    const isValid = await mermaid.parse(code, { suppressErrors: true })
    if (isValid === false) return null
    const { svg } = await mermaid.render(elementId, code)
    return svg
  } catch {
    // Em erro de desenho o Mermaid pode deixar um elemento temporário na página.
    document.getElementById(`d${elementId}`)?.remove()
    document.getElementById(elementId)?.remove()
    return null
  }
}
