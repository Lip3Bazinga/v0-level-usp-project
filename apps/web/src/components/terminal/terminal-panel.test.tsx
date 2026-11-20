import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import type { ProjectFile } from "@levelusp/contracts"
import { TerminalInterruptedError, type TerminalClient, type TerminalRunResult } from "@/lib/python/terminal-client"
import { TerminalPanel } from "./terminal-panel"

/*
 * O xterm.js precisa de canvas e medidas de layout que o jsdom não tem: um Terminal de mentira
 * registra o que a sessão escreve e deixa o teste "digitar" chamando o `onData` capturado.
 */
const xterm = vi.hoisted(() => ({
  written: [] as string[],
  options: undefined as Record<string, unknown> | undefined,
  onData: undefined as ((data: string) => void) | undefined,
  keyHandler: undefined as ((event: KeyboardEvent) => boolean) | undefined,
  textarea: undefined as HTMLTextAreaElement | undefined,
  disposed: 0,
  focused: 0,
  fitted: 0,
  strings: { promptLabel: "", tooMuchOutput: "" },
}))

vi.mock("@xterm/xterm", () => ({
  Terminal: class FakeTerminal {
    static strings = xterm.strings
    textarea = document.createElement("textarea")
    constructor(options: Record<string, unknown>) {
      xterm.options = options
      xterm.textarea = this.textarea
    }
    loadAddon(): void {}
    open(container: HTMLElement): void {
      container.appendChild(this.textarea)
    }
    write(text: string): void {
      xterm.written.push(text)
    }
    onData(handler: (data: string) => void): { dispose: () => void } {
      xterm.onData = handler
      return { dispose: () => undefined }
    }
    attachCustomKeyEventHandler(handler: (event: KeyboardEvent) => boolean): void {
      xterm.keyHandler = handler
    }
    focus(): void {
      xterm.focused += 1
    }
    dispose(): void {
      xterm.disposed += 1
    }
  },
}))
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class FakeFitAddon {
    fit(): void {
      xterm.fitted += 1
    }
  },
}))
vi.mock("@xterm/xterm/css/xterm.css", () => ({}))

const FILES: readonly ProjectFile[] = [{ path: "main.py", content: "print(1)" }]
const OK: TerminalRunResult = { status: "ok", figures: [] }

interface FakeClient extends TerminalClient {
  runScript: Mock<TerminalClient["runScript"]>
  interrupt: Mock<TerminalClient["interrupt"]>
}

function createClient(): FakeClient {
  return {
    getStatus: () => "ready",
    runScript: vi.fn<TerminalClient["runScript"]>(() => Promise.resolve(OK)),
    runFs: vi.fn<TerminalClient["runFs"]>(() => Promise.resolve(OK)),
    startRepl: vi.fn<TerminalClient["startRepl"]>(() => Promise.resolve(OK)),
    pushRepl: vi.fn<TerminalClient["pushRepl"]>(() => Promise.resolve(OK)),
    sendInput: vi.fn<TerminalClient["sendInput"]>(),
    interrupt: vi.fn<TerminalClient["interrupt"]>(),
  }
}

const screenText = (): string => xterm.written.join("")

async function renderPanel(client: TerminalClient, props: { autoFocus?: boolean } = {}): Promise<ReturnType<typeof render>> {
  const view = render(<TerminalPanel files={FILES} client={client} {...props} />)
  await waitFor(() => expect(xterm.onData).toBeDefined())
  return view
}

function type(data: string): void {
  act(() => xterm.onData?.(data))
}

beforeEach(() => {
  xterm.written.length = 0
  xterm.options = undefined
  xterm.onData = undefined
  xterm.keyHandler = undefined
  xterm.disposed = 0
  xterm.focused = 0
  xterm.fitted = 0
})

describe("TerminalPanel", () => {
  it("carrega o xterm sob demanda, em modo leitor de tela, e mostra as boas-vindas", async () => {
    await renderPanel(createClient())
    expect(xterm.options).toMatchObject({ screenReaderMode: true })
    expect(screenText()).toContain("Terminal do LevelUSP")
    expect(screen.queryByText("Abrindo o terminal…")).not.toBeInTheDocument()
    expect(xterm.fitted).toBeGreaterThan(0)
  })

  it("rotula a entrada do terminal para leitores de tela e explica a saída pelo teclado", async () => {
    await renderPanel(createClient())
    expect(xterm.textarea?.getAttribute("aria-label")).toContain("Tab leva o foco para fora")
    expect(xterm.strings.promptLabel).toBe("Entrada do terminal")
    expect(screen.getByRole("region", { name: "Terminal" })).toBeInTheDocument()
  })

  it("não prende o teclado: Tab passa para o navegador e as outras teclas ficam com o terminal", async () => {
    await renderPanel(createClient())
    expect(xterm.keyHandler?.(new KeyboardEvent("keydown", { key: "Tab" }))).toBe(false)
    expect(xterm.keyHandler?.(new KeyboardEvent("keydown", { key: "a" }))).toBe(true)
  })

  it("foca o terminal quando autoFocus está ligado", async () => {
    await renderPanel(createClient(), { autoFocus: true })
    expect(xterm.focused).toBe(1)
  })

  it("executa o que o aluno digita", async () => {
    const client = createClient()
    await renderPanel(client)
    type("python main.py\r")
    await waitFor(() => expect(client.runScript).toHaveBeenCalledWith(FILES, "main.py", expect.any(Object)))
  })

  it("o botão Parar só habilita com algo rodando e interrompe o programa", async () => {
    const client = createClient()
    let reject: (error: Error) => void = () => undefined
    client.runScript.mockReturnValue(new Promise((_resolve, rejectRun) => (reject = rejectRun)))
    client.interrupt.mockImplementation(() => reject(new TerminalInterruptedError()))
    await renderPanel(client)
    const stop = screen.getByRole("button", { name: "Parar o programa em execução no terminal" })
    expect(stop).toBeDisabled()
    type("python main.py\r")
    await waitFor(() => expect(stop).toBeEnabled())
    await userEvent.click(stop)
    expect(client.interrupt).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(stop).toBeDisabled())
    expect(screenText()).toContain("KeyboardInterrupt")
  })

  it("mostra os gráficos do matplotlib num painel ao lado, com texto alternativo, e permite fechá-los", async () => {
    const client = createClient()
    client.runScript.mockResolvedValue({ status: "ok", figures: ["AAAA", "BBBB"] })
    await renderPanel(client)
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument()
    type("python main.py\r")
    const panel = await screen.findByRole("complementary", { name: "Gráficos do matplotlib" })
    expect(panel).toBeInTheDocument()
    expect(screen.getByAltText("Gráfico 1 gerado pelo matplotlib")).toHaveAttribute("src", "data:image/png;base64,AAAA")
    expect(screen.getByAltText("Gráfico 2 gerado pelo matplotlib")).toBeInTheDocument()
    expect(screen.getByText("2 gráficos disponíveis no painel ao lado do terminal.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Fechar gráficos/ }))
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument()
  })

  it("encerra o terminal e a sessão ao desmontar", async () => {
    const client = createClient()
    client.runScript.mockReturnValue(new Promise(() => undefined))
    const view = await renderPanel(client)
    type("python main.py\r")
    await waitFor(() => expect(client.runScript).toHaveBeenCalled())
    view.unmount()
    expect(xterm.disposed).toBe(1)
    expect(client.interrupt).toHaveBeenCalledTimes(1)
  })
})
