import { findWritableRuntimePaths, loadConfig } from "./config.js"
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
})
const semaphore = new Semaphore(config.CONCURRENCY, config.MAX_QUEUE)
const stats = new RunnerStats(semaphore)
const executor = new Executor(sandbox, semaphore, { stats, maxQueueWaitMs: config.MAX_QUEUE_WAIT_MS })
const server = buildServer({ executor, token: config.RUNNER_TOKEN, log, stats })

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
