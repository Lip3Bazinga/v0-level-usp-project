import type { ProjectFile } from "@levelusp/contracts"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BROWSER_PYTHON_VERSION } from "@/lib/python/runtime-config"
import { TerminalInterruptedError, type TerminalClient, type TerminalRunCallbacks, type TerminalRunResult } from "@/lib/python/terminal-client"
import type { PyodideStatus } from "@/lib/python/worker-protocol"
import { TerminalSession, type TerminalPhase } from "./terminal-session"

const FILES: readonly ProjectFile[] = [{ path: "main.py", content: "print('oi')" }]
const OK: TerminalRunResult = { status: "ok", figures: [] }

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

function defer<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: Error) => void = () => undefined
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

type RunMethod = (...args: never[]) => Promise<TerminalRunResult>

interface FakeClient extends TerminalClient {
  runScript: TerminalClient["runScript"] & ReturnType<typeof vi.fn<RunMethod>>
  runFs: TerminalClient["runFs"] & ReturnType<typeof vi.fn<RunMethod>>
  startRepl: TerminalClient["startRepl"] & ReturnType<typeof vi.fn<RunMethod>>
  pushRepl: TerminalClient["pushRepl"] & ReturnType<typeof vi.fn<RunMethod>>
  sendInput: ReturnType<typeof vi.fn<(line: string | null) => void>>
  interrupt: ReturnType<typeof vi.fn<() => void>>
  setStatus: (status: PyodideStatus) => void
}

function createFakeClient(): FakeClient {
  let status: PyodideStatus = "ready"
  const client: FakeClient = {
    getStatus: (): PyodideStatus => status,
    setStatus: (next: PyodideStatus): void => {
      status = next
    },
    runScript: vi.fn((): Promise<TerminalRunResult> => Promise.resolve(OK)),
    runFs: vi.fn((): Promise<TerminalRunResult> => Promise.resolve(OK)),
    startRepl: vi.fn((): Promise<TerminalRunResult> => Promise.resolve(OK)),
    pushRepl: vi.fn((): Promise<TerminalRunResult> => Promise.resolve(OK)),
    sendInput: vi.fn(),
    interrupt: vi.fn(),
  }
  return client
}

interface Harness {
  session: TerminalSession
  client: FakeClient
  /** Tudo que foi escrito na tela, sem cores nem movimentos de cursor, com \n no lugar de \r\n. */
  screen: () => string
  /** Escrita bruta, com as sequências de escape. */
  raw: () => string
  figures: string[][]
  phases: TerminalPhase[]
  files: { current: readonly ProjectFile[] }
}

function createHarness(): Harness {
  let raw = ""
  const client = createFakeClient()
  const figures: string[][] = []
  const phases: TerminalPhase[] = []
  const files = { current: FILES }
  const session = new TerminalSession({
    screen: {
      write: (text) => {
        raw += text
      },
    },
    client,
    getFiles: () => files.current,
    onFigures: (next) => figures.push([...next]),
    onPhaseChange: (phase) => phases.push(phase),
  })
  session.start()
  return {
    session,
    client,
    screen: () => raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\r\n/g, "\n"),
    raw: () => raw,
    figures,
    phases,
    files,
  }
}

const PROMPT = "aluno@levelusp:~$ "
const waitForPhase = (harness: Harness, phase: TerminalPhase): Promise<void> => vi.waitFor(() => expect(harness.session.getPhase()).toBe(phase))

/** Roda callbacks de saída do cliente falso como o worker faria. */
function emit(callbacks: TerminalRunCallbacks, stream: "stdout" | "stderr", text: string): void {
  callbacks.onOutput(stream, text)
}

let harness: Harness

beforeEach(() => {
  harness = createHarness()
})

describe("início e comandos locais", () => {
  it("mostra as boas-vindas com a versão do Python e o prompt", () => {
    expect(harness.screen()).toBe(`Terminal do LevelUSP · Python ${BROWSER_PYTHON_VERSION} no navegador. Digite help para ver os comandos.\n${PROMPT}`)
    expect(harness.session.getPhase()).toBe("prompt")
  })

  it("help lista os comandos e volta ao prompt", async () => {
    harness.session.handleData("help\r")
    await waitForPhase(harness, "prompt")
    expect(harness.screen()).toContain("python arquivo.py")
    expect(harness.screen().endsWith(PROMPT)).toBe(true)
  })

  it("pip list mostra o manifesto sem chamar o Python", async () => {
    harness.session.handleData("pip list\r")
    await waitForPhase(harness, "prompt")
    expect(harness.screen()).toContain("Package")
    expect(harness.screen()).toContain("numpy")
    expect(harness.client.runScript).not.toHaveBeenCalled()
  })

  it("comando desconhecido explica em pt-BR", async () => {
    harness.session.handleData("foo\r")
    await waitForPhase(harness, "prompt")
    expect(harness.screen()).toContain("foo: comando não encontrado. Digite help para ver os comandos.")
  })

  it("clear limpa a tela", async () => {
    harness.session.handleData("clear\r")
    await waitForPhase(harness, "prompt")
    expect(harness.raw()).toContain("\x1b[2J")
  })

  it("Ctrl+L limpa a tela e redesenha a linha digitada", () => {
    harness.session.handleData("ls")
    harness.session.handleData("\x0c")
    expect(harness.raw().endsWith(`\x1b[2J\x1b[3J\x1b[H\r\x1b[K${"\x1b[1;32maluno@levelusp\x1b[0m:\x1b[1;34m~\x1b[0m$ "}ls`)).toBe(true)
  })

  it("Ctrl+C no prompt cancela a linha", () => {
    harness.session.handleData("abc")
    harness.session.handleData("\x03")
    expect(harness.screen().endsWith(`${PROMPT}abc^C\n${PROMPT}`)).toBe(true)
    expect(harness.client.interrupt).not.toHaveBeenCalled()
  })
})

describe("ls e cat", () => {
  it("passam argumentos e os arquivos atuais do editor", async () => {
    harness.files.current = [{ path: "main.py", content: "novo" }]
    harness.session.handleData("ls -l dados\r")
    await waitForPhase(harness, "prompt")
    expect(harness.client.runFs).toHaveBeenCalledWith("ls", ["-l", "dados"], harness.files.current, expect.any(Object))
    harness.session.handleData("cat main.py\r")
    await vi.waitFor(() => expect(harness.client.runFs).toHaveBeenCalledWith("cat", ["main.py"], harness.files.current, expect.any(Object)))
  })

  it("mostra a saída que o Python devolve, vermelha quando é erro", async () => {
    harness.client.runFs.mockImplementation(((_op: string, _args: readonly string[], _files: readonly ProjectFile[], callbacks: TerminalRunCallbacks) => {
      emit(callbacks, "stdout", "main.py\n")
      emit(callbacks, "stderr", "cat: x: arquivo ou diretório inexistente\n")
      return Promise.resolve({ status: "error", figures: [] })
    }) as RunMethod)
    harness.session.handleData("ls\r")
    await waitForPhase(harness, "prompt")
    expect(harness.screen()).toContain("main.py\ncat: x: arquivo ou diretório inexistente\n")
    expect(harness.raw()).toContain("\x1b[31mcat: x")
  })
})

describe("python arquivo.py", () => {
  it("roda o arquivo com os arquivos do editor e mostra a saída", async () => {
    harness.client.runScript.mockImplementation(((_files: readonly ProjectFile[], _entry: string, callbacks: TerminalRunCallbacks) => {
      emit(callbacks, "stdout", "oi\n")
      return Promise.resolve(OK)
    }) as RunMethod)
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "prompt")
    expect(harness.client.runScript).toHaveBeenCalledWith(FILES, "main.py", expect.any(Object))
    expect(harness.screen().endsWith(`python main.py\noi\n${PROMPT}`)).toBe(true)
  })

  it("garante que o prompt volta numa linha nova quando a saída não termina em \\n", async () => {
    harness.client.runScript.mockImplementation(((_files: readonly ProjectFile[], _entry: string, callbacks: TerminalRunCallbacks) => {
      emit(callbacks, "stdout", "sem quebra")
      return Promise.resolve(OK)
    }) as RunMethod)
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "prompt")
    expect(harness.screen().endsWith(`sem quebra\n${PROMPT}`)).toBe(true)
  })

  it("avisa onde estão os gráficos e os entrega ao painel", async () => {
    harness.client.runScript.mockResolvedValue({ status: "ok", figures: ["AAA", "BBB"] })
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "prompt")
    expect(harness.figures).toEqual([["AAA", "BBB"]])
    expect(harness.screen()).toContain("[2 gráficos exibidos no painel ao lado]")
  })

  it("avisa que o Python está carregando e segue", async () => {
    harness.client.setStatus("loading")
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "prompt")
    expect(harness.screen()).toContain("Carregando o Python…")
    expect(harness.client.runScript).toHaveBeenCalled()
  })

  it("não tenta rodar quando o Python falhou ao carregar", async () => {
    harness.client.setStatus("error")
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "prompt")
    expect(harness.screen()).toContain("O Python não pôde ser carregado")
    expect(harness.client.runScript).not.toHaveBeenCalled()
  })

  it("mostra a mensagem de erro do cliente e volta ao prompt", async () => {
    harness.client.runScript.mockRejectedValue(new Error("O Python parou de responder."))
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "prompt")
    expect(harness.screen()).toContain("O Python parou de responder.")
  })
})

describe("input()", () => {
  function scriptWaitingForInput(): Deferred<TerminalRunResult> {
    const finish = defer<TerminalRunResult>()
    harness.client.runScript.mockImplementation(((_files: readonly ProjectFile[], _entry: string, callbacks: TerminalRunCallbacks) => {
      emit(callbacks, "stdout", "Nome: ")
      callbacks.onInputRequest()
      return finish.promise
    }) as RunMethod)
    return finish
  }

  it("espera a linha, ecoa o que o aluno digita e a envia ao Python", async () => {
    const finish = scriptWaitingForInput()
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "input")
    harness.session.handleData("Ana")
    expect(harness.screen().endsWith("Nome: Ana")).toBe(true)
    harness.session.handleData("\r")
    expect(harness.client.sendInput).toHaveBeenCalledWith("Ana")
    expect(harness.session.getPhase()).toBe("busy")
    finish.resolve(OK)
    await waitForPhase(harness, "prompt")
  })

  it("Ctrl+D envia fim de entrada", async () => {
    const finish = scriptWaitingForInput()
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "input")
    harness.session.handleData("\x04")
    expect(harness.client.sendInput).toHaveBeenCalledWith(null)
    expect(harness.screen()).toContain("^D")
    finish.resolve(OK)
    await waitForPhase(harness, "prompt")
  })

  it("redesenha a linha do input mantendo o texto do prompt do programa", async () => {
    const finish = scriptWaitingForInput()
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "input")
    harness.session.handleData("Ana\x1b[Dx")
    expect(harness.raw().endsWith("\r\x1b[KNome: Anxa\x1b[1D")).toBe(true)
    finish.resolve(OK)
    await waitForPhase(harness, "prompt")
  })

  it("guarda o que foi digitado enquanto o programa roda e entrega no próximo prompt", async () => {
    const finish = defer<TerminalRunResult>()
    harness.client.runScript.mockReturnValue(finish.promise)
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "busy")
    harness.session.handleData("ls\r")
    expect(harness.client.runFs).not.toHaveBeenCalled()
    finish.resolve(OK)
    await vi.waitFor(() => expect(harness.client.runFs).toHaveBeenCalledTimes(1))
  })

  it("trata texto colado com várias linhas, uma por vez", async () => {
    harness.session.handleData("ls\rpip list\rhelp\r")
    await vi.waitFor(() => expect(harness.screen()).toContain("Digite help para ver os comandos.\n"))
    await waitForPhase(harness, "prompt")
    expect(harness.client.runFs).toHaveBeenCalledTimes(1)
    expect(harness.screen()).toContain("Package")
    expect(harness.screen()).toContain("Comandos disponíveis:")
  })
})

describe("Ctrl+C e Parar", () => {
  it("interrompe o programa em execução e mostra KeyboardInterrupt", async () => {
    const finish = defer<TerminalRunResult>()
    harness.client.runScript.mockReturnValue(finish.promise)
    harness.client.interrupt.mockImplementation(() => finish.reject(new TerminalInterruptedError()))
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "busy")
    harness.session.handleData("\x03")
    await waitForPhase(harness, "prompt")
    expect(harness.client.interrupt).toHaveBeenCalledTimes(1)
    expect(harness.screen()).toContain("^C\nKeyboardInterrupt\n")
  })

  it("o botão Parar (interrupt) faz o mesmo e descarta o que estava digitado", async () => {
    const finish = defer<TerminalRunResult>()
    harness.client.runScript.mockReturnValue(finish.promise)
    harness.client.interrupt.mockImplementation(() => finish.reject(new TerminalInterruptedError()))
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "busy")
    harness.session.handleData("ls\r")
    harness.session.interrupt()
    await waitForPhase(harness, "prompt")
    expect(harness.client.runFs).not.toHaveBeenCalled()
  })

  it("interrompe um programa que espera input()", async () => {
    const finish = defer<TerminalRunResult>()
    harness.client.runScript.mockImplementation(((_files: readonly ProjectFile[], _entry: string, callbacks: TerminalRunCallbacks) => {
      callbacks.onInputRequest()
      return finish.promise
    }) as RunMethod)
    harness.client.interrupt.mockImplementation(() => finish.reject(new TerminalInterruptedError()))
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "input")
    harness.session.handleData("\x03")
    await waitForPhase(harness, "prompt")
    expect(harness.client.interrupt).toHaveBeenCalled()
  })

  it("fechar a sessão com algo rodando interrompe o Python", async () => {
    harness.client.runScript.mockReturnValue(defer<TerminalRunResult>().promise)
    harness.session.handleData("python main.py\r")
    await waitForPhase(harness, "busy")
    harness.session.dispose()
    expect(harness.client.interrupt).toHaveBeenCalledTimes(1)
  })

  it("fechar a sessão parada não mexe no Python", () => {
    harness.session.dispose()
    expect(harness.client.interrupt).not.toHaveBeenCalled()
  })
})

describe("REPL", () => {
  async function openRepl(): Promise<void> {
    harness.session.handleData("python\r")
    await vi.waitFor(() => expect(harness.screen()).toContain(">>> "))
  }

  it("abre com o banner e o prompt >>>", async () => {
    await openRepl()
    expect(harness.client.startRepl).toHaveBeenCalledWith(FILES, expect.any(Object))
    expect(harness.screen()).toContain(`Python ${BROWSER_PYTHON_VERSION} (no navegador, via Pyodide)`)
    expect(harness.screen().endsWith(">>> ")).toBe(true)
  })

  it("envia cada linha ao REPL e usa ... quando o bloco continua", async () => {
    await openRepl()
    harness.client.pushRepl.mockResolvedValueOnce({ status: "more", figures: [] })
    harness.session.handleData("for i in range(2):\r")
    await vi.waitFor(() => expect(harness.screen().endsWith("... ")).toBe(true))
    harness.session.handleData("    print(i)\r")
    await vi.waitFor(() => expect(harness.client.pushRepl).toHaveBeenCalledTimes(2))
    expect(harness.client.pushRepl).toHaveBeenNthCalledWith(1, "for i in range(2):", expect.any(Object))
    await vi.waitFor(() => expect(harness.screen().endsWith(">>> ")).toBe(true))
  })

  it("exit() e Ctrl+D voltam ao terminal sem chamar o Python", async () => {
    await openRepl()
    harness.session.handleData("exit()\r")
    await vi.waitFor(() => expect(harness.screen().endsWith(PROMPT)).toBe(true))
    expect(harness.client.pushRepl).not.toHaveBeenCalled()
    await openRepl()
    harness.session.handleData("\x04")
    await vi.waitFor(() => expect(harness.screen().endsWith(PROMPT)).toBe(true))
  })

  it("Ctrl+C no prompt do REPL descarta o bloco incompleto", async () => {
    await openRepl()
    harness.client.pushRepl.mockResolvedValueOnce({ status: "more", figures: [] })
    harness.session.handleData("if True:\r")
    await vi.waitFor(() => expect(harness.screen().endsWith("... ")).toBe(true))
    harness.session.handleData("\x03")
    await vi.waitFor(() => expect(harness.client.pushRepl).toHaveBeenCalledWith(null, expect.any(Object)))
    expect(harness.screen()).toContain("KeyboardInterrupt")
    await vi.waitFor(() => expect(harness.screen().endsWith(">>> ")).toBe(true))
  })

  it("interromper um comando do REPL reinicia o REPL e avisa que as variáveis foram perdidas", async () => {
    await openRepl()
    const finish = defer<TerminalRunResult>()
    harness.client.pushRepl.mockReturnValue(finish.promise)
    harness.client.interrupt.mockImplementation(() => finish.reject(new TerminalInterruptedError()))
    harness.session.handleData("while True: pass\r")
    await waitForPhase(harness, "busy")
    harness.session.handleData("\x03")
    await vi.waitFor(() => expect(harness.client.startRepl).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(harness.screen().endsWith(">>> ")).toBe(true))
    expect(harness.screen()).toContain("O Python foi reiniciado: as variáveis do REPL foram perdidas.")
  })

  it("entrega os gráficos de um plt.show() e sai do REPL quando o Python pede exit", async () => {
    await openRepl()
    harness.client.pushRepl.mockResolvedValueOnce({ status: "ok", figures: ["PNG"] })
    harness.session.handleData("plt.show()\r")
    await vi.waitFor(() => expect(harness.figures).toEqual([["PNG"]]))
    harness.client.pushRepl.mockResolvedValueOnce({ status: "exit", figures: [] })
    harness.session.handleData("raise SystemExit\r")
    await vi.waitFor(() => expect(harness.screen().endsWith(PROMPT)).toBe(true))
  })
})

describe("fase", () => {
  it("avisa cada mudança de fase", async () => {
    harness.session.handleData("help\r")
    await waitForPhase(harness, "prompt")
    expect(harness.phases).toEqual(["prompt", "busy", "prompt"])
  })
})
