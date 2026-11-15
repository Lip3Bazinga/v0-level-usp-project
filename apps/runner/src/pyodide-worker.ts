import path from "node:path"
import { pathToFileURL } from "node:url"
import { parentPort, workerData } from "node:worker_threads"
import { loadPyodide, type PyodideAPI, type PyodideConfig } from "pyodide"
import type { PyProxy } from "pyodide/ffi"
import { PYODIDE_LOCKDOWN_SOURCE, PYODIDE_RESTORE_SOURCE, PYODIDE_REUSE_GUARD_SOURCE, PYODIDE_SNAPSHOT_SOURCE } from "./pyodide-guard.js"
import { PYODIDE_PROFILES } from "./pyodide-profiles.js"
import type { PyodideRunRequest, PyodideWorkerBootData, PyodideWorkerCommand, PyodideWorkerEvent } from "./pyodide-protocol.js"

/*
 * Worker do motor `python-dados`: um Pyodide (CPython 3.14 em wasm) aquecido com os
 * pacotes de um perfil que roda lotes do harness. Roda numa `worker_thread` com ambiente
 * vazio; a thread principal controla tempo (buffer de interrupção + `terminate`) e lê as
 * observações pela saída padrão, como no motor WASI.
 *
 * Fronteira de confiança: o código do aluno roda DENTRO deste worker. Tudo o que ele
 * poderia alcançar fora do interpretador é removido antes do primeiro lote (ver
 * `pyodide-guard.ts` e `lockDownHost` abaixo); o que resta no `globalThis` é inofensivo.
 */

const HARNESS_DIR = "/harness"
const HARNESS_PATH = "/harness/harness.py"
const WORK_DIR = "/work"
/** Pastas que o aluno pode escrever (esvaziadas entre lotes na política `reuse`). */
const WRITABLE_ROOTS = ["/work", "/tmp", "/home"]
const READ_ONLY_FILE = 0o444
const READ_ONLY_DIR = 0o555
const BYTES_PER_MIB = 1024 * 1024
/** Junta escritas pequenas do aluno antes de enviá-las à thread principal. */
const STDOUT_FLUSH_BYTES = 64 * 1024
/** Acima disto, linhas curtas deixam de ser enviadas uma a uma (inundação de `print`). */
const MAX_LINE_FLUSHES = 2_000
/** Errno do Emscripten (difere do Linux): EACCES e ENOSPC. */
const EACCES = 2
const ENOSPC = 51
/** Globais do worker que dariam rede, processo ou módulos do Node a quem alcançasse o `globalThis`. */
const DANGEROUS_GLOBALS = ["process", "fetch", "WebSocket", "XMLHttpRequest", "EventSource", "require", "navigator", "BroadcastChannel", "MessageChannel", "MessagePort"]

type CreatePyodideModule = NonNullable<PyodideConfig["createPyodideModule"]>
type EmscriptenSettings = Parameters<CreatePyodideModule>[0]

/** Nó do MEMFS do Emscripten (o tipo público não declara as tabelas de operações). */
interface MemfsNode {
  mode: number
  contents?: Record<string, MemfsNode> | Uint8Array
  usedBytes?: number
  node_ops: MemfsNodeOps
  stream_ops: MemfsStreamOps
}

interface MemfsStream {
  node: MemfsNode
}

interface MemfsNodeOps {
  setattr(node: MemfsNode, attr: unknown): void
  mknod(parent: MemfsNode, name: string, mode: number, dev: unknown): MemfsNode
  rename(oldNode: MemfsNode, newDir: MemfsNode, newName: string): void
  unlink(parent: MemfsNode, name: string): void
  rmdir(parent: MemfsNode, name: string): void
  symlink(parent: MemfsNode, newName: string, oldPath: string): void
}

interface MemfsStreamOps {
  write(stream: MemfsStream, buffer: Uint8Array, offset: number, length: number, position: number, canOwn?: boolean): number
  allocate?(stream: MemfsStream, offset: number, length: number): void
}

interface AsmModule {
  default: CreatePyodideModule
}

/** A memória linear exportada pelo módulo wasm (a lib de tipos do Node não declara `WebAssembly.Memory`). */
interface WasmMemory {
  readonly buffer: ArrayBuffer
}

/** Onde o worker guarda a memória do wasm depois da instanciação, para medir o heap. */
interface HeapHandle {
  memory: WasmMemory | null
}

/** Orçamento do lote em andamento (bytes e entradas gravados, saída emitida). */
interface BatchBudget {
  diskBytes: number
  entries: number
  stdoutBytes: number
  overflowed: boolean
}

function isMemfsNode(value: unknown): value is MemfsNode {
  return typeof value === "object" && value !== null && "node_ops" in value && "stream_ops" in value && "mode" in value
}

function isWasmMemory(value: unknown): value is WasmMemory {
  return typeof value === "object" && value !== null && "buffer" in value && value.buffer instanceof ArrayBuffer
}

/** Instância do wasm (a lib de tipos do Node não declara `WebAssembly.Instance`). */
function isWasmInstance(value: unknown): value is { exports: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "exports" in value && typeof value.exports === "object" && value.exports !== null
}

function isAsmModule(value: unknown): value is AsmModule {
  return typeof value === "object" && value !== null && "default" in value && typeof value.default === "function"
}

function isBootData(value: unknown): value is PyodideWorkerBootData {
  return typeof value === "object" && value !== null && "pyodideDir" in value && "profile" in value && "harnessSource" in value
}

/** `emscripten_resize_heap` nas importações do wasm: recebe o tamanho pedido e diz se cresceu. */
function isResizeHeap(value: unknown): value is (requestedSize: number) => boolean {
  return typeof value === "function"
}

/** Converte um valor de JS num objeto Python (um dicionário vazio vira um namespace privado). */
function toPyProxy(pyodide: PyodideAPI, value: unknown): PyProxy {
  const proxy: unknown = pyodide.toPy(value)
  if (!(proxy instanceof pyodide.ffi.PyProxy)) throw new Error("toPy não devolveu um PyProxy")
  return proxy
}

function post(event: PyodideWorkerEvent, transfer: ArrayBuffer[] = []): void {
  parentPort?.postMessage(event, transfer)
}

/** Mensagem de um erro de JS, do Python (`PythonError`) ou do MEMFS (`ErrnoError` não estende `Error`). */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (typeof error === "object" && error !== null) {
    const name = "name" in error && typeof error.name === "string" ? error.name : "Error"
    const detail = "message" in error && typeof error.message === "string" ? error.message : "errno" in error ? `errno ${String(error.errno)}` : ""
    return `${name}: ${detail}`
  }
  return String(error)
}

// Referência capturada antes de `lockDownHost` apagar `globalThis.process`.
const processRef = process

/**
 * Carrega o Pyodide com um teto na memória linear do wasm: o `emscripten_resize_heap`
 * (importação do módulo) recusa crescer além de `maxHeapMb`, e o Python vê
 * `MemoryError`. A memória é exportada pelo módulo, então o teto só pode ser aplicado
 * na instanciação; `instantiateWasm` também guarda a `WebAssembly.Memory` para medir o
 * heap depois de cada lote.
 */
async function bootPyodide(data: PyodideWorkerBootData, heap: HeapHandle): Promise<PyodideAPI> {
  const indexURL = data.pyodideDir.endsWith("/") ? data.pyodideDir : `${data.pyodideDir}/`
  const maxHeapBytes = data.maxHeapMb * BYTES_PER_MIB
  const createPyodideModule: CreatePyodideModule = async (settings: EmscriptenSettings) => {
    const asm: unknown = await import(pathToFileURL(path.join(indexURL, "pyodide.asm.mjs")).href)
    if (!isAsmModule(asm)) throw new Error("pyodide.asm.mjs não exporta a fábrica do módulo")
    const inner = settings.instantiateWasm
    if (!inner) throw new Error("o Pyodide não forneceu instantiateWasm")
    const instantiateWasm: NonNullable<EmscriptenSettings["instantiateWasm"]> = (imports, successCallback) => {
      const env: unknown = imports.env
      if (typeof env === "object" && env !== null && "emscripten_resize_heap" in env && isResizeHeap(env.emscripten_resize_heap)) {
        const resizeHeap = env.emscripten_resize_heap
        Object.assign(env, {
          emscripten_resize_heap: (requestedSize: number): boolean => ((requestedSize >>> 0) > maxHeapBytes ? false : resizeHeap(requestedSize)),
        })
      }
      inner(imports, (instance, module) => {
        const candidate: unknown = instance
        if (isWasmInstance(candidate) && isWasmMemory(candidate.exports.memory)) heap.memory = candidate.exports.memory
        successCallback(instance, module)
      })
    }
    return asm.default({ ...settings, instantiateWasm })
  }
  return loadPyodide({
    indexURL,
    packageCacheDir: indexURL,
    env: {},
    // O módulo `js` do Python nasce vazio: mesmo que um JsProxy dele escapasse, não há nada nele.
    jsglobals: {},
    stdout: () => undefined,
    stderr: () => undefined,
    createPyodideModule,
  })
}

/**
 * Torna somente leitura, no nível do MEMFS, tudo fora de `/work`, `/tmp` e `/home`:
 * stdlib, site-packages e o harness. As verificações ficam nas tabelas de operações do
 * MEMFS (compartilhadas por todos os nós), então `os.chmod` do aluno não as desfaz. As
 * mesmas tabelas contam o que o aluno grava (cota de disco e de entradas por lote).
 */
function protectFilesystem(pyodide: PyodideAPI, budget: BatchBudget, limits: Pick<PyodideWorkerBootData, "maxJobDiskBytes" | "maxJobEntries">): void {
  const FS = pyodide.FS
  const protectedNodes = new WeakSet<MemfsNode>()
  const root: unknown = FS.lookupPath("/", {}).node
  if (!isMemfsNode(root)) throw new Error("raiz do MEMFS fora do formato esperado")
  const writableRoots = new Set<unknown>(WRITABLE_ROOTS.map((dir) => FS.lookupPath(dir, {}).node))
  const pending: MemfsNode[] = [root]
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    protectedNodes.add(node)
    if (!FS.isDir(node.mode) || node.contents === undefined || node.contents instanceof Uint8Array) continue
    for (const child of Object.values(node.contents)) {
      if (!writableRoots.has(child)) pending.push(child)
    }
  }
  const refuse = (node: MemfsNode): void => {
    if (protectedNodes.has(node)) throw new FS.ErrnoError(EACCES)
  }
  const charge = (bytes: number, entries: number): void => {
    budget.diskBytes += bytes
    budget.entries += entries
    if (budget.diskBytes > limits.maxJobDiskBytes || budget.entries > limits.maxJobEntries) throw new FS.ErrnoError(ENOSPC)
  }
  const fileNode: unknown = FS.lookupPath(HARNESS_PATH, {}).node
  if (!isMemfsNode(fileNode)) throw new Error("nó de arquivo do MEMFS fora do formato esperado")
  const { node_ops: dirOps } = root
  const { node_ops: fileOps, stream_ops: streamOps } = fileNode
  const originalWrite = streamOps.write
  streamOps.write = function (this: MemfsStreamOps, stream, buffer, offset, length, position, canOwn) {
    refuse(stream.node)
    charge(Math.max(0, position + length - (stream.node.usedBytes ?? 0)), 0)
    return originalWrite.call(this, stream, buffer, offset, length, position, canOwn)
  }
  const originalAllocate = streamOps.allocate
  if (originalAllocate) {
    streamOps.allocate = function (this: MemfsStreamOps, stream, offset, length) {
      refuse(stream.node)
      charge(Math.max(0, offset + length - (stream.node.usedBytes ?? 0)), 0)
      originalAllocate.call(this, stream, offset, length)
    }
  }
  for (const ops of new Set([dirOps, fileOps])) {
    const { setattr, mknod, rename, unlink, rmdir, symlink } = ops
    ops.setattr = function (this: MemfsNodeOps, node, attr) {
      refuse(node)
      setattr.call(this, node, attr)
    }
    ops.mknod = function (this: MemfsNodeOps, parent, name, mode, dev) {
      refuse(parent)
      charge(0, 1)
      return mknod.call(this, parent, name, mode, dev)
    }
    ops.rename = function (this: MemfsNodeOps, oldNode, newDir, newName) {
      refuse(oldNode)
      refuse(newDir)
      rename.call(this, oldNode, newDir, newName)
    }
    ops.unlink = function (this: MemfsNodeOps, parent, name) {
      refuse(parent)
      unlink.call(this, parent, name)
    }
    ops.rmdir = function (this: MemfsNodeOps, parent, name) {
      refuse(parent)
      rmdir.call(this, parent, name)
    }
    ops.symlink = function (this: MemfsNodeOps, parent, newName, oldPath) {
      refuse(parent)
      charge(0, 1)
      symlink.call(this, parent, newName, oldPath)
    }
  }
}

/**
 * Tira do `globalThis` do worker o que daria ao aluno rede, o processo do Node ou
 * módulos do host, e desliga a geração de código a partir de texto (`eval`, `Function`
 * e as variantes async/generator, inclusive via `.constructor` de qualquer função):
 * é o que um `JsProxy` escapado, ou `emscripten_run_script` chamado por `ctypes`,
 * usaria para sair do interpretador. `Function` continua existindo para `instanceof`.
 */
function lockDownHost(): void {
  function forbidden(): never {
    throw new Error("geração de código desativada no motor python-dados")
  }
  const prototypes = [
    Function.prototype,
    Reflect.getPrototypeOf(async function noopAsync(): Promise<void> {
      await Promise.resolve()
    }),
    Reflect.getPrototypeOf(function* noopGenerator(): Generator<never> {
      return undefined
    }),
    Reflect.getPrototypeOf(async function* noopAsyncGenerator(): AsyncGenerator<never> {
      await Promise.resolve()
    }),
  ]
  for (const prototype of prototypes) {
    if (prototype !== null) Object.defineProperty(prototype, "constructor", { value: forbidden, writable: false, configurable: false })
  }
  Object.defineProperty(globalThis, "eval", { value: forbidden, writable: false, configurable: false })
  for (const name of DANGEROUS_GLOBALS) {
    // `process` e os demais são configuráveis no Node; o que não for some do protótipo também.
    Reflect.deleteProperty(globalThis, name)
    if (name in globalThis) Object.defineProperty(globalThis, name, { value: undefined, writable: false, configurable: false })
  }
  // O Pyodide escreve "fatal error" no console; o diagnóstico vai à thread principal pelo evento `done`.
  // eslint-disable-next-line no-console -- silencia o console do worker (o log do executor é o da thread principal)
  for (const method of ["log", "error", "warn", "info", "debug"] as const) console[method] = () => undefined
}

function heapBytes(heap: HeapHandle): number {
  return heap.memory?.buffer.byteLength ?? 0
}

/** Esvazia `/work`, `/tmp` e `/home/pyodide` sem remover as pastas (o cwd de repouso é `/home/pyodide`). */
function clearWritableRoots(pyodide: PyodideAPI): void {
  const FS = pyodide.FS
  const removeTree = (dir: string): void => {
    for (const name of FS.readdir(dir)) {
      if (name === "." || name === "..") continue
      const entry = `${dir}/${name}`
      if (FS.isDir(FS.lookupPath(entry, {}).node.mode)) {
        removeTree(entry)
        FS.rmdir(entry)
      } else FS.unlink(entry)
    }
  }
  for (const dir of WRITABLE_ROOTS) {
    if (dir === "/home") {
      for (const name of FS.readdir("/home")) {
        if (name !== "." && name !== "..") removeTree(`/home/${name}`)
      }
    } else removeTree(dir)
  }
}

function writeProjectFiles(pyodide: PyodideAPI, request: PyodideRunRequest): void {
  const FS = pyodide.FS
  for (const file of request.files) {
    const segments = file.path.split("/").filter((segment) => segment !== "")
    let current = WORK_DIR
    for (const segment of segments.slice(0, -1)) {
      current = `${current}/${segment}`
      if (!FS.analyzePath(current, false).exists) FS.mkdir(current)
    }
    FS.writeFile(`${WORK_DIR}/${segments.join("/")}`, file.content)
  }
}

/** Entrega o lote ao harness pela entrada padrão, em pedaços, até o EOF (depois só EOF). */
function installStdin(pyodide: PyodideAPI, request: PyodideRunRequest): void {
  const jobBytes = new TextEncoder().encode(JSON.stringify(request.job))
  let offset = 0
  pyodide.setStdin({
    read: (buffer: Uint8Array): number => {
      const count = Math.min(buffer.length, jobBytes.length - offset)
      buffer.set(jobBytes.subarray(offset, offset + count))
      offset += count
      return count
    },
    isatty: false,
  })
}

/**
 * Saída padrão do convidado para a thread principal: cada `os.write` do harness (uma
 * observação) sai inteiro e imediatamente; escritas miúdas do aluno são juntadas em
 * blocos. Acima do teto, o lote é abortado com uma exceção de JS, que atravessa o
 * wasm e invalida o interpretador (o worker é descartado em seguida).
 */
function installStdout(pyodide: PyodideAPI, budget: BatchBudget, limits: Pick<PyodideWorkerBootData, "maxStdoutBytes" | "maxStderrChars">): () => void {
  let pendingChunks: Uint8Array[] = []
  let pendingBytes = 0
  let lineFlushes = 0
  const flush = (): void => {
    if (pendingBytes === 0) return
    const chunk = new Uint8Array(pendingBytes)
    let position = 0
    for (const part of pendingChunks) {
      chunk.set(part, position)
      position += part.length
    }
    pendingChunks = []
    pendingBytes = 0
    post({ type: "stdout", chunk }, [chunk.buffer])
  }
  pyodide.setStdout({
    write: (buffer: Uint8Array): number => {
      budget.stdoutBytes += buffer.length
      if (budget.stdoutBytes > limits.maxStdoutBytes) {
        budget.overflowed = true
        throw new Error("saída excedida")
      }
      pendingChunks.push(new Uint8Array(buffer))
      pendingBytes += buffer.length
      const endsLine = buffer.length > 0 && buffer[buffer.length - 1] === 0x0a
      if (pendingBytes >= STDOUT_FLUSH_BYTES || (endsLine && lineFlushes++ < MAX_LINE_FLUSHES)) flush()
      return buffer.length
    },
    isatty: false,
  })
  let stderrChars = 0
  pyodide.setStderr({
    write: (buffer: Uint8Array): number => {
      if (stderrChars < limits.maxStderrChars) {
        const text = new TextDecoder().decode(buffer)
        stderrChars += text.length
        post({ type: "stderr", text })
      }
      return buffer.length
    },
    isatty: false,
  })
  return flush
}

async function main(): Promise<void> {
  const data: unknown = workerData
  if (!isBootData(data) || !parentPort) throw new Error("worker do Pyodide iniciado sem os dados de partida")
  const startedAt = processRef.hrtime.bigint()
  const heap: HeapHandle = { memory: null }
  const profile = PYODIDE_PROFILES[data.profile]
  const pyodide = await bootPyodide(data, heap)
  await pyodide.loadPackage([...profile.packages], { messageCallback: () => undefined, errorCallback: () => undefined })
  pyodide.setInterruptBuffer(new Int32Array(data.interruptBuffer))
  // Namespace privado: só esta referência de JS o alcança (nunca entra em sys.modules).
  const privateGlobals = toPyProxy(pyodide, {})
  const runPrivate = (code: string): unknown => {
    const result: unknown = pyodide.runPython(code, { globals: privateGlobals })
    return result
  }
  runPrivate(profile.preload)
  pyodide.FS.mkdir(HARNESS_DIR)
  pyodide.FS.writeFile(HARNESS_PATH, data.harnessSource)
  pyodide.FS.chmod(HARNESS_PATH, READ_ONLY_FILE)
  pyodide.FS.chmod(HARNESS_DIR, READ_ONLY_DIR)
  pyodide.FS.mkdir(WORK_DIR)
  runPrivate(PYODIDE_LOCKDOWN_SOURCE)
  if (data.reusable) {
    runPrivate(PYODIDE_REUSE_GUARD_SOURCE)
    runPrivate(PYODIDE_SNAPSHOT_SOURCE)
    runPrivate(PYODIDE_RESTORE_SOURCE)
  }
  const version = runPrivate("import sys; '%d.%d.%d' % sys.version_info[:3]")
  const pythonVersion = typeof version === "string" ? version : "?"
  const budget: BatchBudget = { diskBytes: 0, entries: 0, stdoutBytes: 0, overflowed: false }
  protectFilesystem(pyodide, budget, data)
  lockDownHost()
  const bootMs = Number(processRef.hrtime.bigint() - startedAt) / 1e6
  post({ type: "ready", pythonVersion, pyodideVersion: pyodide.version, bootMs: Math.round(bootMs), heapBytes: heapBytes(heap) })

  const run = (request: PyodideRunRequest): void => {
    budget.diskBytes = 0
    budget.entries = 0
    budget.stdoutBytes = 0
    budget.overflowed = false
    const runStartedAt = processRef.hrtime.bigint()
    let fatal = false
    let error: string | undefined
    let flush = (): void => undefined
    try {
      writeProjectFiles(pyodide, request)
      installStdin(pyodide, request)
      flush = installStdout(pyodide, budget, data)
      pyodide.runPython(data.harnessSource, { filename: HARNESS_PATH })
    } catch (caught) {
      // Exceção de JS atravessou o wasm (saída excedida, `os._exit`, eval via ctypes...) ou
      // erro do Python fora do harness: o interpretador não é mais confiável.
      fatal = true
      error = errorMessage(caught)
    }
    try {
      flush()
    } catch {
      fatal = true
    }
    const durationMs = Number(processRef.hrtime.bigint() - runStartedAt) / 1e6
    post({ type: "done", durationMs: Math.round(durationMs), heapBytes: heapBytes(heap), overflowed: budget.overflowed, fatal, ...(error === undefined ? {} : { error }) })
  }

  const reset = (): void => {
    const resetStartedAt = processRef.hrtime.bigint()
    let ok = false
    let reason = ""
    try {
      pyodide.setStdin({ error: true })
      pyodide.setStdout({ write: (buffer: Uint8Array): number => buffer.length, isatty: false })
      pyodide.setStderr({ write: (buffer: Uint8Array): number => buffer.length, isatty: false })
      clearWritableRoots(pyodide)
      const outcome = runPrivate(`_restore_interpreter(${JSON.stringify(profile.canary)})`)
      const pair: unknown = outcome instanceof pyodide.ffi.PyProxy ? outcome.toJs() : outcome
      if (Array.isArray(pair) && typeof pair[0] === "boolean") {
        ok = pair[0]
        reason = typeof pair[1] === "string" ? pair[1] : ""
      } else reason = "restauração devolveu valor inesperado"
      if (outcome instanceof pyodide.ffi.PyProxy) outcome.destroy()
    } catch (caught) {
      reason = errorMessage(caught)
    }
    const durationMs = Number(processRef.hrtime.bigint() - resetStartedAt) / 1e6
    post({ type: "reset-done", ok, reason, heapBytes: heapBytes(heap), durationMs: Math.round(durationMs) })
  }

  parentPort.on("message", (command: PyodideWorkerCommand) => {
    switch (command.type) {
      case "run":
        run(command)
        return
      case "reset":
        reset()
        return
    }
  })
}

main().catch((error: unknown) => {
  post({ type: "boot-error", message: errorMessage(error) })
})
