import { createClient } from "@/lib/supabase/client"
import { createServerClient } from "@/lib/supabase/server"
import type { LibraryCatalog, LibraryRequest } from "@/lib/supabase/types"

// ── Catálogo (leitura pública) ────────────────────────────────────────────────

export async function fetchLibraryCatalog(): Promise<LibraryCatalog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("library_catalog" as never)
    .select("*")
    .eq("active", true)
    .order("category")
    .order("display_name")
  if (error) throw error
  return (data ?? []) as LibraryCatalog[]
}

export async function fetchLibraryCatalogServer(): Promise<LibraryCatalog[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("library_catalog" as never)
    .select("*")
    .eq("active", true)
    .order("category")
    .order("display_name")
  if (error) throw error
  return (data ?? []) as LibraryCatalog[]
}

// ── Requisições (professor → admin) ──────────────────────────────────────────

export async function createLibraryRequest(
  requestedBy: string,
  data: { library_name: string; display_name?: string; description?: string; use_case?: string }
): Promise<LibraryRequest> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from("library_requests" as never)
    .insert({ requested_by: requestedBy, ...data } as never)
    .select()
    .single()
  if (error) throw error
  return created as LibraryRequest
}

export async function fetchMyLibraryRequests(userId: string): Promise<LibraryRequest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("library_requests" as never)
    .select("*")
    .eq("requested_by", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as LibraryRequest[]
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function fetchAllLibraryRequests(): Promise<LibraryRequest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("library_requests" as never)
    .select("*, profiles!requested_by(full_name)")
    .order("created_at", { ascending: false })
  if (error) throw error
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    requester_name: r.profiles?.full_name ?? "Desconhecido",
    profiles: undefined,
  })) as LibraryRequest[]
}

export async function reviewLibraryRequest(
  requestId: string,
  reviewerId: string,
  status: "approved" | "rejected",
  review_notes?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("library_requests" as never)
    .update({
      status,
      reviewed_by: reviewerId,
      review_notes: review_notes ?? null,
      reviewed_at: new Date().toISOString(),
    } as never)
    .eq("id", requestId)
  if (error) throw error
}

/** Aprova a requisição E insere a biblioteca no catálogo automaticamente. */
export async function approveAndAddToLibrary(
  requestId: string,
  reviewerId: string,
  review_notes: string | undefined,
  catalogEntry: {
    name: string
    display_name: string
    description?: string
    category: LibraryCatalog["category"]
    pyodide_native: boolean
  }
): Promise<void> {
  const supabase = createClient()

  // Insere no catálogo
  const { error: catalogErr } = await supabase
    .from("library_catalog" as never)
    .upsert({
      ...catalogEntry,
      added_by: reviewerId,
      active: true,
    } as never, { onConflict: "name" })
  if (catalogErr) throw catalogErr

  // Marca a requisição como aprovada
  await reviewLibraryRequest(requestId, reviewerId, "approved", review_notes)
}
