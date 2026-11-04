"use client"

import { useCallback, useRef, useState } from "react"
import type { NoteUpdateInput } from "@levelusp/contracts"
import { updateNote } from "@/lib/api"
import { NOTE_AUTOSAVE_DEBOUNCE_MS } from "@/lib/constants"

export type EditableNoteField = "title" | "content"

interface PendingSave {
  noteId: string
  /** Campos alterados desde o último salvamento: o debounce não pode perder o título nem o conteúdo. */
  patch: NoteUpdateInput
}

/**
 * Salva a nota alguns instantes depois da última alteração. O envio pendente não é
 * cancelado ao sair da página, para não perder o que acabou de ser digitado.
 */
export function useNoteAutosave() {
  const [isSaving, setIsSaving] = useState(false)
  const [hasSaveError, setHasSaveError] = useState(false)
  const pendingSaveRef = useRef<PendingSave | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    const pendingSave = pendingSaveRef.current
    pendingSaveRef.current = null
    if (!pendingSave) return
    try {
      await updateNote(pendingSave.noteId, pendingSave.patch)
      setHasSaveError(false)
    } catch {
      setHasSaveError(true)
    } finally {
      setIsSaving(false)
    }
  }, [])

  const scheduleSave = useCallback(
    (noteId: string, field: EditableNoteField, value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      // Trocar de nota antes do fim do debounce não pode descartar o que foi digitado na anterior.
      if (pendingSaveRef.current && pendingSaveRef.current.noteId !== noteId) void flush()
      const previousPatch = pendingSaveRef.current?.patch ?? {}
      pendingSaveRef.current = { noteId, patch: { ...previousPatch, [field]: value } }
      setIsSaving(true)
      timerRef.current = setTimeout(() => void flush(), NOTE_AUTOSAVE_DEBOUNCE_MS)
    },
    [flush],
  )

  return { isSaving, hasSaveError, scheduleSave }
}
