import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { ProjectTrace, TraceStep } from "@/lib/python/project-execution"
import { ExecutionVisualizer } from "./execution-visualizer"

const CODE = "total = 0\nfor nota in [6, 8]:\n    total += nota\nprint(total)\n"

function traceStep(line: number, globals: Record<string, string>, extra: Partial<TraceStep> = {}): TraceStep {
  return { line, event: "line", function_name: null, locals: null, stdout_length: 0, globals: Object.entries(globals).map(([name, value]) => ({ name, value })), ...extra }
}

const TRACE: ProjectTrace = {
  steps: [
    traceStep(1, {}),
    traceStep(2, { total: "0" }),
    traceStep(3, { total: "0", nota: "6" }),
    traceStep(2, { total: "6", nota: "6" }),
    traceStep(4, { total: "14", nota: "8" }),
    traceStep(4, { total: "14", nota: "8" }, { event: "end", stdout_length: 3 }),
  ],
  stdout: "14\n", error: null, truncated: false,
}

const currentLine = (): string | null => screen.getByRole("list", { name: "Código em execução" }).querySelector('[aria-current="true"]')?.textContent ?? null

describe("visualizador de execução", () => {
  it("mostra a linha atual, as variáveis e a saída do passo", async () => {
    render(<ExecutionVisualizer code={CODE} trace={TRACE} />)
    expect(currentLine()).toBe("1total = 0")
    expect(screen.getByText("Nenhuma variável ainda.")).toBeInTheDocument()
    expect(screen.getByText("(nada impresso ainda)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: /Próximo/ }))
    expect(currentLine()).toBe("2for nota in [6, 8]:")
    const globals = screen.getByRole("table", { name: "Variáveis globais" })
    expect(within(globals).getByRole("row", { name: /total 0/ })).toHaveAttribute("data-changed", "true")
  })

  it("destaca só as variáveis que mudaram naquele passo", async () => {
    render(<ExecutionVisualizer code={CODE} trace={TRACE} />)
    const next = screen.getByRole("button", { name: /Próximo/ })
    await userEvent.click(next)
    await userEvent.click(next)
    await userEvent.click(next)
    const globals = screen.getByRole("table", { name: "Variáveis globais" })
    expect(within(globals).getByRole("row", { name: /total 6/ })).toHaveAttribute("data-changed", "true")
    expect(within(globals).getByRole("row", { name: /nota 6/ })).not.toHaveAttribute("data-changed")
    expect(within(globals).getByText("(mudou neste passo)")).toBeInTheDocument()
  })

  it("anuncia o passo numa região viva e chega ao fim com a saída completa", async () => {
    render(<ExecutionVisualizer code={CODE} trace={TRACE} />)
    const status = screen.getByText("Passo 1 de 6: prestes a executar a linha 1")
    expect(status).toHaveAttribute("aria-live", "polite")
    await userEvent.click(screen.getByRole("button", { name: "Último passo" }))
    expect(status).toHaveTextContent("Passo 6 de 6: fim do programa")
    expect(screen.getByLabelText("Saída até este passo")).toHaveTextContent("14")
    expect(currentLine()).toBeNull()
    expect(screen.getByRole("button", { name: /Próximo/ })).toBeDisabled()
  })

  it("anda pelos passos com as setas, Home e End e com o controle deslizante", async () => {
    render(<ExecutionVisualizer code={CODE} trace={TRACE} />)
    const group = screen.getByRole("group", { name: /Visualizador de execução/ })
    group.focus()
    await userEvent.keyboard("{ArrowRight}{ArrowRight}")
    expect(currentLine()).toBe("3    total += nota")
    await userEvent.keyboard("{ArrowLeft}")
    expect(currentLine()).toBe("2for nota in [6, 8]:")
    await userEvent.keyboard("{End}")
    expect(screen.getByText("Passo 6 de 6: fim do programa")).toBeInTheDocument()
    await userEvent.keyboard("{Home}")
    expect(currentLine()).toBe("1total = 0")

    const slider = screen.getByRole("slider", { name: "Passo da execução" })
    expect(slider).toHaveAttribute("max", "6")
    fireEvent.change(slider, { target: { value: "5" } })
    expect(currentLine()).toBe("4print(total)")
  })

  it("mostra as variáveis locais da função em execução", () => {
    const trace: ProjectTrace = {
      steps: [traceStep(2, { dobro: "função dobro" }, { function_name: "dobro", locals: [{ name: "x", value: "3" }] })],
      stdout: "", error: null, truncated: false,
    }
    render(<ExecutionVisualizer code={"def dobro(x):\n    return x * 2\n"} trace={trace} />)
    expect(within(screen.getByRole("table", { name: "Variáveis locais de dobro" })).getByRole("row", { name: /x 3/ })).toBeInTheDocument()
  })

  it("avisa quando a execução foi cortada no limite de passos", () => {
    render(<ExecutionVisualizer code={CODE} trace={{ ...TRACE, truncated: true }} />)
    expect(screen.getByText(/passou de 500 passos e foi interrompida/)).toBeInTheDocument()
  })

  it("mostra o erro do programa no último passo e fecha pelo botão", async () => {
    const onClose = vi.fn()
    const trace: ProjectTrace = { steps: [traceStep(1, {}), traceStep(2, { x: "1" })], stdout: "", error: { type: "NameError", summary: "NameError: name 'y' is not defined", traceback: "" }, truncated: false }
    render(<ExecutionVisualizer code={"x = 1\nprint(y)\n"} trace={trace} onClose={onClose} />)
    expect(screen.queryByRole("alert")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: /Próximo/ }))
    expect(screen.getByRole("alert")).toHaveTextContent("NameError: name 'y' is not defined")
    await userEvent.click(screen.getByRole("button", { name: "Fechar o visualizador" }))
    expect(onClose).toHaveBeenCalled()
  })

  it("código que nem começa a rodar (erro de sintaxe) mostra o erro em vez de quebrar", () => {
    const trace: ProjectTrace = { steps: [], stdout: "", error: { type: "SyntaxError", summary: "SyntaxError: invalid syntax", traceback: "" }, truncated: false }
    render(<ExecutionVisualizer code={"x ="} trace={trace} />)
    expect(screen.getByRole("status")).toHaveTextContent("SyntaxError: invalid syntax")
  })
})
