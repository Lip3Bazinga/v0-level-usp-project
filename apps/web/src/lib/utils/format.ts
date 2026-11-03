import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "@/lib/constants"

/** Toda formatação visível ao aluno usa o português do Brasil, independentemente do navegador. */
const LOCALE = "pt-BR"

type DateInput = string | Date

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

/** "1.234" */
export function formatNumber(value: number): string {
  return value.toLocaleString(LOCALE)
}

/** "1.234 XP" */
export function formatXp(value: number): string {
  return `${formatNumber(value)} XP`
}

/**
 * Porcentagem a partir de um valor já em 0–100: `formatPercent(87.4)` → "87%".
 * Com casas decimais usa vírgula: `formatPercent(12.34, 1)` → "12,3%".
 */
export function formatPercent(value: number, fractionDigits = 0): string {
  const formatted = value.toLocaleString(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
  return `${formatted}%`
}

const DATE_STYLES = {
  /** 05/03/2026 */
  short: {},
  /** 5 de março de 2026 */
  long: { day: "numeric", month: "long", year: "numeric" },
  /** março de 2026 */
  monthYear: { month: "long", year: "numeric" },
  /** quinta-feira, 5 de março de 2026 */
  weekdayLong: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  /** 05 de mar. */
  dayMonth: { day: "2-digit", month: "short" },
} satisfies Record<string, Intl.DateTimeFormatOptions>

/** Estilos de data aceitos por {@link formatDate}. */
export type DateStyle = keyof typeof DATE_STYLES

/** Data em pt-BR no estilo pedido. */
export function formatDate(value: DateInput, style: DateStyle = "short"): string {
  return toDate(value).toLocaleDateString(LOCALE, DATE_STYLES[style])
}

/** "05/03/2026, 14:32:10" */
export function formatDateTime(value: DateInput): string {
  return toDate(value).toLocaleString(LOCALE)
}

/** "14:32" */
export function formatTime(value: DateInput): string {
  return toDate(value).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" })
}

/**
 * Tempo decorrido curto: "há 5min", "há 3h", "há 2d".
 * `withNow` devolve "agora" abaixo de 1 minuto (sino de notificações); as telas
 * de administração mostram "há 0min".
 */
export function formatTimeAgo(value: DateInput, { withNow = false }: { withNow?: boolean } = {}): string {
  const elapsedMs = Date.now() - toDate(value).getTime()
  const minutes = Math.floor(elapsedMs / MS_PER_MINUTE)
  if (withNow && minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes}min`
  const hours = Math.floor(elapsedMs / MS_PER_HOUR)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(elapsedMs / MS_PER_DAY)}d`
}

/** Dia relativo para listas de notas: "Hoje, 14:32", "Ontem", "3 dias atrás" ou "05 de mar.". */
export function formatRelativeDay(value: DateInput): string {
  const date = toDate(value)
  const elapsedDays = Math.floor((Date.now() - date.getTime()) / MS_PER_DAY)
  if (elapsedDays === 0) return `Hoje, ${formatTime(date)}`
  if (elapsedDays === 1) return "Ontem"
  if (elapsedDays < 7) return `${elapsedDays} dias atrás`
  return formatDate(date, "dayMonth")
}

/** Texto puro de um HTML, com espaços colapsados e reticências após `maxLength` caracteres. */
export function truncatePlainText(html: string, maxLength = 80): string {
  const plainText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return plainText.length > maxLength ? `${plainText.slice(0, maxLength)}…` : plainText
}
