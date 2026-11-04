import type { Lesson, ProjectFile } from "@levelusp/contracts"
import { MAIN_FILE_PATH } from "@/lib/constants"

/** Resultado de uma operação de arquivo que não produz nova lista. */
export type FileOperationResult = { ok: true } | { ok: false; error: string }

/** Resultado de uma operação que, se aprovada, produz a nova lista de arquivos. */
export type FilesChange = { ok: true; files: ProjectFile[] } | { ok: false; error: string }

/** Extensões aceitas; `.gitkeep` marca uma pasta vazia. */
const VALID_PATH_PATTERN = /^[\w\-./]+(\.py|\.txt|\.json|\.csv|\.md|\.gitkeep)$/

/** Remove espaços nas pontas, barras iniciais e barras repetidas. */
export function normalizePath(path: string): string {
  return path.trim().replace(/^\/+/, "").replace(/\/+/g, "/")
}

/** Caminho aceito no projeto: relativo, sem "..", com extensão permitida. */
export function isValidPath(path: string): boolean {
  const normalized = normalizePath(path)
  if (!normalized || normalized.endsWith("/")) return false
  if (!VALID_PATH_PATTERN.test(normalized)) return false
  return !normalized.includes("..")
}

function isProjectFile(value: unknown): value is ProjectFile {
  if (typeof value !== "object" || value === null) return false
  return "path" in value && typeof value.path === "string" && "content" in value && typeof value.content === "string"
}

/**
 * Interpreta snapshots e arquivos iniciais de forma tolerante: aceita ProjectFile[],
 * string JSON ou código legado (string simples, que vira main.py). Conteúdo antigo
 * importado do Supabase chega em qualquer um desses formatos.
 */
export function parseProjectFiles(raw: unknown, fallback: ProjectFile[] = []): ProjectFile[] {
  if (Array.isArray(raw)) {
    const validFiles = raw.filter(isProjectFile)
    return validFiles.length ? validFiles : fallback
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return parseProjectFiles(JSON.parse(raw), fallback)
    } catch {
      return [{ path: MAIN_FILE_PATH, content: raw }]
    }
  }
  return fallback
}

/** Arquivos iniciais da lição: os do professor ou, sem eles, `starter_code` em main.py. */
export function resolveStarterFiles(lesson: Pick<Lesson, "starter_files" | "starter_code">): ProjectFile[] {
  const seeded = parseProjectFiles(lesson.starter_files)
  if (seeded.length) return seeded
  return [{ path: MAIN_FILE_PATH, content: lesson.starter_code }]
}

/** Se o projeto tem um arquivo com esse caminho exato. */
export function hasFile(files: readonly ProjectFile[], path: string): boolean {
  return files.some((file) => file.path === path)
}

/** Troca o conteúdo de um arquivo (os demais ficam iguais). */
export function updateFileContent(files: readonly ProjectFile[], path: string, content: string): ProjectFile[] {
  return files.map((file) => (file.path === path ? { ...file, content } : file))
}

/** Cria um arquivo vazio; recusa caminho inválido ou repetido. */
export function addFile(files: readonly ProjectFile[], rawPath: string): FilesChange {
  const path = normalizePath(rawPath)
  if (!isValidPath(path)) {
    return { ok: false, error: "Nome inválido. Use apenas letras, números, e extensões .py .txt .json .csv .md" }
  }
  if (hasFile(files, path)) return { ok: false, error: "Já existe um arquivo com esse nome." }
  return { ok: true, files: [...files, { path, content: "" }] }
}

/** Pastas são implícitas nos caminhos: um caminho sem extensão é tratado como pasta. */
export function isFolderPath(path: string): boolean {
  return !path.includes(".")
}

/** Aplica a renomeação de `oldPath` (arquivo ou pasta) a um caminho qualquer. */
export function renamePath(path: string, oldPath: string, newPath: string): string {
  if (isFolderPath(oldPath)) {
    const folderPrefix = `${oldPath}/`
    return path.startsWith(folderPrefix) ? newPath + path.slice(oldPath.length) : path
  }
  return path === oldPath ? newPath : path
}

/** Renomeia um arquivo ou uma pasta (com tudo dentro); o main.py não pode ser renomeado. */
export function renameEntry(files: readonly ProjectFile[], oldPath: string, rawNewPath: string): FilesChange {
  if (oldPath === MAIN_FILE_PATH) return { ok: false, error: "main.py não pode ser renomeado." }
  const newPath = normalizePath(rawNewPath)
  if (!isFolderPath(oldPath)) {
    if (!isValidPath(newPath)) return { ok: false, error: "Nome inválido." }
    if (hasFile(files, newPath)) return { ok: false, error: "Já existe um arquivo com esse nome." }
  }
  return { ok: true, files: files.map((file) => ({ ...file, path: renamePath(file.path, oldPath, newPath) })) }
}

/** Remove um arquivo; o main.py não pode ser removido. */
export function removeFile(files: readonly ProjectFile[], path: string): FilesChange {
  if (path === MAIN_FILE_PATH) return { ok: false, error: "main.py não pode ser excluído." }
  return { ok: true, files: files.filter((file) => file.path !== path) }
}

/** Arquivo a abrir quando um snapshot é carregado: main.py, se existir, ou o primeiro. */
export function pickEntryFile(files: readonly ProjectFile[]): string {
  if (hasFile(files, MAIN_FILE_PATH)) return MAIN_FILE_PATH
  return files[0]?.path ?? MAIN_FILE_PATH
}
