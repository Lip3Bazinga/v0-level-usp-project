import { downloadText } from "./download"

function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

/** Serializa linhas homogêneas em CSV; o cabeçalho vem das chaves da primeira linha. */
export function toCsv<TRow extends Record<string, unknown>>(rows: readonly TRow[]): string {
  const [firstRow] = rows
  if (!firstRow) return ""
  const headers = Object.keys(firstRow)
  const lines = rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","))
  return [headers.join(","), ...lines].join("\n")
}

/** Gera o CSV e dispara o download no navegador. Não faz nada com lista vazia. */
export function downloadCsv<TRow extends Record<string, unknown>>(rows: readonly TRow[], filename: string): void {
  if (rows.length === 0) return
  downloadText(toCsv(rows), filename, "text/csv;charset=utf-8")
}
