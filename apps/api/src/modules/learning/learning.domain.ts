import { DEFAULT_ENTRY_FILE, type ProjectFile } from "@levelusp/contracts"

function isProjectFile(value: unknown): value is ProjectFile {
  return (
    typeof value === "object" && value !== null &&
    "path" in value && typeof value.path === "string" &&
    "content" in value && typeof value.content === "string"
  )
}

/** Snapshot salvo como JSON de ProjectFile[] (ou string de código legado). */
export function parseSnapshot(raw: string | null): ProjectFile[] | null {
  if (!raw?.trim()) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return [{ path: DEFAULT_ENTRY_FILE, content: raw }]
  }
  if (!Array.isArray(parsed)) return null
  const files = parsed.filter(isProjectFile)
  return files.length ? files : null
}

export function hasEntryFile(files: readonly ProjectFile[]): boolean {
  return files.some((file) => file.path === DEFAULT_ENTRY_FILE)
}
