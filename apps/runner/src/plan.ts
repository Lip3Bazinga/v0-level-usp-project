import type { Probe } from "@levelusp/contracts"

/**
 * Agrupa sondas em lotes, cada lote = uma instância WASI nova.
 *
 * - `ast` roda sozinha: o código do aluno nunca executa nessa instância, então
 *   ele não consegue interferir na análise estrutural (ex.: forjar "usa lambda").
 * - `legacy` roda em lote próprio: testes antigos dividem o interpretador com o
 *   aluno (correção fraca) e não devem contaminar as demais observações.
 * - As demais (run/call/globals) compartilham uma instância, cada uma com
 *   namespace novo — reduz o custo de partida de N instâncias para 1.
 */
export function planBatches(probes: Probe[]): Probe[][] {
  const astProbes = probes.filter((probe) => probe.kind === "ast")
  const legacyProbes = probes.filter((probe) => probe.kind === "legacy")
  const executionProbes = probes.filter((probe) => probe.kind !== "ast" && probe.kind !== "legacy")
  const batches: Probe[][] = []
  if (executionProbes.length) batches.push(executionProbes)
  if (legacyProbes.length) batches.push(legacyProbes)
  for (const probe of astProbes) batches.push([probe])
  return batches
}
