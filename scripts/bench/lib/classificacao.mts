/**
 * Classificação quente/frio dos envios ao Pyodide na política `reuse`, feita DEPOIS do envio pelo que
 * aconteceu no executor: na `reuse` o worker pode estar em restauração (ocioso = 0) e ainda assim
 * atender em dezenas de ms, então o pool ocioso observado ANTES não diz se houve aquecimento.
 */
import type { RunnerClient, RunnerStats } from "./runner.mts"
import { sleep } from "./sistema.mts"

/** Condição de uma execução. */
export type CondicaoEnvio = "quente" | "frio_pool" | "frio_processo"

/** Workers Pyodide criados desde a subida do executor (`engines.pyodide.booted`); `null` se não informado. */
export function bootedCount(stats: RunnerStats | null): number | null {
  const booted = stats?.engines.pyodide?.booted
  return typeof booted === "number" && Number.isFinite(booted) ? booted : null
}

/** Mapa perfil → contagem de `engines.pyodide[campo]` (`warm`, `live`), como texto estável para comparar leituras. */
function perfilCounts(stats: RunnerStats, field: "warm" | "live"): string {
  const value = stats.engines.pyodide?.[field]
  return typeof value === "object" && value !== null ? JSON.stringify(Object.entries(value as Record<string, unknown>).sort()) : ""
}

/**
 * As duas leituras mostram o pool parado: `booted` igual e, quando existem, `warm` e `live` iguais
 * (nenhum worker nascendo ou sendo despejado entre elas).
 */
export function poolEstavel(anterior: RunnerStats, atual: RunnerStats): boolean {
  return bootedCount(anterior) === bootedCount(atual) && perfilCounts(anterior, "warm") === perfilCounts(atual, "warm") && perfilCounts(anterior, "live") === perfilCounts(atual, "live")
}

/**
 * Condição de um envio na política `reuse`: houve worker criado durante o envio (`booted` subiu) =
 * `frio_pool`; senão `quente`. `frio_processo` (primeiro envio depois do reinício) não muda.
 * @returns a condição e o delta de `booted` (`null` se alguma leitura não informa `booted`).
 */
export function condicaoPorBoot(pretendida: CondicaoEnvio, antes: RunnerStats | null, depois: RunnerStats | null): { condicao: CondicaoEnvio; delta: number | null } {
  const a = bootedCount(antes)
  const d = bootedCount(depois)
  const delta = a === null || d === null ? null : d - a
  if (pretendida === "frio_processo") return { condicao: pretendida, delta }
  if (delta === null) throw new Error("o executor não informa engines.pyodide.booted em /v1/stats: não dá para classificar quente/frio na política reuse")
  return { condicao: delta > 0 ? "frio_pool" : "quente", delta }
}

/**
 * Espera o pool Pyodide estabilizar (duas leituras seguidas de `/v1/stats` iguais em `booted`, `warm` e `live`)
 * e devolve a última leitura, para o aquecimento especulativo de outro perfil não contaminar o delta de `booted`.
 *
 * @throws Error se `/v1/stats` não responde ou o pool não estabiliza em `timeoutMs`.
 */
export async function aguardarPoolEstavel(runner: RunnerClient, timeoutMs: number, intervaloMs = 300): Promise<RunnerStats> {
  const deadline = Date.now() + timeoutMs
  let anterior = await runner.stats()
  if (anterior === null) throw new Error("/v1/stats indisponível: a política reuse exige as estatísticas do executor para classificar quente/frio (confira o RUNNER_TOKEN e a versão do executor)")
  while (Date.now() < deadline) {
    await sleep(intervaloMs)
    const atual = await runner.stats()
    if (atual === null) throw new Error("/v1/stats deixou de responder durante a espera do pool")
    if (poolEstavel(anterior, atual)) return atual
    anterior = atual
  }
  throw new Error(`o pool Pyodide não estabilizou em ${Math.round(timeoutMs / 1000)} s (workers ainda sendo criados)`)
}
