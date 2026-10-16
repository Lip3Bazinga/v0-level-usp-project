export type LibraryCategory =
  | "data-science"
  | "ml"
  | "deep-learning"
  | "visualization"
  | "math"
  | "general"

export interface LibraryCatalog {
  id: string
  name: string           // pip/pyodide package name
  display_name: string
  description: string | null
  category: LibraryCategory
  pyodide_native: boolean
  active: boolean
  added_by: string | null
  created_at: string
}

export interface LibraryRequest {
  id: string
  requested_by: string
  library_name: string
  display_name: string | null
  description: string | null
  use_case: string | null
  status: "pending" | "approved" | "rejected"
  reviewed_by: string | null
  review_notes: string | null
  created_at: string
  reviewed_at: string | null
  // joins
  requester_name?: string
}
