import { z } from "zod"

export const LIBRARY_CATEGORIES = ["data-science", "ml", "deep-learning", "visualization", "math", "general"] as const
export const libraryCategorySchema = z.enum(LIBRARY_CATEGORIES)
/** Categoria do catálogo de bibliotecas Python. */
export type LibraryCategory = z.infer<typeof libraryCategorySchema>

export const LIBRARY_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const
/** Situação de um pedido de biblioteca. */
export type LibraryRequestStatus = (typeof LIBRARY_REQUEST_STATUSES)[number]

/** Biblioteca liberada para as lições. `pyodide_native`: já vem no Pyodide (não precisa de micropip). */
export interface LibraryCatalog {
  id: string
  name: string
  display_name: string
  description: string | null
  category: LibraryCategory
  pyodide_native: boolean
  active: boolean
  added_by: string | null
  created_at: string
}

/** Pedido de um professor para liberar uma biblioteca. `requester_name` só vem na listagem do admin. */
export interface LibraryRequest {
  id: string
  requested_by: string
  library_name: string
  display_name: string | null
  description: string | null
  use_case: string | null
  status: LibraryRequestStatus
  reviewed_by: string | null
  review_notes: string | null
  created_at: string
  reviewed_at: string | null
  requester_name?: string
}

export const libraryRequestInputSchema = z.object({
  library_name: z.string().trim().regex(/^[A-Za-z0-9_.\-]{1,80}$/, "Nome de pacote inválido"),
  display_name: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  use_case: z.string().trim().max(2000).optional(),
})
/** Corpo de `POST /library/requests`; `library_name` é o nome do pacote no PyPI. */
export type LibraryRequestInput = z.infer<typeof libraryRequestInputSchema>

export const reviewLibraryRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  review_notes: z.string().trim().max(1000).optional(),
  /** Quando aprovado, adiciona ao catálogo com estes dados. */
  catalog: z
    .object({
      display_name: z.string().trim().min(1).max(120),
      description: z.string().trim().max(1000).nullable().optional(),
      category: libraryCategorySchema.default("general"),
      pyodide_native: z.boolean().default(false),
    })
    .optional(),
})
/** Corpo de `POST /admin/library/requests/:id/review`; ao aprovar, `catalog` define a entrada criada. */
export type ReviewLibraryRequestInput = z.infer<typeof reviewLibraryRequestSchema>

export const libraryCatalogToggleSchema = z.object({ active: z.boolean() })
/** Corpo de `PATCH /admin/library/:id`. */
export type LibraryCatalogToggleInput = z.infer<typeof libraryCatalogToggleSchema>
