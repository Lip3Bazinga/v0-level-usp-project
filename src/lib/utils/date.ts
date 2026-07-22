/** Fuso usado para "dia" na plataforma (streak, metas diárias, mapa de atividade). */
export const PLATFORM_TIMEZONE = "America/Sao_Paulo"

/**
 * Chave de dia no formato YYYY-MM-DD no fuso da plataforma.
 * Usar sempre isto para comparar "dias" — não `toISOString()`, que é UTC.
 */
export function localDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: PLATFORM_TIMEZONE })
}

/** Chave do dia de hoje (YYYY-MM-DD) no fuso da plataforma. */
export function todayKey(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: PLATFORM_TIMEZONE })
}
