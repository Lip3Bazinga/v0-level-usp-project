import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProjectTrace } from "./project-execution"
import { requestTrace } from "./trace-client"
import type { PyodideStatus, WorkerCommand, WorkerMessage } from "./worker-protocol"

interface FakeWorker {
  status: PyodideStatus
  commands: WorkerCommand[]
  listeners: Set<{ onMessage: (message: WorkerMessage) => void }>
}

// Worker falso: guarda os comandos enviados e deixa o teste emitir as mensagens do worker.
const fake = vi.hoisted((): FakeWorker => ({ status: "ready", commands: [], listeners: new Set() }))

vi.mock("./pyodide-worker", () => ({
  getWorkerStatus: (): PyodideStatus => fake.status,
  postToWorker: (command: WorkerCommand): void => void fake.commands.push(command),
  restartWorker: vi.fn(),
  subscribeToWorker: (listener: { onMessage: (message: WorkerMessage) => void }): (() => void) => {
    fake.listeners.add(listener)
    return () => fake.listeners.delete(listener)
  },
}))

function emit(message: WorkerMessage): void {
  ;[...fake.listeners].forEach((listener) => listener.onMessage(message))
}

const TRACE: ProjectTrace = { steps: [], stdout: "", error: null, truncated: false }
const FILES = [{ path: "main.py", content: "import numpy as np\nx = np.arange(3)" }]

function lastTraceId(): number {
  const command = fake.commands.findLast((item) => item.type === "trace")
  if (command?.type !== "trace") throw new Error("nenhum pedido de trace")
  return command.requestId
}

describe("requestTrace", () => {
  beforeEach(() => {
    fake.status = "ready"
    fake.commands.length = 0
    fake.listeners.clear()
  })

  it("sem bibliotecas, pede o trace na hora", async () => {
    const pending = requestTrace({ files: FILES, entryPath: "main.py" })
    expect(fake.commands.map((command) => command.type)).toEqual(["trace"])
    emit({ type: "trace-result", requestId: lastTraceId(), trace: TRACE })
    await expect(pending).resolves.toEqual(TRACE)
  })

  it("instala as bibliotecas da lição antes e só então executa", async () => {
    const pending = requestTrace({ files: FILES, entryPath: "main.py", packages: ["numpy", "pandas"] })
    expect(fake.commands).toEqual([{ type: "install", packages: ["numpy", "pandas"] }])

    emit({ type: "package-installed", package: "numpy" })
    expect(fake.commands.map((command) => command.type)).toEqual(["install"])

    emit({ type: "package-installed", package: "pandas" })
    expect(fake.commands.map((command) => command.type)).toEqual(["install", "trace"])

    emit({ type: "trace-result", requestId: lastTraceId(), trace: TRACE })
    await expect(pending).resolves.toEqual(TRACE)
  })

  it("com o runtime ainda carregando, espera ficar pronto para instalar", () => {
    fake.status = "loading"
    void requestTrace({ files: FILES, entryPath: "main.py", packages: ["numpy"] })
    expect(fake.commands).toEqual([])
    emit({ type: "status", status: "ready" })
    expect(fake.commands).toEqual([{ type: "install", packages: ["numpy"] }])
  })

  it("falha com a mensagem do worker quando uma biblioteca não instala, sem executar", async () => {
    const pending = requestTrace({ files: FILES, entryPath: "main.py", packages: ["numpy"] })
    emit({ type: "package-error", package: "numpy", error: "Não foi possível instalar numpy: rede" })
    await expect(pending).rejects.toThrow("Não foi possível instalar numpy: rede")
    expect(fake.commands.some((command) => command.type === "trace")).toBe(false)
  })

  it("ignora a confirmação de bibliotecas que não pediu", () => {
    void requestTrace({ files: FILES, entryPath: "main.py", packages: ["numpy"] })
    emit({ type: "package-installed", package: "matplotlib" })
    expect(fake.commands.map((command) => command.type)).toEqual(["install"])
  })
})
