/** Código SQLSTATE de violação de unicidade. */
const UNIQUE_VIOLATION = "23505"

/** O Drizzle embrulha o erro do driver em `cause`; olha os dois níveis. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null
  return e?.code === UNIQUE_VIOLATION || e?.cause?.code === UNIQUE_VIOLATION
}
