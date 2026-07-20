import { createClient } from "@/lib/supabase/client"
import type { Module } from "@/lib/supabase/types"

export type ModuleFormData = Omit<Module, "id" | "created_at">

/** Lista os módulos ordenados. */
export async function fetchModules(): Promise<Module[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .order("sort_order", { ascending: true })
  if (error) throw error
  return (data ?? []) as Module[]
}

/** Conta quantas lições cada módulo tem (por module_id). */
export async function fetchModuleLessonCounts(): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data } = await supabase.from("lessons").select("module_id")
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { module_id: string | null }[]) {
    if (row.module_id) counts[row.module_id] = (counts[row.module_id] ?? 0) + 1
  }
  return counts
}

export async function createModule(data: ModuleFormData): Promise<Module> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from("modules")
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return created as Module
}

export async function updateModule(id: string, data: Partial<ModuleFormData>): Promise<Module> {
  const supabase = createClient()
  const { data: updated, error } = await supabase
    .from("modules")
    .update(data)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return updated as Module
}

export async function deleteModule(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("modules").delete().eq("id", id)
  if (error) throw error
}
