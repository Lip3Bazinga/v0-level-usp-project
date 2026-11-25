/**
 * Configuração do executor registrada em cada rodada de medição, lida de `GET /healthz` e
 * `GET /v1/stats`: política do Pyodide, pool aquecido, capacidade e memória reservada.
 */
import type { RunnerClient, RunnerStats } from "./runner.mts"

/** Perfil Pyodide (o motor `python` WASI não tem perfil). */
export type PerfilPyodide = "dados" | "ml"

/** Memória reservada do executor (`/v1/stats` → `memory`); cada campo é `null` quando ausente. */
export interface MemoriaExecutor {
  limitMb: number | null
  usedMb: number | null
  peakUsedMb: number | null
  blocked: number | boolean | null
}

/** Configuração do executor no instante da leitura. */
export interface ConfigExecutor {
  /** Política do Pyodide como o executor informa: texto único ou objeto por perfil; `null` se não informa. */
  politica_pyodide: string | Record<string, unknown> | null
  /**
   * Workers Pyodide OCIOSOS (prontos) no instante da leitura, por perfil, como `/healthz` →
   * `pyodide.warm` informa (a contagem de `this.idle`). Não é o alvo configurado
   * (`RUNNER_PYODIDE_WARM`), que o executor não expõe.
   */
  pool_ocioso_no_instante: Record<PerfilPyodide, number | null>
  capacity: number | null
  fila_maxima: number | null
  memory: MemoriaExecutor | null
}

/** Número finito de um valor desconhecido; qualquer outra coisa (texto, ausente, NaN) vira `null`. */
function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/**
 * Extrai a configuração do corpo de `/healthz` e do `/v1/stats` (qualquer um pode faltar).
 * `memory` ausente no stats (executor antigo) vira `null`; campos ausentes dentro dele viram `null`.
 */
export function parseExecutorConfig(health: Record<string, unknown> | null, stats: RunnerStats | null): ConfigExecutor {
  const pyodide = (health?.pyodide ?? null) as Record<string, unknown> | null
  const policy = pyodide?.policy
  const warm = (pyodide?.warm ?? null) as Record<string, unknown> | null
  const memory = stats?.memory
  const blocked = memory?.blocked
  return {
    politica_pyodide: typeof policy === "string" ? policy : typeof policy === "object" && policy !== null ? (policy as Record<string, unknown>) : null,
    pool_ocioso_no_instante: { dados: asNumber(warm?.dados), ml: asNumber(warm?.ml) },
    capacity: stats?.capacity ?? null,
    fila_maxima: stats?.maxQueue ?? null,
    memory: memory
      ? { limitMb: asNumber(memory.limitMb), usedMb: asNumber(memory.usedMb), peakUsedMb: asNumber(memory.peakUsedMb), blocked: typeof blocked === "number" || typeof blocked === "boolean" ? blocked : null }
      : null,
  }
}

/** Lê `/healthz` e `/v1/stats` agora e devolve a configuração. */
export async function readExecutorConfig(runner: RunnerClient): Promise<ConfigExecutor> {
  const health = await runner.health()
  return parseExecutorConfig(health.body, await runner.stats())
}

/**
 * Política do Pyodide que vale para um perfil (`fresh`, `reuse`…); `null` para o motor WASI
 * (`perfil` nulo) e quando o executor não informa. Aceita a política única ou `{dados, ml}`.
 */
export function politicaDoPerfil(config: ConfigExecutor, perfil: PerfilPyodide | null): string | null {
  if (perfil === null) return null
  const policy = config.politica_pyodide
  if (typeof policy === "string") return policy
  if (policy === null) return null
  const value = policy[perfil]
  return typeof value === "string" ? value : null
}

/** Memória reservada (MiB) lida agora de um `/v1/stats`; `null` quando o executor não informa. */
export function memoriaUsadaMb(stats: RunnerStats | null): number | null {
  return asNumber(stats?.memory?.usedMb)
}
