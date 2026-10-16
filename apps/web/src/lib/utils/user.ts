/**
 * Iniciais do nome (no máximo 2 letras) para avatares.
 * Fonte única — antes duplicado em 11 arquivos.
 */
export function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}
