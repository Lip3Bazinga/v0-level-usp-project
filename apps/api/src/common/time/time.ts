export const MS_PER_SECOND = 1_000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR = 60 * MS_PER_MINUTE
export const MS_PER_DAY = 24 * MS_PER_HOUR

/** Fuso de referência da plataforma: "hoje", sequências e séries diárias. */
export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo"

const saoPauloDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: SAO_PAULO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Data civil (yyyy-mm-dd) no fuso de São Paulo. */
export function saoPauloDate(now: Date = new Date()): string {
  return saoPauloDateFormat.format(now)
}

/** Dia civil anterior a `isoDate` (yyyy-mm-dd), sem depender do fuso do servidor. */
export function previousDate(isoDate: string): string {
  const noonUtc = new Date(`${isoDate}T12:00:00Z`)
  noonUtc.setUTCDate(noonUtc.getUTCDate() - 1)
  return noonUtc.toISOString().slice(0, 10)
}

/** Timestamps do Postgres ("2026-10-16 12:00:00+00") → ISO 8601. */
export function toIsoTimestamp(value: string): string {
  return new Date(value).toISOString()
}

/** Instante `durationMs` depois de `from`, em ISO 8601. */
export function isoAfter(durationMs: number, from: number = Date.now()): string {
  return new Date(from + durationMs).toISOString()
}
