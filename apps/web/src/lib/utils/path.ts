/**
 * Normaliza um caminho de arquivo do projeto: remove espaços, barras iniciais
 * duplicadas e colapsa barras repetidas. Fonte única (antes vivia dentro do
 * ide-context).
 */
export function normalizePath(path: string): string {
  return path.trim().replace(/^\/+/, "").replace(/\/+/g, "/")
}

/**
 * Valida um caminho de arquivo do projeto multi-arquivo.
 * Aceita .py, .txt, .json, .csv, .md e .gitkeep (marcador de pasta vazia).
 */
export function isValidPath(path: string): boolean {
  const normalized = normalizePath(path)
  if (!normalized || normalized.endsWith("/")) return false
  if (!/^[\w\-./]+(\.py|\.txt|\.json|\.csv|\.md|\.gitkeep)$/.test(normalized)) return false
  if (normalized.includes("..")) return false
  return true
}
