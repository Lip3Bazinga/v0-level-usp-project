/**
 * Resumos recalculados a partir do CSV COMPLETO (latência e saturação da carga): uma rodada parcial
 * nunca produz um resumo só com o que foi medido agora.
 */
import { cellNumber, groupBy, round, summarize } from "./estatistica.mts"

/** Cabeçalho de `latencia-resumo.csv`. */
export const LATENCIA_RESUMO_HEADER = ["cenario", "via", "motor", "condicao", "politica_pyodide", "n", "total_p50_ms", "total_p95_ms", "total_p99_ms", "exec_p50_ms", "exec_p95_ms", "exec_p99_ms", "sobrecarga_p50_ms", "sobrecarga_p95_ms", "sobrecarga_p99_ms"] as const

/** Cabeçalho de `carga-saturacao.csv`. */
export const SATURACAO_HEADER = ["motor", "n_saturacao", "criterio", "limite_p95_ms", "limite_erro", "maior_n_sem_saturar", "regra_saturacao"] as const

type Linha = (string | number | null)[]

/** Coluna numérica de várias linhas, descartando as vazias. */
function numbers(rows: readonly Record<string, string>[], column: string): number[] {
  return rows.flatMap((row) => {
    const value = cellNumber(row[column])
    return value === null ? [] : [value]
  })
}

/**
 * p50/p95/p99 por cenário, condição e política do Pyodide a partir das linhas de `latencia.csv`
 * (só status 200). A ordem segue a primeira aparição no CSV.
 */
export function resumoLatencia(rows: readonly Record<string, string>[]): Linha[] {
  const ok = rows.filter((row) => row.status === "200")
  const result: Linha[] = []
  for (const group of groupBy(ok, (row) => [row.cenario, row.condicao, row.politica_pyodide].join("|")).values()) {
    const first = group[0]
    if (!first) continue
    const total = summarize(numbers(group, "total_ms"))
    const exec = summarize(numbers(group, "runner_exec_ms"))
    const over = summarize(numbers(group, "sobrecarga_ms"))
    result.push([first.cenario ?? "", first.via ?? "", first.motor ?? "", first.condicao ?? "", first.politica_pyodide ?? "", total.n, round(total.p50), round(total.p95), round(total.p99), round(exec.p50), round(exec.p95), round(exec.p99), round(over.p50), round(over.p95), round(over.p99)])
  }
  return result
}

/**
 * Saturação por motor a partir de TODAS as linhas de `carga.csv`: menor N saturado (com o motivo
 * gravado nessa linha) e maior N sem saturar. Os limites e a regra vêm da linha do menor N saturado
 * (ou da última linha do motor, quando nunca saturou).
 */
export function resumoSaturacao(rows: readonly Record<string, string>[]): Linha[] {
  const result: Linha[] = []
  for (const [motor, group] of groupBy(rows, (row) => row.motor ?? "")) {
    const ordered = [...group].sort((a, b) => (cellNumber(a.usuarios) ?? 0) - (cellNumber(b.usuarios) ?? 0))
    const saturated = ordered.find((row) => row.saturou === "true")
    const free = ordered.filter((row) => row.saturou === "false").map((row) => cellNumber(row.usuarios) ?? 0)
    const reference = saturated ?? ordered.at(-1)
    if (!reference) continue
    const maxN = Math.max(...ordered.map((row) => cellNumber(row.usuarios) ?? 0))
    result.push([
      motor,
      saturated ? cellNumber(saturated.usuarios) : null,
      saturated ? (saturated.motivo_saturacao ?? "") : `não saturou até N=${maxN}`,
      cellNumber(reference.limite_p95_ms),
      cellNumber(reference.limite_erro),
      free.length === 0 ? null : Math.max(...free),
      reference.regra_saturacao ?? "",
    ])
  }
  return result
}
