import type { Probe } from "@levelusp/contracts"

/**
 * Agrupa sondas em lotes, cada lote = uma instância WASI nova.
 *
 * - `ast` roda sozinha: o código do aluno nunca executa nessa instância, então
 *   ele não consegue interferir na análise estrutural (ex.: forjar "usa lambda").
 * - `unittest` roda uma por instância: a suíte do aluno não pode carregar estado
 *   de uma implementação para a outra (ex.: "só a primeira passa") — ela precisa
 *   distinguir a referência dos mutantes pelo comportamento.
 * - `legacy` roda em lote próprio: testes antigos dividem o interpretador com o
 *   aluno (correção fraca) e não devem contaminar as demais observações.
 * - As demais (run/call/globals/expr) compartilham uma instância, cada uma com
 *   namespace, módulos e arquivos restaurados — custo de partida de 1 instância.
 */
export function planBatches(probes: Probe[]): Probe[][] {
  const isolatedKinds: ReadonlySet<Probe["kind"]> = new Set(["ast", "unittest"])
  const legacyProbes = probes.filter((probe) => probe.kind === "legacy")
  const executionProbes = probes.filter((probe) => probe.kind !== "legacy" && !isolatedKinds.has(probe.kind))
  const batches: Probe[][] = []
  if (executionProbes.length) batches.push(executionProbes)
  if (legacyProbes.length) batches.push(legacyProbes)
  for (const probe of probes) {
    if (isolatedKinds.has(probe.kind)) batches.push([probe])
  }
  return batches
}
