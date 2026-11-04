"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import type { Note } from "@levelusp/contracts"
import { useAsyncResource, type AsyncResource } from "@/hooks/use-async-resource"
import { createNote, deleteNote, fetchNotes } from "@/lib/api"
import { swalConfirm } from "@/lib/swal"

export type NoteSearchField = "title" | "content" | "lesson_title" | "course_title"

const NO_NOTES: Note[] = []
const NEW_NOTE = { title: "Nova anotação", content: "" }

/** Notas que contêm o texto buscado (sem diferenciar maiúsculas) em algum dos campos. */
export function filterNotes<TNote extends Pick<Note, NoteSearchField>>(
  notes: readonly TNote[],
  searchText: string,
  fields: readonly NoteSearchField[],
): TNote[] {
  if (!searchText.trim()) return [...notes]
  const query = searchText.toLowerCase()
  return notes.filter((note) => fields.some((field) => (note[field] ?? "").toLowerCase().includes(query)))
}

/** Mais recente primeiro (a data vem em ISO 8601, então a ordem de texto é a cronológica). */
export function sortByRecentUpdate<TNote extends Pick<Note, "updated_at">>(notes: readonly TNote[]): TNote[] {
  return [...notes].sort((first, second) => second.updated_at.localeCompare(first.updated_at))
}
export interface UseNoteCollectionResult {
  notesResource: AsyncResource<Note[]>
  notes: Note[]
  activeNote: Note | null
  deletingNoteId: string | null
  selectNote: Dispatch<SetStateAction<string | null>>
  setNotes: (update: (current: Note[]) => Note[]) => void
  updateNoteLocally: (noteId: string, update: (note: Note) => Note) => void
  create: () => Promise<void>
  remove: (noteId: string) => Promise<void>
}

/**
 * Caderno do aluno: lista, nota aberta, criação e exclusão. Usado pela página
 * /notas e pelo caderno flutuante. Sem nota escolhida, a primeira da lista fica aberta.
 */
export function useNoteCollection(isSignedIn: boolean): UseNoteCollectionResult {
  const notesResource = useAsyncResource(() => (isSignedIn ? fetchNotes() : Promise.resolve(NO_NOTES)), [isSignedIn])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const { setData: setNotes } = notesResource

  const notes = notesResource.status === "success" ? notesResource.data : NO_NOTES
  const activeNoteId = selectedNoteId ?? notes[0]?.id ?? null
  const activeNote = notes.find((note) => note.id === activeNoteId) ?? null

  const create = async (): Promise<void> => {
    try {
      const note = await createNote(NEW_NOTE)
      setNotes((current) => [note, ...current])
      setSelectedNoteId(note.id)
    } catch {
      // Sem nota nova a lista continua como estava; o aluno pode tentar de novo.
    }
  }

  const remove = async (noteId: string): Promise<void> => {
    const isConfirmed = await swalConfirm({ title: "Excluir esta anotação?", confirmText: "Excluir", danger: true })
    if (!isConfirmed) return
    setDeletingNoteId(noteId)
    try {
      await deleteNote(noteId)
      setNotes((current) => current.filter((note) => note.id !== noteId))
      if (noteId === activeNoteId) setSelectedNoteId(null)
    } catch {
      // A nota continua na lista, então a falha fica visível.
    } finally {
      setDeletingNoteId(null)
    }
  }

  const updateNoteLocally = (noteId: string, update: (note: Note) => Note): void =>
    setNotes((current) => current.map((note) => (note.id === noteId ? update(note) : note)))

  return {
    notesResource,
    notes,
    activeNote,
    deletingNoteId,
    selectNote: setSelectedNoteId,
    setNotes,
    updateNoteLocally,
    create,
    remove,
  }
}
