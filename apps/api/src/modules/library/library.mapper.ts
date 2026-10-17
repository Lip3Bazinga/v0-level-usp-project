import type { LibraryCatalog, LibraryRequest } from "@levelusp/contracts"
import type { LibraryCatalogRow, LibraryRequestRow } from "@levelusp/db"

const UNKNOWN_REQUESTER = "Desconhecido"

export function toLibraryCatalog(library: LibraryCatalogRow): LibraryCatalog {
  return {
    id: library.id,
    name: library.name,
    display_name: library.displayName,
    description: library.description,
    category: library.category,
    pyodide_native: library.pyodideNative,
    active: library.active,
    added_by: library.addedBy,
    created_at: library.createdAt,
  }
}

/** `requesterName` só na visão do admin; `null` (perfil apagado) aparece como "Desconhecido". */
export function toLibraryRequest(request: LibraryRequestRow, requesterName?: string | null): LibraryRequest {
  return {
    id: request.id,
    requested_by: request.requestedBy,
    library_name: request.libraryName,
    display_name: request.displayName,
    description: request.description,
    use_case: request.useCase,
    status: request.status,
    reviewed_by: request.reviewedBy,
    review_notes: request.reviewNotes,
    created_at: request.createdAt,
    reviewed_at: request.reviewedAt,
    ...(requesterName !== undefined ? { requester_name: requesterName ?? UNKNOWN_REQUESTER } : {}),
  }
}
