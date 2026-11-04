import { findWritableRuntimePaths, loadConfig } from "./config.js"
import { DEFAULT_RUNNER_LIMITS } from "@levelusp/contracts"
import { Executor, hostInfo } from "./executor.js"
import { createLogger } from "./logger.js"
import { WasmtimeSandbox } from "./sandbox.js"
import { Semaphore } from "./semaphore.js"
import { buildServer } from "./server.js"
import { RunnerStats } from "./stats.js"

/** Prazo para as requisições em andamento terminarem antes de forçar a saída. */
const SHUTDOWN_GRACE_MS = 5_000

const config = loadConfig()
const log = createLogger(config.LOG_LEVEL)

/** Quantos caminhos graváveis aparecem no log (o resto só conta). */
const MAX_LOGGED_WRITABLE_PATHS = 3
const BYTES_PER_MIB = 1024 * 1024

const writableRuntime = findWritableRuntimePaths(config.PYTHON_WASI_DIR)
if (writableRuntime.length > 0) {
  const details = { count: writableRuntime.length, examples: writableRuntime.slice(0, MAX_LOGGED_WRITABLE_PATHS) }
  if (config.NODE_ENV === "production") {
    log("error", "stdlib do Python gravável pelo executor: um aluno alteraria a correção dos jobs seguintes; recusando partir", details)
    process.exit(1)
  }
  log("warn", "stdlib do Python gravável pelo executor (aceitável só em desenvolvimento: rode como usuário sem permissão de escrita)", details)
}

const sandbox = new WasmtimeSandbox({
  wasmtimeBin: config.WASMTIME_BIN,
  pythonDir: config.PYTHON_WASI_DIR,
  harnessPath: config.HARNESS_PATH,
  workDir: config.WORK_DIR,
  maxJobDiskBytes: config.MAX_JOB_DISK_MB * BYTES_PER_MIB,
  onGuestFailure: (details) => log("error", "convidado terminou sem nenhuma observação (falha do Wasmtime ou do módulo Python)", { ...details }),
})
const semaphore = new Semaphore(config.CONCURRENCY, config.MAX_QUEUE)
const stats = new RunnerStats(semaphore)
const executor = new Executor(sandbox, semaphore, { stats, maxQueueWaitMs: config.MAX_QUEUE_WAIT_MS })
const readiness = { ready: false, reason: "autoteste pendente" }
const server = buildServer({ executor, token: config.RUNNER_TOKEN, log, stats, readiness })

/**
 * Autoteste: roda um programa trivial pelo mesmo caminho dos jobs reais. Um `.cwasm`
 * compilado para outra CPU, um Wasmtime ausente ou uma stdlib fora do lugar derrubam
 * todas as correções com a mesma mensagem genérica para o aluno; aqui isso vira um
 * erro explícito no log e `/healthz` 503, que o compose e a API enxergam.
 */
async function selfTest(): Promise<void> {
  const observations = await sandbox.runBatch({
    files: [{ path: "main.py", content: 'print("levelusp-autoteste")\n' }],
    entry: "main.py",
    probes: [{ kind: "run", id: "autoteste", stdin: "" }],
    limits: { ...DEFAULT_RUNNER_LIMITS },
  })
  const observation = observations[0]
  if (observation?.ok && observation.stdout?.includes("levelusp-autoteste")) {
    readiness.ready = true
    readiness.reason = ""
    log("info", "autoteste do sandbox aprovado")
    return
  }
  readiness.ready = false
  readiness.reason = observation?.error ?? "sem observação"
  log("error", "autoteste do sandbox FALHOU: nenhuma correção vai funcionar até isto ser resolvido", { observation })
}

void selfTest().catch((error: unknown) => {
  readiness.reason = error instanceof Error ? error.message : String(error)
  log("error", "autoteste do sandbox FALHOU ao iniciar o Wasmtime", { error: readiness.reason })
})

server.listen(config.PORT, config.HOST, () => {
  log("info", "executor ouvindo", { port: config.PORT, concurrency: config.CONCURRENCY, maxQueue: config.MAX_QUEUE, maxQueueWaitMs: config.MAX_QUEUE_WAIT_MS, ...hostInfo() })
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    log("info", "encerrando", { signal })
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), SHUTDOWN_GRACE_MS).unref()
  })
}
