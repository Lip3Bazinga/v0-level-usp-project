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
  const ast = probes.filter((p) => p.kind === "ast")
  const legacy = probes.filter((p) => p.kind === "legacy")
  const regular = probes.filter((p) => p.kind !== "ast" && p.kind !== "legacy")
  const batches: Probe[][] = []
  if (regular.length) batches.push(regular)
  if (legacy.length) batches.push(legacy)
  for (const p of ast) batches.push([p])
  return batches
}
