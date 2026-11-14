import { afterEach, describe, expect, it } from "vitest"
import type { ContentAssetType } from "@levelusp/contracts"
import { compileContent } from "../../../scripts/content/compiler"
import { lintContent } from "../../../scripts/content/lint"
import { scanMarkdown, toSourceLines } from "../../../scripts/content/markdown"
import { callsInput, describePythonProblem } from "../../../scripts/content/python-syntax"
import { canonicalVideoUrl, checkFormulas, findFormulas, processNarrative, type AssetSource } from "../../../scripts/content/rich-content"
import { formatProblem } from "../../../scripts/content/source-map"
import { frontmatter, LONG_NARRATIVE, validTree, writeTree, type TempTree } from "./fixtures"

interface Processed {
  markdown: string
  problems: string[]
  published: string[]
}

const SAFE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

/** Processa uma narrativa que começa na linha 10 do "arquivo", com uma pasta de assets em memória. */
function process(text: string, files: Record<string, Uint8Array | string> = {}): Processed {
  const problems: string[] = []
  const published: string[] = []
  const assets: AssetSource = {
    read: (fileName) => {
      const content = files[fileName]
      return content === undefined ? null : typeof content === "string" ? new TextEncoder().encode(content) : content
    },
    publish: (fileName: string, contentType: ContentAssetType) => {
      published.push(`${fileName} (${contentType})`)
      return `/api/content/assets/c/m/${fileName}?v=abc`
    },
  }
  const markdown = processNarrative(scanMarkdown(toSourceLines(text, 10)), { report: (line, message) => problems.push(`${line}: ${message}`), assets })
  return { markdown, problems, published }
}

describe("fórmulas ($…$ e $$…$$)", () => {
  it("aceita fórmulas válidas em linha e em bloco e mantém o markdown como foi escrito", () => {
    const text = "A área é $A = \\pi r^2$ e a soma:\n\n$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$"
    expect(process(text)).toEqual({ markdown: text, problems: [], published: [] })
  })

  it("aponta a linha da fórmula que o KaTeX recusa", () => {
    const { problems } = process("Texto.\n\nA fração $\\frac{1}{$ está quebrada.\n\n$$\n\\comandoinexistente{x}\n$$")
    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(/^12: fórmula inválida \(KaTeX\): /)
    expect(problems[1]).toMatch(/^14: fórmula inválida \(KaTeX\): Undefined control sequence: \\comandoinexistente/)
  })

  it("não lê fórmula dentro de bloco de código nem de trecho entre crases", () => {
    const text = "O texto `custo = \"$ 5\"` e ``a $ b`` não são fórmulas.\n\n```python\npreco = \"R$ 10\"\nprint(f\"${preco}\")\n```"
    expect(process(text).problems).toEqual([])
  })

  it("valor em dinheiro precisa do cifrão escapado; sem escapar, o problema explica a regra", () => {
    expect(process("O livro custa R\\$ 25,00 e o caderno R\\$ 12,50.").problems).toEqual([])
    expect(process("O livro custa R$ 25,00.").problems).toEqual([expect.stringMatching(/^10: cifrão \(\$\) sem par: .*escreva \\\$/)])
    expect(process("O livro custa R$ 25,00 e o caderno R$ 12,50.").problems).toEqual([
      expect.stringMatching(/^10: fórmula em linha não começa nem termina com espaço: .*escreva \\\$/),
    ])
    expect(process("Bloco aberto:\n\n$$\nx = 1").problems).toEqual(["12: fórmula $$ sem o $$ de fechamento"])
    expect(process("Vazia: $$ $$").problems).toEqual([expect.stringContaining("10: fórmula vazia")])
  })

  it("findFormulas separa linha e bloco e checkFormulas aceita acentos em \\text", () => {
    const problems: string[] = []
    const formulas = findFormulas("$x$ e $$y$$ e $\\text{média}$", 3, (line, message) => problems.push(`${line}: ${message}`))
    expect(formulas).toEqual([{ tex: "x", display: false, line: 3 }, { tex: "y", display: true, line: 3 }, { tex: "\\text{média}", display: false, line: 3 }])
    checkFormulas(formulas, (line, message) => problems.push(`${line}: ${message}`))
    expect(problems).toEqual([])
  })
})

describe("diagramas ```mermaid", () => {
  const mermaid = (body: string): string[] => process(`Antes.\n\n\`\`\`mermaid\n${body}\n\`\`\``).problems

  it("aceita fluxograma, sequência e diagrama com comentário e cabeçalho", () => {
    expect(mermaid('flowchart LR\n  A[Início] --> B{ok?}\n  B -->|sim| C["fim (ok)"]\n  subgraph grupo\n    C --> D\n  end')).toEqual([])
    expect(mermaid("sequenceDiagram\n  Aluno->>API: enviar :)\n  API-->>Aluno: veredito")).toEqual([])
    expect(mermaid("---\ntitle: Estados\n---\n%% comentário\nstateDiagram-v2\n  [*] --> Lendo")).toEqual([])
  })

  it("recusa bloco vazio, tipo desconhecido, diagrama sem corpo e colchete aberto", () => {
    expect(mermaid("")).toEqual(["12: bloco ```mermaid vazio"])
    expect(mermaid("A --> B")).toEqual([expect.stringMatching(/^13: diagrama Mermaid: a primeira linha precisa ser o tipo do diagrama \(veio "A"/)])
    expect(mermaid("flowchart TD")).toEqual(["13: diagrama Mermaid flowchart sem conteúdo depois do tipo"])
    expect(mermaid("flowchart TD\n  A[Início --> B")).toEqual([expect.stringMatching(/^14: diagrama Mermaid: falta fechar "\]" nesta linha/)])
    expect(mermaid("flowchart XX\n  A --> B")).toEqual([expect.stringContaining('13: diagrama Mermaid: direção inválida "XX"')])
    expect(mermaid("graph TD\n  subgraph g\n  A --> B")).toEqual(["13: diagrama Mermaid: 1 subgraph para 0 end"])
  })
})

describe("imagens de assets/", () => {
  it("troca a referência pela URL pública e publica o arquivo", () => {
    const result = process("Veja:\n\n![Um círculo](assets/circulo.svg) e ![Foto](assets/foto.png)", { "circulo.svg": SAFE_SVG, "foto.png": PNG_BYTES })
    expect(result.problems).toEqual([])
    expect(result.markdown).toBe("Veja:\n\n![Um círculo](/api/content/assets/c/m/circulo.svg?v=abc) e ![Foto](/api/content/assets/c/m/foto.png?v=abc)")
    expect(result.published).toEqual(["circulo.svg (image/svg+xml)", "foto.png (image/png)"])
  })

  it("exige texto alternativo, arquivo existente, pasta assets/ e tipo aceito", () => {
    expect(process("![](assets/circulo.svg)", { "circulo.svg": SAFE_SVG }).problems).toEqual([expect.stringContaining("10: imagem sem texto alternativo")])
    expect(process("![  ](assets/circulo.svg)", { "circulo.svg": SAFE_SVG }).published).toEqual([])
    expect(process("![Faltando](assets/nao-existe.png)").problems).toEqual(['10: imagem "assets/nao-existe.png": arquivo não encontrado na pasta assets/ do módulo'])
    for (const target of ["https://exemplo.com/x.png", "../segredo.png", "assets/../../etc/passwd.png", "assets/sub/x.png", "assets/x.bmp", "assets/x.html"]) {
      expect(process(`![Alt](${target})`).problems, target).toEqual([expect.stringContaining("só arquivos da pasta assets/ do módulo")])
    }
  })

  it("recusa SVG ativo, arquivo com extensão trocada e arquivo grande demais", () => {
    const svg = (inner: string): string => `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
    const active = [svg("<script>alert(1)</script>"), svg('<circle onload="alert(1)"/>'), svg('<a href="javascript:alert(1)">x</a>'), svg('<a href="java&#115;cript:alert(1)">x</a>'), svg("<foreignObject><body/></foreignObject>")]
    for (const content of active) {
      const result = process("![Desenho](assets/d.svg)", { "d.svg": content })
      expect(result.problems, content).toEqual([expect.stringContaining('10: imagem "assets/d.svg": SVG recusado: ')])
      expect(result.published).toEqual([])
    }
    expect(process("![Foto](assets/f.png)", { "f.png": SAFE_SVG }).problems).toEqual([expect.stringContaining("o conteúdo não é image/png")])
    expect(process("![Foto](assets/f.png)", { "f.png": new Uint8Array(600 * 1024) }).problems).toEqual([expect.stringContaining("(máximo 524288)")])
  })

  it("imagem citada dentro de código não é processada", () => {
    const text = "Escreva `![alt](assets/x.png)` para citar uma imagem."
    expect(process(text)).toEqual({ markdown: text, problems: [], published: [] })
  })
})

describe("bloco ```python visualizar", () => {
  it("mantém o bloco como foi escrito e aceita Python plausível", () => {
    const text = "Veja:\n\n```python visualizar\ntotal = 0\nfor n in [1, 2]:\n    total += n\nprint(total)\n```"
    expect(process(text)).toEqual({ markdown: text, problems: [], published: [] })
  })

  it("recusa bloco vazio, parêntese aberto, bloco sem indentação, input() e outra linguagem", () => {
    const block = (body: string, info = "python visualizar"): string[] => process(`\`\`\`${info}\n${body}\n\`\`\``).problems
    expect(block("# só comentário")).toEqual(["11: bloco visualizar: bloco sem código Python (vazio ou só comentários)"])
    expect(block("x = (1 +\nprint(x)")).toEqual(['11: bloco visualizar: "(" sem fechamento'])
    expect(block("for n in [1]:\nprint(n)")).toEqual(['11: bloco visualizar: linha termina com ":" mas o bloco seguinte não está indentado'])
    expect(block("x = 1\n    y = 2")).toEqual([expect.stringContaining("12: bloco visualizar: indentação inesperada")])
    expect(block('nome = input("Nome: ")')).toEqual(["11: bloco visualizar: não pode chamar input() (roda sem entrada do aluno)"])
    expect(block("print('aberta)")).toEqual(["11: bloco visualizar: string sem fechamento (')"])
    expect(block("let x = 1", "javascript visualizar")).toEqual(["10: visualizar só vale em bloco ```python visualizar (sem outros atributos)"])
  })

  it("describePythonProblem entende strings, comentários, continuação e strings triplas", () => {
    expect(describePythonProblem('texto = "a ( b # c"  # comentário com )\nd = {\n    "k": [1,\n          2],\n}\nif d:\n    print("""vá\n  rias: linhas""")\n')).toBeNull()
    expect(describePythonProblem("def f(\n    a,\n):\n    return a\n")).toBeNull()
    expect(describePythonProblem("x = [1, 2)\n")).toEqual({ line: 1, message: '")" sem abertura correspondente' })
    expect(describePythonProblem("\tx = 1\n")).toEqual({ line: 1, message: "tabulação na indentação: use 4 espaços" })
    expect(callsInput('print("input(")  # input()\n')).toBe(false)
    expect(callsInput("x = int(input())\n")).toBe(true)
  })
})

describe("vídeo ::video[título](url)", () => {
  const SUMMARY = "> Resumo: o vídeo mostra, passo a passo, como somar as notas em um acumulador e dividir pela quantidade."

  it("aceita YouTube e Vimeo e grava a URL canônica de incorporação", () => {
    expect(canonicalVideoUrl("https://www.youtube.com/watch?v=abcdefghijk&t=30s")).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk")
    expect(canonicalVideoUrl("https://youtu.be/abcdefghijk")).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk")
    expect(canonicalVideoUrl("https://www.youtube-nocookie.com/embed/abcdefghijk")).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk")
    expect(canonicalVideoUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789")
    expect(canonicalVideoUrl("https://player.vimeo.com/video/123456789")).toBe("https://player.vimeo.com/video/123456789")
    const result = process(`::video[Média em dois minutos](https://youtu.be/abcdefghijk)\n${SUMMARY}`)
    expect(result.problems).toEqual([])
    expect(result.markdown).toBe(`::video[Média em dois minutos](https://www.youtube-nocookie.com/embed/abcdefghijk)\n${SUMMARY}`)
  })

  it("recusa outros domínios, http, endereços disfarçados e id malformado", () => {
    for (const url of [
      "https://exemplo.com/video.mp4", "http://www.youtube.com/watch?v=abcdefghijk", "https://www.youtube.com.evil.com/watch?v=abcdefghijk",
      "https://evil.com/?x=youtube.com/watch?v=abcdefghijk", "https://user@youtu.be/abcdefghijk", "https://youtu.be/curto", "javascript:alert(1)",
      "https://vimeo.com/abc", "//youtu.be/abcdefghijk", "https://www.youtube.com/embed/abcdefghijk/extra",
    ]) {
      expect(canonicalVideoUrl(url), url).toBeNull()
    }
    expect(process(`::video[Aula](https://exemplo.com/video.mp4)\n${SUMMARY}`).problems).toEqual([expect.stringContaining('10: vídeo de endereço não aceito: "https://exemplo.com/video.mp4" (só YouTube e Vimeo')])
  })

  it("exige título e resumo em texto logo abaixo", () => {
    const url = "https://youtu.be/abcdefghijk"
    expect(process(`::video[](${url})\n${SUMMARY}`).problems).toEqual([expect.stringContaining("10: vídeo sem título")])
    expect(process(`::video[Aula](${url})\n\nTexto comum, sem resumo.`).problems).toEqual([expect.stringContaining("10: vídeo sem resumo em texto")])
    expect(process(`::video[Aula](${url})\n> Resumo: curto.`).problems).toEqual([expect.stringMatching(/^10: resumo do vídeo curto demais \(6 caracteres; mínimo 60\)/)])
    expect(process(`::video[Aula](${url})\n\n> **Resumo:** o vídeo mostra, passo a passo, como somar as notas\n> em um acumulador e dividir pela quantidade.`).problems).toEqual([])
    expect(process(`::video Aula ${url}`).problems).toEqual(["10: vídeo mal formado: use ::video[título](https://…) sozinho na linha"])
  })
})

describe("recursos de apresentação no compilador (arquivo:linha e assets do módulo)", () => {
  let tree: TempTree | null = null
  afterEach(() => {
    tree?.cleanup()
    tree = null
  })
  const LESSON = "cursos/curso-teste/m1/03-rica.lvl.md"
  const lesson = (narrative: string): string => `${frontmatter({ slug: "licao-rica" })}\n## Passo 1 · Leitura · Com recursos\n\n${LONG_NARRATIVE}\n\n${narrative}\n`

  it("inclui no pacote só a imagem citada, sob <curso>/<módulo>/<arquivo>", () => {
    tree = writeTree({ ...validTree(), [LESSON]: lesson("![Círculo](assets/circulo.svg)"), "cursos/curso-teste/m1/assets/circulo.svg": SAFE_SVG, "cursos/curso-teste/m1/assets/sobrando.svg": SAFE_SVG })
    const compiled = compileContent({ contentDir: tree.dir })
    expect([...compiled.problems, ...lintContent(compiled)]).toEqual([])
    expect(compiled.bundle.assets).toEqual({ "curso-teste/modulo-teste/circulo.svg": { content_type: "image/svg+xml", base64: Buffer.from(SAFE_SVG).toString("base64") } })
    expect(compiled.bundle.courses[0]?.modules[0]?.lessons[2]?.steps[0]?.narrative_markdown).toMatch(/!\[Círculo\]\(\/api\/content\/assets\/curso-teste\/modulo-teste\/circulo\.svg\?v=[0-9a-f]{12}\)$/)
  })

  it("aponta arquivo:linha de fórmula inválida, imagem ausente e fórmula em dica e em quiz", () => {
    const text = lesson("Fórmula $\\frac{1}{$ ruim.\n\n![Faltando](assets/nada.png)")
    tree = writeTree({ ...validTree(), [LESSON]: text })
    const problems = compileContent({ contentDir: tree.dir }).problems.map(formatProblem)
    const lineOf = (needle: string): number => text.split("\n").findIndex((line) => line.includes(needle)) + 1
    expect(problems).toEqual([
      expect.stringContaining(`${LESSON}:${lineOf("Fórmula $")}: fórmula inválida (KaTeX): `),
      `${LESSON}:${lineOf("![Faltando]")}: imagem "assets/nada.png": arquivo não encontrado na pasta assets/ do módulo`,
    ])
    const quiz = `${frontmatter({ slug: "licao-rica" })}\n## Passo 1 · Quiz · Fórmulas\n\n### Pergunta\nQuanto é $\\sqrt{4$?\n- [x] $2$\n- [ ] R$ 2\n> Porque $2^2 = 4$.\n`
    tree.cleanup()
    tree = writeTree({ ...validTree(), [LESSON]: quiz })
    expect(compileContent({ contentDir: tree.dir }).problems.map(formatProblem)).toEqual([
      expect.stringContaining(`${LESSON}:${quiz.split("\n").indexOf("Quanto é $\\sqrt{4$?") + 1}: fórmula inválida (KaTeX): `),
      expect.stringContaining(`${LESSON}:${quiz.split("\n").indexOf("- [ ] R$ 2") + 1}: cifrão ($) sem par`),
    ])
  })
})
