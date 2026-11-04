import { downloadText } from "./download"

/**
 * Planilhas (Excel, LibreOffice, Google Sheets) executam como fórmula a célula que começa
 * com = + - @ TAB ou CR — mesmo entre aspas. Nome, e-mail e alvo de auditoria vêm de
 * usuários: `=HYPERLINK("https://evil", "clique")` viraria link/fórmula no computador do admin.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/

function neutralizeFormula(value: unknown): string {
  const text = String(value ?? "")
  return typeof value === "string" && FORMULA_TRIGGER.test(text) ? `'${text}` : text
}

function escapeCsvCell(value: unknown): string {
  return `"${neutralizeFormula(value).replace(/"/g, '""')}"`
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
