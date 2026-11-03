/**
 * Apoio da suíte adversarial: sandbox REAL (Wasmtime + CPython WASI), pasta de
 * jobs própria (para conferir a limpeza) e atalhos para montar sondas.
 */
import { existsSync, mkdtempSync, readdirSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Probe, ProbeObservation, ProjectFile, RunnerLimits } from "@levelusp/contracts"
import { resolveBinary } from "../../src/config"
import { WasmtimeSandbox, type SandboxOptions } from "../../src/sandbox"

const pythonDir = process.env.PYTHON_WASI_DIR ?? "/opt/levelusp-python"
const testDir = path.dirname(fileURLToPath(import.meta.url))

/** Sem o CPython WASI instalado a suíte é pulada (no CI ele é instalado). */
export const isPythonAvailable = existsSync(path.join(pythonDir, "python.cwasm")) && process.env.SKIP_SANDBOX_TESTS !== "1"

/** Orçamento curto: os ataques de tempo terminam rápido. */
export const SHORT_LIMITS: RunnerLimits = { timeoutMs: 3_000, memoryMb: 128 }

/** Pasta de jobs exclusiva deste processo de teste (limpeza verificável). */
export const jobsRoot = mkdtempSync(path.join(os.tmpdir(), "lvl-ataques-"))

/** Opções do sandbox real usadas pelos testes. */
export const sandboxOptions = (overrides: Partial<SandboxOptions> = {}): SandboxOptions => ({
  wasmtimeBin: resolveBinary(process.env.WASMTIME_BIN ?? "wasmtime", process.env.PATH),
  pythonDir,
  // ATTACK_HARNESS_PATH: roda a suíte contra outro harness (ex.: a versão anterior, para comparar).
  harnessPath: process.env.ATTACK_HARNESS_PATH ?? path.resolve(testDir, "../../python/harness.py"),
  workDir: jobsRoot,
  ...overrides,
})

/** Sandbox real compartilhado pelos testes. */
export const createSandbox = (overrides: Partial<SandboxOptions> = {}): WasmtimeSandbox => new WasmtimeSandbox(sandboxOptions(overrides))

/** Diretório da stdlib do CPython WASI no host. */
export const pythonLibDir = path.join(pythonDir, "lib")

/** Projeto de um arquivo só (`main.py`). */
export const mainFile = (...lines: string[]): ProjectFile[] => [{ path: "main.py", content: lines.join("\n") + "\n" }]

/** Roda um lote de sondas no sandbox real. */
export const runProbes = (sandbox: WasmtimeSandbox, files: ProjectFile[], probes: Probe[], limits = SHORT_LIMITS): Promise<ProbeObservation[]> =>
  sandbox.runBatch({ files, entry: "main.py", probes, limits })

/** Primeira observação de um lote de uma sonda (falha o teste se faltar). */
export async function runOne(sandbox: WasmtimeSandbox, files: ProjectFile[], probe: Probe, limits = SHORT_LIMITS): Promise<ProbeObservation> {
  const [observation] = await runProbes(sandbox, files, [probe], limits)
  if (!observation) throw new Error("o executor não devolveu observação")
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

/** Quantos diretórios de job sobraram na pasta de jobs (deve voltar a zero). */
export const leftoverJobDirs = (): string[] => readdirSync(jobsRoot)

/** Executa um script Python como root? (permissões de arquivo não valem para root). */
export const isRoot = (): boolean => process.getuid?.() === 0

/**
 * "Kit do atacante": tenta cada rota até o estado do harness e registra o
 * resultado em `rotas` (nome → "ok" ou o tipo da exceção). Candidatos a nonce
 * (32 dígitos hex com ao menos uma letra) achados no caminho vão para `achados`.
 */
export const ATTACKER_PRELUDE = [
  "import sys, os, re, gc, builtins",
  "rotas = {}",
  "achados = set()",
  "HEX = re.compile(r'(?<![0-9a-f])(?=[0-9a-f]*[a-f])[0-9a-f]{32}(?![0-9a-f])')",
  "def procura(valor, limite=200000):",
  "    try:",
  "        achados.update(HEX.findall(repr(valor)[:limite]))",
  "    except BaseException:",
  "        pass",
  "def sobe(frame):",
  "    while frame is not None:",
  "        procura(frame.f_locals)",
  "        frame = frame.f_back",
  "def tenta(nome, acao):",
  "    try:",
  "        procura(acao())",
  "        rotas[nome] = 'ok'",
  "    except BaseException as erro:",
  "        rotas[nome] = type(erro).__name__",
]
