import { findWritableRuntimePaths, isPyodideEnabled, loadConfig, resolveMemoryBudgetMb, resolvePyodideWorkerPath } from "./config.js"
import type { Engine } from "./engine.js"
import { Executor, hostInfo, type EngineRegistry } from "./executor.js"
import { createLogger } from "./logger.js"
import { BATCH_MEMORY_KEYS, MemoryBudget } from "./memory-budget.js"
import { createNativeEngine } from "./native-setup.js"
import { PyodideEngine } from "./pyodide-engine.js"
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
/** Arquivos + pastas que um lote pode criar no projeto (mesma cota do WASI). */
const MAX_JOB_ENTRIES = 2_000

const writableRuntime = findWritableRuntimePaths(config.PYTHON_WASI_DIR)
if (writableRuntime.length > 0) {
  const details = { count: writableRuntime.length, examples: writableRuntime.slice(0, MAX_LOGGED_WRITABLE_PATHS) }
  if (config.NODE_ENV === "production") {
    log("error", "stdlib do Python gravável pelo executor: um aluno alteraria a correção dos jobs seguintes; recusando partir", details)
    process.exit(1)
  }
  log("warn", "stdlib do Python gravável pelo executor (aceitável só em desenvolvimento: rode como usuário sem permissão de escrita)", details)
}

/**
 * Orçamento de memória das instâncias: o limite do contêiner menos a reserva. O semáforo é
 * criado antes dos motores para ser o primeiro ouvinte do orçamento (um lote à espera de
 * memória tem prioridade sobre o reabastecimento do pool aquecido).
 */
const budget = new MemoryBudget(resolveMemoryBudgetMb(config))
const batchMemoryMb = config.RUNNER_BATCH_MEMORY_MB
const semaphore = new Semaphore(config.CONCURRENCY, config.MAX_QUEUE, budget)
for (const key of BATCH_MEMORY_KEYS) {
  if (batchMemoryMb[key] > budget.limitMb) {
    log("error", "perfil não cabe no orçamento de memória: todo job dele será recusado (501); aumente a memória do contêiner ou reveja RUNNER_BATCH_MEMORY_MB", { profile: key, neededMb: batchMemoryMb[key], budgetMb: budget.limitMb })
  }
}

const sandbox = new WasmtimeSandbox({
  wasmtimeBin: config.WASMTIME_BIN,
  pythonDir: config.PYTHON_WASI_DIR,
  harnessPath: config.HARNESS_PATH,
  workDir: config.WORK_DIR,
  maxJobDiskBytes: config.MAX_JOB_DISK_MB * BYTES_PER_MIB,
  memoryMb: batchMemoryMb.python,
  onGuestFailure: (details) => log("error", "convidado terminou sem nenhuma observação (falha do Wasmtime ou do módulo Python)", { ...details }),
})
const pyodide = isPyodideEnabled(config)
  ? new PyodideEngine({
      pyodideDir: config.PYODIDE_DIR,
      harnessPath: config.HARNESS_PATH,
      workerPath: resolvePyodideWorkerPath(config.PYODIDE_WORKER_PATH),
      policy: config.RUNNER_PYODIDE_POLICY,
      warm: config.RUNNER_PYODIDE_WARM,
      recycleAfter: config.RUNNER_PYODIDE_RECYCLE_AFTER,
      recycleHeapMb: config.RUNNER_PYODIDE_RECYCLE_HEAP_MB,
      maxHeapMb: config.RUNNER_PYODIDE_MAX_HEAP_MB,
      jsHeapMb: config.RUNNER_PYODIDE_JS_HEAP_MB,
      maxJobDiskBytes: config.MAX_JOB_DISK_MB * BYTES_PER_MIB,
      maxJobEntries: MAX_JOB_ENTRIES,
      bootTimeoutMs: config.RUNNER_PYODIDE_BOOT_TIMEOUT_MS,
      budget,
      memoryMb: { dados: batchMemoryMb.dados, ml: batchMemoryMb.ml },
      log,
    })
  : undefined
/**
 * Motor python-completo (CPython nativo em gVisor): desligado por padrão. Ligado, só sobe se a
 * política de isolamento aceitar o que o Docker oferece (`createNativeEngine` registra o motivo).
 */
const native = await createNativeEngine(config, log)
const engines: EngineRegistry = { python: sandbox, ...(pyodide ? { "python-dados": pyodide } : {}), ...(native ? { "python-completo": native } : {}) }
const engineList: Engine[] = [sandbox, ...(pyodide ? [pyodide] : []), ...(native ? [native] : [])]
const stats = new RunnerStats(semaphore, engineList, budget)
const executor = new Executor(engines, semaphore, { stats, maxQueueWaitMs: config.MAX_QUEUE_WAIT_MS, budget })
const server = buildServer({
  executor,
  token: config.RUNNER_TOKEN,
  log,
  stats,
  readiness: sandbox.readiness,
  ...(pyodide ? { pyodideReadiness: pyodide.readiness } : {}),
  ...(native ? { nativeReadiness: native.readiness } : {}),
})

/**
 * Autotestes na partida: o do WASI decide `/healthz` (503 enquanto falhar); o do Pyodide
 * só informa (`pyodide.ready`), porque o motor é opcional e as lições `python` continuam
 * funcionando sem ele.
 */
void sandbox.selfTest().then(() => {
  if (sandbox.readiness.ready) log("info", "autoteste do sandbox aprovado")
  else log("error", "autoteste do sandbox FALHOU: nenhuma correção vai funcionar até isto ser resolvido", { reason: sandbox.readiness.reason })
})
if (pyodide) {
  void pyodide.start().then(() => {
    if (pyodide.readiness.ready) log("info", "motor python-dados pronto", { policy: config.RUNNER_PYODIDE_POLICY, warm: config.RUNNER_PYODIDE_WARM, pyodideDir: config.PYODIDE_DIR })
    else log("error", "autoteste do motor python-dados FALHOU: lições python-dados não serão corrigidas", { reason: pyodide.readiness.reason })
  })
} else {
  log("info", "motor python-dados desligado", { pyodideDir: config.PYODIDE_DIR })
}

if (native) {
  void native.start().then(() => {
    if (native.readiness.ready) log("info", "motor python-completo pronto", { ...native.versions, image: config.RUNNER_NATIVE_IMAGE, warm: config.RUNNER_NATIVE_WARM })
    else log("error", "autoteste do motor python-completo FALHOU: lições python-completo não serão corrigidas", { reason: native.readiness.reason, image: config.RUNNER_NATIVE_IMAGE })
  })
} else {
  log("info", "motor python-completo desligado", { mode: config.RUNNER_NATIVE_ENGINE })
}

server.listen(config.PORT, config.HOST, () => {
  log("info", "executor ouvindo", {
    port: config.PORT,
    concurrency: config.CONCURRENCY,
    maxQueue: config.MAX_QUEUE,
    maxQueueWaitMs: config.MAX_QUEUE_WAIT_MS,
    pyodide: pyodide !== undefined,
    nativo: native !== undefined,
    ...hostInfo(),
    memoryBudgetMb: budget.isLimited ? budget.limitMb : "ilimitado",
    memoryReserveMb: config.RUNNER_MEMORY_RESERVE_MB,
    batchMemoryMb,
  })
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    log("info", "encerrando", { signal })
    server.close(() => {
      void Promise.allSettled([pyodide?.shutdown(), native?.shutdown()]).finally(() => process.exit(0))
    })
    setTimeout(() => process.exit(0), SHUTDOWN_GRACE_MS).unref()
  })
}
