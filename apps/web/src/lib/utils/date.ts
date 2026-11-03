/** Fuso que define o "dia" na plataforma (sequência, metas diárias, mapa de atividade). */
export const PLATFORM_TIMEZONE = "America/Sao_Paulo"

/**
 * Chave YYYY-MM-DD no fuso da plataforma. Comparar dias sempre por aqui:
 * `toISOString()` usa UTC e erra o dia à noite no Brasil.
 */
export function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString("sv-SE", { timeZone: PLATFORM_TIMEZONE })
}

/** Chave `yyyy-mm-dd` de hoje no fuso da plataforma. */
export function todayKey(): string {
  return localDateKey(new Date())
}
