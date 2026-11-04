/** Código SQLSTATE de violação de unicidade. */
const UNIQUE_VIOLATION = "23505"

function hasSqlState(error: unknown, sqlState: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === sqlState
}

/** O Drizzle embrulha o erro do driver em `cause`; olha os dois níveis. */
export function isUniqueViolation(error: unknown): boolean {
  if (hasSqlState(error, UNIQUE_VIOLATION)) return true
  return typeof error === "object" && error !== null && "cause" in error && hasSqlState(error.cause, UNIQUE_VIOLATION)
}
