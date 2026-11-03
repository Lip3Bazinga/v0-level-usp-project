import type { loadPyodide, PyodideAPI } from "pyodide"
import { createProjectRunner, readPythonVersion, type ProjectRunner } from "./project-execution"
import type { WorkerCommand, WorkerMessage } from "./worker-protocol"

/*
 * Web Worker do botão "Executar": carrega o Pyodide e roda o projeto do aluno
 * fora da thread da interface. Laço infinito ou "Parar" matam este worker
 * inteiro (pyodide-worker.ts sobe outro), então nada aqui precisa ser interrompível.
 */

interface PythonRuntime {
  pyodide: PyodideAPI
  runProject: ProjectRunner
}

interface PyodideModule {
  loadPyodide: typeof loadPyodide
}

/** Pacotes vindos do PyPI (via micropip) que precisam de ajuste depois de instalados. */
const POST_INSTALL_SETUP: Readonly<Record<string, string>> = {
  plotly: "import plotly.io as _pio\n_pio.renderers.default = 'json'",
}

let runtimePromise: Promise<PythonRuntime> | null = null
const installedPackages = new Set<string>()
// Comandos em fila: uma instalação de pacote não pode se intercalar com uma execução.
let commandQueue: Promise<void> = Promise.resolve()

function post(message: WorkerMessage): void {
  self.postMessage(message)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isPyodideModule(value: unknown): value is PyodideModule {
  return typeof value === "object" && value !== null && "loadPyodide" in value && typeof value.loadPyodide === "function"
}

async function bootRuntime(indexURL: string, packageBaseUrl: string): Promise<PythonRuntime> {
  // URL só conhecida em tempo de execução: o bundler não deve tentar resolvê-la.
  const pyodideModule: unknown = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${indexURL}pyodide.mjs`)
  if (!isPyodideModule(pyodideModule)) throw new Error("pyodide.mjs não exporta loadPyodide.")
  const pyodide = await pyodideModule.loadPyodide({
    indexURL,
    packageBaseUrl,
    // Sem DOM no worker: o matplotlib desenha em memória e a figura vira PNG.
    env: { MPLBACKEND: "agg" },
  })
  // O harness troca sys.stdin por uma string; ler o stdin "de verdade" é erro, nunca um prompt().
  pyodide.setStdin({ error: true })
  return { pyodide, runProject: createProjectRunner(pyodide) }
}

function startRuntime(indexURL: string, packageBaseUrl: string): Promise<PythonRuntime> {
  if (runtimePromise) return runtimePromise
  post({ type: "status", status: "loading" })
  runtimePromise = bootRuntime(indexURL, packageBaseUrl)
  runtimePromise.then(
    (runtime) => post({ type: "status", status: "ready", pythonVersion: readPythonVersion(runtime.pyodide) }),
    (error: unknown) => post({ type: "status", status: "error", error: errorMessage(error) }),
  )
  return runtimePromise
}

async function readyRuntime(): Promise<PythonRuntime | null> {
  if (!runtimePromise) return null
  try {
    return await runtimePromise
  } catch {
    return null
  }
}

async function handleExecute(command: Extract<WorkerCommand, { type: "execute" }>): Promise<void> {
  const runtime = await readyRuntime()
  if (!runtime) {
    post({ type: "execution-error", error: "O Python não está disponível. Tente recarregar a página." })
    return
  }
  post({ type: "execution-start" })
  try {
    post({ type: "execution-result", result: runtime.runProject({ files: command.files, entryPath: command.entryPath }) })
  } catch (error) {
    post({ type: "execution-error", error: errorMessage(error) })
  }
}

/** Nome normalizado como no pyodide-lock.json (PEP 503). */
function normalizePackageName(name: string): string {
  return name.trim().toLowerCase().replace(/[-_.]+/g, "-")
}

async function installFromPyPI(pyodide: PyodideAPI, packageName: string): Promise<void> {
  await pyodide.loadPackage("micropip")
  await pyodide.runPythonAsync(`import micropip\nawait micropip.install(${JSON.stringify(packageName)})`)
}

async function installPackage(pyodide: PyodideAPI, packageName: string): Promise<void> {
  const normalized = normalizePackageName(packageName)
  // Pacotes do lock são wheels compilados para esta versão do Pyodide (CDN oficial).
  if (normalized in pyodide.lockfile.packages) await pyodide.loadPackage(normalized)
  else await installFromPyPI(pyodide, packageName)
  const setup = POST_INSTALL_SETUP[normalized]
  if (setup) pyodide.runPython(setup)
}

async function handleInstall(packages: readonly string[]): Promise<void> {
  const runtime = await readyRuntime()
  if (!runtime) return
  for (const packageName of packages) {
    const normalized = normalizePackageName(packageName)
    if (!installedPackages.has(normalized)) {
      post({ type: "packages-loading", packages: [packageName] })
      try {
        await installPackage(runtime.pyodide, packageName)
        installedPackages.add(normalized)
      } catch (error) {
        post({ type: "package-error", package: packageName, error: `Não foi possível instalar ${packageName}: ${errorMessage(error)}` })
        continue
      }
    }
    post({ type: "package-installed", package: packageName })
  }
}

function handleCommand(command: WorkerCommand): Promise<void> {
  switch (command.type) {
    case "init":
      return startRuntime(command.indexURL, command.packageBaseUrl).then(
        () => undefined,
        () => undefined,
      )
    case "execute":
      return handleExecute(command)
    case "install":
      return handleInstall(command.packages)
  }
}

self.onmessage = (event: MessageEvent<WorkerCommand>): void => {
  const command = event.data
  commandQueue = commandQueue
    .then(() => handleCommand(command))
    .catch((error: unknown) => post({ type: "execution-error", error: errorMessage(error) }))
}
