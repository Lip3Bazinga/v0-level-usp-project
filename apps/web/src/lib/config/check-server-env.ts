import { ServerEnvError, validateServerEnv } from "./server-env"
import type { RuntimeEnv } from "./server-urls"

const EXIT_INVALID_CONFIG = 1
const BUILD_PHASE = "phase-production-build"

/** Valida as variáveis de execução; com erro, explica em português e encerra o servidor. */
export function checkServerEnvOrExit(env: RuntimeEnv): void {
  if (env.NEXT_PHASE === BUILD_PHASE) return
  try {
    validateServerEnv(env)
  } catch (error) {
    if (!(error instanceof ServerEnvError)) throw error
    process.stderr.write(`${error.message}\nVeja infra/env/vm.env.example e docs/v2/producao-vm.md.\n`)
    process.exit(EXIT_INVALID_CONFIG)
  }
}
