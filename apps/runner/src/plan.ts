import type { Probe } from "@levelusp/contracts"

/**
 * Agrupa sondas em lotes, cada lote = uma instância WASI nova.
 *
 * - `ast` roda numa instância só de análise: o código do aluno nunca executa nela, então
 *   ele não consegue interferir na análise estrutural (ex.: forjar "usa lambda"). Todas as
 *   sondas `ast` do job dividem essa instância: nenhuma executa código e a análise
 *   (de todos os arquivos do projeto) não depende da sonda, então uma instância por regra
 *   só somaria partidas do CPython (~120 ms cada).
 * - `unittest` roda uma por instância: a suíte do aluno não pode carregar estado
 *   de uma implementação para a outra (ex.: "só a primeira passa") — ela precisa
 *   distinguir a referência dos mutantes pelo comportamento.
 * - `legacy` roda em lote próprio: testes antigos dividem o interpretador com o
 *   aluno (correção fraca) e não devem contaminar as demais observações.
 * - As demais (run/call/globals/expr) compartilham uma instância, cada uma com
 *   namespace, módulos e arquivos restaurados — custo de partida de 1 instância.
 */
export function planBatches(probes: Probe[]): Probe[][] {
  const executionProbes = probes.filter((probe) => probe.kind !== "legacy" && probe.kind !== "ast" && probe.kind !== "unittest")
  const legacyProbes = probes.filter((probe) => probe.kind === "legacy")
  const astProbes = probes.filter((probe) => probe.kind === "ast")
  const batches: Probe[][] = []
  if (executionProbes.length) batches.push(executionProbes)
  if (legacyProbes.length) batches.push(legacyProbes)
  if (astProbes.length) batches.push(astProbes)
  for (const probe of probes) {
    if (probe.kind === "unittest") batches.push([probe])
  }
  return batches
}
