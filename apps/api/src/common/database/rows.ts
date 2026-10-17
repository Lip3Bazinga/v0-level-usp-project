/**
 * Primeira linha de um `insert ... returning()`. O Postgres sempre devolve a
 * linha inserida; a ausência indica bug (ex.: `onConflictDoNothing` esquecido).
 */
export function requireRow<T>(rows: readonly T[], table: string): T {
  const [row] = rows
  if (row === undefined) throw new Error(`a escrita em ${table} não devolveu a linha esperada`)
  return row
}
