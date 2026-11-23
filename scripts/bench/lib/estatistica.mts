/** Percentis, arredondamento e leitura/escrita de CSV (sem dependências). */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

/**
 * Percentil pelo método do posto mais próximo (nearest-rank): o menor valor tal que `p`% das
 * amostras são menores ou iguais a ele. Com poucas amostras o p99 coincide com o máximo
 * (com 30 repetições, p95 = 29º valor e p99 = 30º).
 *
 * @param percent de 0 a 100.
 * @returns `null` quando não há amostras.
 */
export function percentile(values: readonly number[], percent: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.max(1, Math.ceil((percent / 100) * sorted.length))
  return sorted[Math.min(rank, sorted.length) - 1] ?? null
}

/** Resumo p50/p95/p99 de uma série. */
export interface Summary {
  n: number
  min: number | null
  mean: number | null
  p50: number | null
  p95: number | null
  p99: number | null
  max: number | null
}

/** Resumo estatístico de `values` (campos `null` quando a série é vazia). */
export function summarize(values: readonly number[]): Summary {
  const mean = values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length
  return {
    n: values.length,
    min: values.length === 0 ? null : Math.min(...values),
    mean,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
    max: values.length === 0 ? null : Math.max(...values),
  }
}

/** Arredonda para `digits` casas (padrão 1); `null`/`undefined` viram `null`. */
export function round(value: number | null | undefined, digits = 1): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** Um campo de CSV: vazio para `null`/`undefined`; aspas só quando necessário. */
export function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** Uma linha de CSV (sem o fim de linha). */
export function csvLine(values: readonly (string | number | boolean | null | undefined)[]): string {
  return values.map(csvField).join(",")
}

/** Cria (ou zera) o arquivo com o cabeçalho; cria as pastas que faltam. */
export function startCsv(file: string, header: readonly string[]): void {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `${csvLine(header)}\n`, "utf8")
}

/** Cria o arquivo com o cabeçalho só se ele ainda não existe. */
export function ensureCsv(file: string, header: readonly string[]): void {
  if (!existsSync(file)) startCsv(file, header)
}

/** Acrescenta linhas a um CSV já iniciado. */
export function appendCsv(file: string, rows: readonly (readonly (string | number | boolean | null | undefined)[])[]): void {
  if (rows.length === 0) return
  appendFileSync(file, `${rows.map(csvLine).join("\n")}\n`, "utf8")
}

/** Lê um CSV produzido por estes scripts (aspas duplas e vírgulas dentro de campos entre aspas). */
export function readCsv(file: string): Record<string, string>[] {
  const text = readFileSync(file, "utf8").replace(/^﻿/, "")
  const records: string[][] = []
  let field = ""
  let record: string[] = []
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index] ?? ""
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ",") {
      record.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++
      record.push(field)
      field = ""
      if (record.some((value) => value !== "")) records.push(record)
      record = []
    } else {
      field += char
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field)
    records.push(record)
  }
  const [header = [], ...body] = records
  return body.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])))
}

/** Número de uma célula de CSV; vazio ou inválido vira `null`. */
export function cellNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Agrupa `items` pela chave devolvida por `key`, mantendo a ordem de chegada. */
export function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const name = key(item)
    const group = groups.get(name)
    if (group) group.push(item)
    else groups.set(name, [item])
  }
  return groups
}

/** Texto de uma tabela alinhada para o terminal. */
export function formatTable(header: readonly string[], rows: readonly (readonly (string | number | null)[])[]): string {
  const cells = [header, ...rows.map((row) => row.map((cell) => (cell === null ? "-" : String(cell))))]
  const widths = header.map((_, column) => Math.max(...cells.map((row) => (row[column] ?? "").length)))
  return cells.map((row) => row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join("  ").trimEnd()).join("\n")
}
