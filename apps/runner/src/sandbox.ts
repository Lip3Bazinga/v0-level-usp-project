import { spawn } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile, copyFile } from "node:fs/promises"
import path from "node:path"
import type { Probe, ProbeObservation, ProjectFile } from "@levelusp/contracts"

export interface SandboxLimits {
  timeoutMs: number
  memoryMb: number
}

export interface SandboxOptions {
  wasmtimeBin: string
  pythonDir: string
  harnessPath: string
  workDir: string
}

/** Unidades de fuel por segundo de orçamento (calibrado: laço de 10⁶ ≈ 2–5×10⁹). */
const FUEL_PER_SECOND = 15_000_000_000
const MAX_CAPTURE = 256 * 1024

/**
 * Executa um lote de sondas numa instância CPython WASI nova.
 *
 * Capacidades concedidas ao convidado: só /lib (stdlib, leitura), /job (projeto
 * do aluno + harness) e /out (observações). Sem variáveis de ambiente, sem rede,
 * sem processos. Tempo de parede, fuel (CPU) e memória linear são limitados.
 */
export class WasmtimeSandbox {
  constructor(private readonly opts: SandboxOptions) {}

  async runBatch(files: ProjectFile[], entry: string, probes: Probe[], limits: SandboxLimits): Promise<ProbeObservation[]> {
    const root = await mkdtemp(path.join(this.opts.workDir, "lvl-job-"))
    try {
      const jobDir = path.join(root, "job")
      const projectDir = path.join(jobDir, "project")
      const outDir = path.join(root, "out")
      await mkdir(projectDir, { recursive: true })
      await mkdir(outDir)
      for (const f of files) {
        const target = safeJoin(projectDir, f.path)
        await mkdir(path.dirname(target), { recursive: true })
        await writeFile(target, f.content, "utf8")
      }
      await copyFile(this.opts.harnessPath, path.join(jobDir, "harness.py"))
      await writeFile(path.join(jobDir, "probes.json"), JSON.stringify({ entry, probes }), "utf8")

      const { timedOut, stderr } = await this.spawnWasmtime(jobDir, outDir, limits)
      const observed = await readObservations(path.join(outDir, "obs.jsonl"))
      return probes.map((p) => {
        const obs = observed.get(p.id)
        if (obs) return obs
        if (timedOut) return { id: p.id, ok: false, timedOut: true, error: "Tempo limite excedido (verifique laços infinitos)." }
        return { id: p.id, ok: false, error: describeCrash(stderr) }
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }

  private spawnWasmtime(jobDir: string, outDir: string, limits: SandboxLimits): Promise<{ timedOut: boolean; stderr: string }> {
    const seconds = limits.timeoutMs / 1000
    const args = [
      "run",
      "--allow-precompiled",
      "-W", [
        `fuel=${Math.round(FUEL_PER_SECOND * seconds)}`,
        `max-memory-size=${limits.memoryMb * 1024 * 1024}`,
        `timeout=${limits.timeoutMs}ms`,
      ].join(","),
      "-S", "inherit-env=n,inherit-network=n,tcp=n,udp=n",
      "--dir", `${path.join(this.opts.pythonDir, "lib")}::/lib`,
      "--dir", `${jobDir}::/job`,
      "--dir", `${outDir}::/out`,
      path.join(this.opts.pythonDir, "python.cwasm"),
      "-I", "-S", "/job/harness.py",
    ]
    return new Promise((resolve, reject) => {
      // Ambiente vazio: nada do processo do executor chega ao convidado.
      const child = spawn(this.opts.wasmtimeBin, args, { env: {}, stdio: ["ignore", "pipe", "pipe"] })
      let stderr = ""
      let killedByHost = false
      child.stdout.on("data", () => undefined) // descarta prints fora do controle do harness
      child.stderr.on("data", (chunk: Buffer) => {
        if (stderr.length < MAX_CAPTURE) stderr += chunk.toString("utf8")
      })
      // Backstop do host: se o timeout interno do Wasmtime falhar, mata o processo.
      const guard = setTimeout(() => {
        killedByHost = true
        child.kill("SIGKILL")
      }, limits.timeoutMs + 2_000)
      child.on("error", (err) => {
        clearTimeout(guard)
        reject(err)
      })
      child.on("close", () => {
        clearTimeout(guard)
        const timedOut = killedByHost || /fuel|interrupt|timed out|deadline/i.test(stderr)
        resolve({ timedOut, stderr })
      })
    })
  }
}

/** Junta um caminho relativo do aluno ao diretório do projeto, recusando fugas. */
export function safeJoin(base: string, rel: string): string {
  const target = path.resolve(base, rel)
  if (!target.startsWith(base + path.sep)) throw new Error(`Caminho inválido: ${rel}`)
  return target
}

async function readObservations(file: string): Promise<Map<string, ProbeObservation>> {
  const map = new Map<string, ProbeObservation>()
  let raw = ""
  try {
    raw = await readFile(file, "utf8")
  } catch {
    return map
  }
  for (const line of raw.slice(0, 8 * 1024 * 1024).split("\n")) {
    if (!line.trim()) continue
    try {
      const obs = JSON.parse(line) as ProbeObservation
      if (obs && typeof obs.id === "string" && !map.has(obs.id)) map.set(obs.id, obs)
    } catch {
      // linha corrompida (ex.: escrita interrompida pelo timeout) — ignorada
    }
  }
  return map
}

function describeCrash(stderr: string): string {
  if (/memory|out of bounds|grow/i.test(stderr)) return "Memória insuficiente: o programa usou mais memória do que o permitido."
  if (/stack overflow|call stack exhausted|RecursionError/i.test(stderr)) return "Recursão profunda demais (estouro de pilha)."
  return "O programa terminou de forma inesperada."
}
