import { createClient } from "@/lib/supabase/client"

export interface Note {
  id: string
  user_id: string
  lesson_id: string | null
  course_id: string | null
  title: string | null
  content: string
  created_at: string
  updated_at: string
  lesson_title?: string
  course_title?: string
}

export async function fetchNotes(): Promise<Note[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("notes" as never)
    .select(`
      *,
      lessons!lesson_id(title),
      courses!course_id(title)
    `)
    .order("updated_at", { ascending: false })
  if (error) throw error
  return ((data ?? []) as any[]).map((n) => ({
    ...n,
    lesson_title: n.lessons?.title ?? null,
    course_title: n.courses?.title ?? null,
    lessons: undefined,
    courses: undefined,
  })) as Note[]
}

export async function createNote(
  patch: { title?: string; content?: string; lesson_id?: string | null; course_id?: string | null }
): Promise<Note> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")
  const { data, error } = await supabase
    .from("notes" as never)
    .insert({ user_id: user.id, content: "", ...patch } as never)
    .select()
    .single()
  if (error) throw error
  return data as Note
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: string }
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("notes" as never)
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq("id", id)
  if (error) throw error
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("notes" as never)
    .delete()
    .eq("id", id)
  if (error) throw error
}
