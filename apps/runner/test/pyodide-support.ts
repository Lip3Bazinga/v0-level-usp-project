/**
 * Apoio dos testes do motor Pyodide: engine REAL (workers do Node com a distribuição
 * apontada por `PYODIDE_DIR`) e atalhos para montar lotes. Sem a distribuição instalada
 * (`pnpm --filter @levelusp/runner setup:pyodide`) as suítes são puladas; no CI ela é instalada.
 */
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Probe, ProbeObservation, ProjectFile, RunnerLimits } from "@levelusp/contracts"
import { PyodideEngine, type PyodideEngineOptions } from "../src/pyodide-engine"

const testDir = path.dirname(fileURLToPath(import.meta.url))
const runnerDir = path.resolve(testDir, "..")

/** Pasta da distribuição do Pyodide usada nos testes (`PYODIDE_DIR`). */
export const pyodideDir = process.env.PYODIDE_DIR ?? "/opt/levelusp-pyodide"

/** Sem o Pyodide instalado a suíte é pulada; `SKIP_PYODIDE_TESTS=1` também pula. */
export const isPyodideAvailable = existsSync(path.join(pyodideDir, "pyodide.asm.wasm")) && process.env.SKIP_PYODIDE_TESTS !== "1"

/** Orçamento curto: os testes de tempo terminam rápido. */
export const SHORT_LIMITS: RunnerLimits = { timeoutMs: 3_000, memoryMb: 128 }

/** Opções do motor real usadas nos testes (sem pool aquecido por padrão: cada teste controla). */
export const pyodideEngineOptions = (overrides: Partial<PyodideEngineOptions> = {}): PyodideEngineOptions => ({
  pyodideDir,
  harnessPath: path.join(runnerDir, "python/harness.py"),
  workerPath: path.join(runnerDir, "dist/pyodide-worker.js"),
  policy: "fresh",
  warm: { dados: 0, ml: 0 },
  recycleAfter: 25,
  recycleHeapMb: 256,
  maxHeapMb: 512,
  jsHeapMb: 1_536,
  maxJobDiskBytes: 8 * 1024 * 1024,
  maxJobEntries: 2_000,
  bootTimeoutMs: 120_000,
  ...overrides,
})

/** Motor real. */
export const createPyodideEngine = (overrides: Partial<PyodideEngineOptions> = {}): PyodideEngine => new PyodideEngine(pyodideEngineOptions(overrides))

/** Espera o pool do perfil ter um worker ocioso (o aquecimento leva segundos). */
export async function waitForWarm(engine: PyodideEngine, profile: "dados" | "ml", timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (engine.readiness.warm[profile] === 0) {
    if (Date.now() > deadline) throw new Error(`pool ${profile} não aqueceu em ${timeoutMs} ms`)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

/** Projeto de um arquivo só (`main.py`). */
export const mainFile = (...lines: string[]): ProjectFile[] => [{ path: "main.py", content: lines.join("\n") + "\n" }]

/** Roda um lote de sondas no motor real (perfil `dados`, salvo `libraries`). */
export const runProbes = (engine: PyodideEngine, files: ProjectFile[], probes: Probe[], limits = SHORT_LIMITS, libraries: string[] = ["numpy", "pandas"]): Promise<ProbeObservation[]> =>
  engine.run({ files, entry: "main.py", probes, limits, libraries })

/** Primeira observação de um lote de uma sonda (falha o teste se faltar). */
export async function runOne(engine: PyodideEngine, files: ProjectFile[], probe: Probe, limits = SHORT_LIMITS, libraries?: string[]): Promise<ProbeObservation> {
  const [observation] = await runProbes(engine, files, [probe], limits, libraries)
  if (!observation) throw new Error("o motor não devolveu observação")
  return observation
}

/** Sonda `globals` com os nomes pedidos. */
export const globalsProbe = (...names: string[]): Probe => ({ id: "g", kind: "globals", names })

/** Sonda `expr` sem preparação. */
export const exprProbe = (expr: string, setup = "", id = "e"): Probe => ({ id, kind: "expr", setup, expr, stdin: "" })

/** Sonda `run` (programa inteiro). */
export const runProbe = (stdin = ""): Probe => ({ id: "r", kind: "run", stdin })

/** Sonda `legacy` (modo estrito; o `assert False, relatório` devolve o relatório em `details`). */
export const reportProbe = (expression: string): Probe => ({ id: "l", kind: "legacy", code: `assert False, ${expression}` })

/** Texto devolvido por `reportProbe`. */
export const reportOf = (observation: ProbeObservation): string => observation.legacy?.details.join("\n") ?? JSON.stringify(observation)

/**
 * Cada tentativa vira uma entrada do dicionário `resultados`: "ok:<resultado>" ou o tipo
 * da exceção. Lido por uma sonda `globals`.
 */
export const tryAll = (attempts: Record<string, string>, prelude: string[] = ["import os, sys"]): string[] => [
  ...prelude,
  "resultados = {}",
  "def tenta(nome, acao):",
  "    try:",
  "        resultados[nome] = 'ok:' + repr(acao())[:300]",
  "    except BaseException as erro:",
  "        resultados[nome] = type(erro).__name__ + ': ' + str(erro)[:120]",
  ...Object.entries(attempts).map(([name, action]) => `tenta(${JSON.stringify(name)}, lambda: ${action})`),
]

/** Resultado de `tryAll` que NÃO começa com "ok:" (a tentativa foi bloqueada). */
export const isBlocked = (result: string | undefined): boolean => result !== undefined && !result.startsWith("ok:")
