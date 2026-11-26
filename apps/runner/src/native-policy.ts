/**
 * Política de isolamento do motor `python-completo` (CPython nativo em contêiner Docker).
 * O código do aluno roda com o kernel de espaço de usuário do gVisor (`runsc`); o `runc`
 * divide o kernel da máquina com o aluno e só é aceito, explicitamente, em desenvolvimento.
 */

/** Valores de `RUNNER_NATIVE_ENGINE`: desligado (padrão) ou contêineres gVisor. */
export const NATIVE_ENGINE_MODES = ["off", "gvisor"] as const
/** Modo do motor nativo. */
export type NativeEngineMode = (typeof NATIVE_ENGINE_MODES)[number]

/** Runtime OCI do gVisor: o único aceito fora de desenvolvimento. */
export const SECURE_RUNTIME = "runsc"
/** Runtime padrão do Docker (mesmo kernel da máquina): só com a liberação explícita de desenvolvimento. */
export const INSECURE_RUNTIME = "runc"
/** Runtime OCI com que os contêineres do motor sobem. */
export type NativeRuntime = typeof SECURE_RUNTIME | typeof INSECURE_RUNTIME

/** O que a decisão precisa saber: os runtimes do Docker e as duas travas do modo inseguro. */
export interface NativeRuntimeInput {
  /** Runtimes registrados no Docker (`docker info`). */
  availableRuntimes: readonly string[]
  /** `RUNNER_ALLOW_INSECURE_NATIVE`. */
  allowInsecure: boolean
  /** `NODE_ENV` cru do processo (`""` quando ausente: ausente não é desenvolvimento). */
  nodeEnv: string
}

/** Resultado de {@link decideNativeRuntime}: o runtime a usar, ou o motivo de o motor não subir. */
export type NativeRuntimeDecision = { ok: true; runtime: NativeRuntime; insecure: boolean } | { ok: false; reason: string }

/**
 * Decide com que runtime o motor sobe:
 * - há `runsc` → `runsc`, sempre (as travas do modo inseguro são ignoradas);
 * - não há `runsc` → `runc` só com `RUNNER_ALLOW_INSECURE_NATIVE=1` E `NODE_ENV=development`;
 * - qualquer outro caso → o motor não sobe (o runtime `python-completo` responde 501).
 *
 * Nunca devolve `runc` com `NODE_ENV=production`, qualquer que seja a configuração.
 */
export function decideNativeRuntime({ availableRuntimes, allowInsecure, nodeEnv }: NativeRuntimeInput): NativeRuntimeDecision {
  if (availableRuntimes.includes(SECURE_RUNTIME)) return { ok: true, runtime: SECURE_RUNTIME, insecure: false }
  if (!allowInsecure) return { ok: false, reason: `o Docker não tem o runtime ${SECURE_RUNTIME} (gVisor) instalado` }
  if (nodeEnv !== "development") {
    return { ok: false, reason: `sem ${SECURE_RUNTIME}, RUNNER_ALLOW_INSECURE_NATIVE só vale com NODE_ENV=development (atual: ${nodeEnv === "" ? "ausente" : nodeEnv})` }
  }
  if (!availableRuntimes.includes(INSECURE_RUNTIME)) return { ok: false, reason: `o Docker não tem ${SECURE_RUNTIME} nem ${INSECURE_RUNTIME}` }
  return { ok: true, runtime: INSECURE_RUNTIME, insecure: true }
}

/** Modelo de `docker info --format` que imprime um runtime por linha. */
export const DOCKER_RUNTIMES_FORMAT = '{{range $name, $_ := .Runtimes}}{{$name}}{{"\\n"}}{{end}}'

/** Lê a saída de `docker info --format DOCKER_RUNTIMES_FORMAT`: um nome de runtime por linha. */
export function parseDockerRuntimes(output: string): string[] {
  return output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "")
}
