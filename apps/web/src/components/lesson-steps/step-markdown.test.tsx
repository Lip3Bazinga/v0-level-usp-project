import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProjectTrace } from "@/lib/python/project-execution"
import { requestTrace } from "@/lib/python/trace-client"
import { StepMarkdown } from "./step-markdown"

// O Pyodide não roda no jsdom: o visualizador recebe um registro pronto.
vi.mock("@/lib/python/trace-client", () => ({ requestTrace: vi.fn() }))

const mermaidParse = vi.fn()
const mermaidRender = vi.fn()
const mermaidInitialize = vi.fn()
// O Mermaid real precisa de um navegador de verdade para medir o SVG.
vi.mock("mermaid", () => ({
  default: {
    initialize: (config: unknown): void => void mermaidInitialize(config),
    parse: (code: string, options: unknown): unknown => mermaidParse(code, options),
    render: (id: string, code: string): unknown => mermaidRender(id, code),
  },
}))

const TRACE: ProjectTrace = {
  steps: [
    { line: 1, event: "line", function_name: null, globals: [], locals: null, stdout_length: 0 },
    { line: 2, event: "line", function_name: null, globals: [{ name: "total", value: "0" }], locals: null, stdout_length: 0 },
    { line: 2, event: "end", function_name: null, globals: [{ name: "total", value: "0" }], locals: null, stdout_length: 2 },
  ],
  stdout: "0\n", error: null, truncated: false,
}

describe("markdown rico das lições", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mermaidParse.mockResolvedValue({ diagramType: "flowchart" })
    mermaidRender.mockResolvedValue({ svg: '<svg data-testid="diagrama"><text>total = 0</text></svg>' })
  })

  it("renderiza fórmula em linha e em bloco com o KaTeX", () => {
    const { container } = render(<StepMarkdown content={"A média de $n$ notas:\n\n$$\n\\bar{x} = \\frac{1}{n}\n$$"} />)
    expect(container.querySelectorAll(".katex")).toHaveLength(2)
    expect(container.querySelector(".katex-display")).not.toBeNull()
    expect(container.querySelector(".katex-error")).toBeNull()
    expect(container.querySelector("annotation")?.textContent).toBe("n")
  })

  it("cifrão com barra é dinheiro, não fórmula", () => {
    const { container } = render(<StepMarkdown content={"A apostila custa R\\$ 25,00 e o caderno, R\\$ 12,50."} />)
    expect(container.querySelector(".katex")).toBeNull()
    expect(container.textContent).toBe("A apostila custa R$ 25,00 e o caderno, R$ 12,50.")
  })

  it("fórmula inválida não quebra a página: o texto dela aparece e o resto continua", () => {
    const { container } = render(<StepMarkdown content={"Antes $\\frac{1}{$ depois.\n\nOutro parágrafo com $x^2$."} />)
    expect(container.textContent).toContain("\\frac{1}{")
    expect(container.textContent).toContain("Antes")
    expect(container.textContent).toContain("depois.")
    expect(screen.getByText(/Outro parágrafo com/)).toBeInTheDocument()
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(1)
  })

  it("imagem sai com texto alternativo, carregamento tardio e sem virar link externo", () => {
    render(<StepMarkdown content="![Notas 6, 8 e 10 em uma reta](/api/content/assets/curso/m1/media.svg?v=abc)" />)
    const image = screen.getByRole("img", { name: "Notas 6, 8 e 10 em uma reta" })
    expect(image).toHaveAttribute("src", "/api/content/assets/curso/m1/media.svg?v=abc")
    expect(image).toHaveAttribute("loading", "lazy")
  })

  it("vídeo permitido só vira iframe depois do clique, com sandbox, e o resumo fica visível", async () => {
    const { container } = render(<StepMarkdown content={"::video[Média em dois minutos](https://www.youtube-nocookie.com/embed/AAAAAAAAAAA)\n> Resumo: o vídeo soma três notas."} />)
    expect(container.querySelector("iframe")).toBeNull()
    expect(screen.getByText("Resumo: o vídeo soma três notas.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /Assistir ao vídeo: Média em dois minutos/ }))
    const frame = screen.getByTitle("Média em dois minutos")
    expect(frame.tagName).toBe("IFRAME")
    expect(frame).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/AAAAAAAAAAA")
    expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation")
    expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin")
    expect(frame).toHaveAttribute("loading", "lazy")
    expect(screen.getByText("Resumo: o vídeo soma três notas.")).toBeInTheDocument()
  })

  it("aceita o reprodutor do Vimeo", async () => {
    render(<StepMarkdown content="::video[Laços](https://player.vimeo.com/video/123456)" />)
    await userEvent.click(screen.getByRole("button", { name: /Assistir ao vídeo: Laços/ }))
    expect(screen.getByTitle("Laços")).toHaveAttribute("src", "https://player.vimeo.com/video/123456")
  })

  it.each([
    "https://www.youtube.com/watch?v=AAAAAAAAAAA",
    "https://evil.example/embed/AAAAAAAAAAA",
    "https://www.youtube-nocookie.com.evil.example/embed/AAAAAAAAAAA",
  ])("vídeo de outro endereço (%s) vira texto: sem iframe, sem botão e sem link", (url) => {
    const { container } = render(<StepMarkdown content={`::video[Título](${url})\n> Resumo: texto.`} />)
    expect(container.querySelector("iframe")).toBeNull()
    expect(container.querySelector("a")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText(`::video[Título](${url})`)).toBeInTheDocument()
    expect(screen.getByText("Resumo: texto.")).toBeInTheDocument()
  })

  it("bloco python visualizar ganha o botão Visualizar e mostra a execução passo a passo", async () => {
    vi.mocked(requestTrace).mockResolvedValue(TRACE)
    render(<StepMarkdown content={"```python visualizar\ntotal = 0\nprint(total)\n```"} />)
    await userEvent.click(screen.getByRole("button", { name: "Visualizar" }))
    expect(requestTrace).toHaveBeenCalledWith({ files: [{ path: "main.py", content: "total = 0\nprint(total)" }], entryPath: "main.py", stdin: "" })
    expect(await screen.findByRole("group", { name: /Visualizador de execução/ })).toBeInTheDocument()
    expect(screen.getByText("Passo 1 de 3: prestes a executar a linha 1")).toBeInTheDocument()
  })

  it("bloco python comum não ganha o botão", () => {
    render(<StepMarkdown content={"```python\ntotal = 0\n```"} />)
    expect(screen.queryByRole("button", { name: "Visualizar" })).toBeNull()
    expect(screen.getByText("total = 0")).toBeInTheDocument()
  })

  it("erro ao visualizar aparece como aviso e o código continua na tela", async () => {
    vi.mocked(requestTrace).mockRejectedValue(new Error("O Python não pôde ser carregado. Recarregue a página e tente de novo."))
    render(<StepMarkdown content={"```python visualizar\ntotal = 0\n```"} />)
    await userEvent.click(screen.getByRole("button", { name: "Visualizar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("O Python não pôde ser carregado")
    expect(screen.getByText("total = 0")).toBeInTheDocument()
  })

  it("bloco mermaid vira diagrama, com a biblioteca em modo strict", async () => {
    render(<StepMarkdown content={"```mermaid\nflowchart TD\n    A[total = 0] --> B\n```"} />)
    expect(await screen.findByTestId("diagrama")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Diagrama da lição" })).toBeInTheDocument()
    expect(mermaidInitialize).toHaveBeenCalledWith(expect.objectContaining({ securityLevel: "strict", startOnLoad: false }))
    expect(mermaidRender).toHaveBeenCalledWith(expect.stringMatching(/^diagrama-[a-zA-Z0-9]+$/), "flowchart TD\n    A[total = 0] --> B")
  })

  it("diagrama que o Mermaid recusa aparece como código comum", async () => {
    mermaidParse.mockResolvedValue(false)
    const { container } = render(<StepMarkdown content={"```mermaid\nisto não é um diagrama\n```"} />)
    await waitFor(() => expect(container.querySelector('[data-diagram-state="invalid"]')).not.toBeNull())
    expect(screen.getByText("isto não é um diagrama")).toBeInTheDocument()
    expect(mermaidRender).not.toHaveBeenCalled()
    expect(container.querySelector("svg")).toBeNull()
  })

  it("falha ao desenhar o diagrama também cai no código comum", async () => {
    mermaidRender.mockRejectedValue(new Error("erro interno do mermaid"))
    const { container } = render(<StepMarkdown content={"```mermaid\nflowchart TD\n    A --> B\n```"} />)
    await waitFor(() => expect(container.querySelector('[data-diagram-state="invalid"]')).not.toBeNull())
    expect(container.querySelector("svg")).toBeNull()
  })

  it("HTML bruto do texto continua sem ser interpretado", () => {
    const { container } = render(<StepMarkdown content={'<img src=x onerror="alert(1)"> <script>alert(1)</script>\n\n<iframe src="https://evil.example"></iframe>'} />)
    expect(container.querySelector("img, script, iframe")).toBeNull()
    expect(container.querySelector("[onerror]")).toBeNull()
  })
})
