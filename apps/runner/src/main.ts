import { loadConfig } from "./config.js"
import { Executor, hostInfo } from "./executor.js"
import { WasmtimeSandbox } from "./sandbox.js"
import { Semaphore } from "./semaphore.js"
import { buildServer } from "./server.js"

const config = loadConfig()
const levels = { debug: 10, info: 20, warn: 30, error: 40 } as const
const log = (level: keyof typeof levels, msg: string, extra: Record<string, unknown> = {}) => {
  if (levels[level] < levels[config.LOG_LEVEL]) return
  process.stdout.write(JSON.stringify({ time: new Date().toISOString(), level, service: "runner", msg, ...extra }) + "\n")
}

const sandbox = new WasmtimeSandbox({
  wasmtimeBin: config.WASMTIME_BIN,
  pythonDir: config.PYTHON_WASI_DIR,
  harnessPath: config.HARNESS_PATH,
  workDir: config.WORK_DIR,
})
const executor = new Executor(sandbox, new Semaphore(config.CONCURRENCY, config.MAX_QUEUE))
const server = buildServer({ executor, token: config.RUNNER_TOKEN, log })

server.listen(config.PORT, config.HOST, () => {
  log("info", "executor ouvindo", { port: config.PORT, concurrency: config.CONCURRENCY, ...hostInfo() })
})

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    log("info", "encerrando", { signal: sig })
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5_000).unref()
  })
}
