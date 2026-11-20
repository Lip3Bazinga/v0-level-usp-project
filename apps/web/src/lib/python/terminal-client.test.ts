import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import type { PyodideStatus, WorkerCommand, WorkerMessage } from "./worker-protocol"
import { createTerminalClient, TerminalInterruptedError, type TerminalRunCallbacks } from "./terminal-client"
import type { WorkerListener } from "./pyodide-worker"

interface WorkerState {
  listeners: Set<WorkerListener>
  posted: WorkerCommand[]
  restarts: number
  status: PyodideStatus
}

const worker = vi.hoisted((): WorkerState => ({ listeners: new Set(), posted: [], restarts: 0, status: "ready" }))

vi.mock("./pyodide-worker", () => ({
  getWorkerStatus: (): PyodideStatus => worker.status,
  postToWorker: (command: WorkerCommand): void => {
    worker.posted.push(command)
  },
  restartWorker: (): void => {
    worker.restarts += 1
  },
  subscribeToWorker: (listener: WorkerListener): (() => void) => {
    worker.listeners.add(listener)
    return () => worker.listeners.delete(listener)
  },
}))

function deliver(message: WorkerMessage): void {
  for (const listener of [...worker.listeners]) listener.onMessage(message)
}

function lastRunId(): number {
  const command = worker.posted.at(-1)
  if (!command || !("runId" in command)) throw new Error("nenhum comando do terminal enviado")
  return command.runId
}

const FILES = [{ path: "main.py", content: "print(1)" }]
const callbacks = (): { onOutput: Mock<TerminalRunCallbacks["onOutput"]>; onInputRequest: Mock<TerminalRunCallbacks["onInputRequest"]> } => ({
  onOutput: vi.fn<TerminalRunCallbacks["onOutput"]>(),
  onInputRequest: vi.fn<TerminalRunCallbacks["onInputRequest"]>(),
})

beforeEach(() => {
  worker.listeners.clear()
  worker.posted.length = 0
  worker.restarts = 0
  worker.status = "ready"
})

describe("cliente do terminal", () => {
  it("envia o comando ao worker e resolve quando ele termina", async () => {
    const client = createTerminalClient()
    const result = client.runScript(FILES, "main.py", callbacks())
    expect(worker.posted).toEqual([{ type: "term-run", runId: lastRunId(), files: FILES, entryPath: "main.py" }])
    deliver({ type: "term-done", runId: lastRunId(), status: "ok", figures: ["PNG"] })
    await expect(result).resolves.toEqual({ status: "ok", figures: ["PNG"] })
    expect(worker.listeners.size).toBe(0)
  })

  it("entrega saída e pedidos de input só do comando em andamento", async () => {
    const client = createTerminalClient()
    const handlers = callbacks()
    const result = client.runScript(FILES, "main.py", handlers)
    const runId = lastRunId()
    deliver({ type: "term-output", runId, stream: "stdout", text: "oi\n" })
    deliver({ type: "term-output", runId: runId + 99, stream: "stdout", text: "de outro comando\n" })
    deliver({ type: "term-input-request", runId })
    deliver({ type: "execution-result", result: { stdout: "", stderr: "", error: null, figures: [], truncated: false } })
    deliver({ type: "term-done", runId, status: "ok", figures: [] })
    await result
    expect(handlers.onOutput).toHaveBeenCalledTimes(1)
    expect(handlers.onOutput).toHaveBeenCalledWith("stdout", "oi\n")
    expect(handlers.onInputRequest).toHaveBeenCalledTimes(1)
  })

  it("rejeita com a mensagem do worker quando o comando falha por dentro", async () => {
    const client = createTerminalClient()
    const result = client.runFs("ls", [], FILES, callbacks())
    deliver({ type: "term-error", runId: lastRunId(), error: "O Python não está disponível." })
    await expect(result).rejects.toThrow("O Python não está disponível.")
  })

  it("rejeita quando o worker cai", async () => {
    const client = createTerminalClient()
    const result = client.startRepl(FILES, callbacks())
    for (const listener of [...worker.listeners]) listener.onCrash(new ErrorEvent("error"))
    await expect(result).rejects.toThrow("O Python parou de responder")
  })

  it("responde ao input() com o runId do comando ativo", () => {
    const client = createTerminalClient()
    void client.runScript(FILES, "main.py", callbacks()).catch(() => undefined)
    const runId = lastRunId()
    client.sendInput("Ana")
    client.sendInput(null)
    expect(worker.posted.slice(1)).toEqual([
      { type: "term-input", runId, line: "Ana" },
      { type: "term-input", runId, line: null },
    ])
  })

  it("ignora sendInput e interrupt sem comando em andamento", () => {
    const client = createTerminalClient()
    client.sendInput("x")
    client.interrupt()
    expect(worker.posted).toEqual([])
    expect(worker.restarts).toBe(0)
  })

  it("Ctrl+C reinicia o worker e rejeita o comando com TerminalInterruptedError", async () => {
    const client = createTerminalClient()
    const result = client.pushRepl("while True: pass", callbacks())
    client.interrupt()
    await expect(result).rejects.toBeInstanceOf(TerminalInterruptedError)
    expect(worker.restarts).toBe(1)
    expect(worker.listeners.size).toBe(0)
    client.interrupt()
    expect(worker.restarts).toBe(1)
  })

  it("descarta o bloco do REPL com null", () => {
    const client = createTerminalClient()
    void client.pushRepl(null, callbacks())
    expect(worker.posted).toEqual([{ type: "term-repl-line", runId: lastRunId(), line: null }])
  })

  it("expõe o status do runtime", () => {
    worker.status = "loading"
    expect(createTerminalClient().getStatus()).toBe("loading")
  })
})
