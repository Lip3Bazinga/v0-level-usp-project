import type { ExperimentEvent } from "@levelusp/contracts"

/** Cabeçalho do CSV exportado (uma linha por evento). */
export const EVENTS_CSV_HEADER = "id,user_id,experiment_condition,type,created_at,payload"

/** Evento com o grupo do participante no momento da exportação. */
export interface ExportedEvent extends ExperimentEvent {
  experiment_condition: string | null
}

/** Caracteres que fazem a planilha interpretar a célula como fórmula (injeção de CSV). */
const FORMULA_PREFIX = /^[=+\-@\t\r]/

/**
 * Célula de CSV (RFC 4180): aspas quando há vírgula, aspas ou quebra de linha; valores que
 * começariam uma fórmula ganham um apóstrofo, para o Excel/Sheets não executá-los.
 */
export function csvCell(value: string | number | null): string {
  if (value === null) return ""
  const text = typeof value === "number" ? String(value) : value
  const safe = FORMULA_PREFIX.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/** CSV dos eventos, com cabeçalho; o `payload` vai como JSON numa célula. */
export function toEventsCsv(events: readonly ExportedEvent[]): string {
  const lines = events.map((event) =>
    [event.id, event.user_id, event.experiment_condition, event.type, event.created_at, JSON.stringify(event.payload)].map(csvCell).join(","),
  )
  return `${[EVENTS_CSV_HEADER, ...lines].join("\n")}\n`
}
