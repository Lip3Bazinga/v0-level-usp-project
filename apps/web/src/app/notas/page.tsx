"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, BookOpen, GraduationCap, NotebookPen, Search, Loader2, FileText, Clock } from "lucide-react"
import type { Note } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { ROUTES } from "@/lib/constants"
import { formatRelativeDay, truncatePlainText, cn } from "@/lib/utils"
import { LazyRichTextEditor } from "@/components/editor/lazy-rich-text-editor"
import { filterNotes, useNoteCollection, type NoteSearchField } from "@/components/notes/note-collection"
import { useNoteAutosave, type EditableNoteField } from "./use-note-autosave"

const SEARCH_FIELDS: readonly NoteSearchField[] = ["title", "content", "lesson_title", "course_title"]

export default function NotasPage() {
  const router = useRouter()
  const { profile, isLoading: isAuthLoading } = useAuth()
  const collection = useNoteCollection(Boolean(profile))
  const { notesResource, activeNote } = collection
  const autosave = useNoteAutosave()
  const [searchText, setSearchText] = useState("")

  useEffect(() => {
    if (!isAuthLoading && !profile) router.push(ROUTES.loginWithNext(ROUTES.notes))
  }, [isAuthLoading, profile, router])

  const handleChange = (field: EditableNoteField, value: string) => {
    if (!activeNote) return
    collection.updateNoteLocally(activeNote.id, (note) => ({ ...note, [field]: value, updated_at: new Date().toISOString() }))
    autosave.scheduleSave(activeNote.id, field, value)
  }

  if (isAuthLoading || !profile || notesResource.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }

  const visibleNotes = filterNotes(collection.notes, searchText, SEARCH_FIELDS)

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="flex h-14 items-center gap-2 px-4 sm:gap-4">
          <Link
            href={ROUTES.dashboard}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Painel
          </Link>
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-level-purple" />
            <h1 className="text-sm font-semibold text-level-purple-dark">Caderno de Anotações</h1>
          </div>
          <span role="status" className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            {autosave.isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
              </>
            ) : autosave.hasSaveError ? (
              <span className="text-destructive">Não foi possível salvar. Verifique a conexão.</span>
            ) : null}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        {/* No celular a lista fica em cima do editor. */}
        <aside className="flex max-h-[40%] w-full shrink-0 flex-col border-b border-border bg-white sm:max-h-none sm:w-72 sm:border-b-0 sm:border-r">
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Buscar anotações…"
                aria-label="Buscar anotações"
                className="w-full rounded-lg border border-border bg-muted/30 py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-level-purple focus:outline-none"
              />
            </div>
            <button
              onClick={collection.create}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-level-purple py-1.5 text-xs font-semibold text-white transition-colors hover:bg-level-purple-dark"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova anotação
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {notesResource.status === "error" ? (
              // Falha da API ≠ caderno vazio: "Nenhuma anotação ainda" faria parecer que as notas sumiram.
              <div role="alert" className="px-4 py-10 text-center">
                <p className="text-sm font-semibold text-red-800">Não foi possível carregar suas anotações.</p>
                <button
                  type="button"
                  onClick={() => void notesResource.reload()}
                  className="mt-3 rounded-lg bg-level-purple px-4 py-2 text-xs font-semibold text-white hover:bg-level-purple-dark"
                >
                  Tentar novamente
                </button>
              </div>
            ) : visibleNotes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">{searchText ? "Nenhuma nota encontrada." : "Nenhuma anotação ainda."}</p>
              </div>
            ) : (
              visibleNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isActive={activeNote?.id === note.id}
                  isDeleting={collection.deletingNoteId === note.id}
                  onSelect={collection.selectNote}
                  onDelete={collection.remove}
                />
              ))
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {activeNote ? (
            <ActiveNoteEditor note={activeNote} onChange={handleChange} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
              <NotebookPen className="h-16 w-16 text-muted-foreground/20" />
              <div>
                <h2 className="text-base font-semibold text-level-purple-dark">Nenhuma anotação selecionada</h2>
                <p className="mt-1 text-sm text-muted-foreground">Crie uma nova anotação ou selecione uma existente.</p>
              </div>
              <button
                onClick={collection.create}
                className="flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
              >
                <Plus className="h-4 w-4" />
                Nova anotação
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

interface NoteListItemProps {
  note: Note
  isActive: boolean
  isDeleting: boolean
  onSelect: (noteId: string) => void
  onDelete: (noteId: string) => void
}

function NoteListItem({ note, isActive, isDeleting, onSelect, onDelete }: NoteListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isActive ? "true" : undefined}
      onClick={() => onSelect(note.id)}
      onKeyDown={(event) => {
        const isActivationKey = event.key === "Enter" || event.key === " "
        if (event.target !== event.currentTarget || !isActivationKey) return
        event.preventDefault()
        onSelect(note.id)
      }}
      className={cn(
        "w-full cursor-pointer border-b border-border px-3 py-3 text-left transition-colors hover:bg-level-purple-light/40",
        isActive ? "bg-level-purple-light/60" : "",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs font-semibold text-level-purple-dark">{note.title || "Sem título"}</p>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onDelete(note.id)
          }}
          aria-label={`Excluir anotação ${note.title || "sem título"}`}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </button>
      </div>
      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{truncatePlainText(note.content) || "Sem conteúdo"}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {note.lesson_title && (
          <span className="flex items-center gap-0.5 rounded-full bg-level-purple-subtle px-1.5 py-0.5 text-[10px] text-level-purple">
            <BookOpen className="h-2.5 w-2.5" />
            {note.lesson_title}
          </span>
        )}
        {note.course_title && (
          <span className="flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
            <GraduationCap className="h-2.5 w-2.5" />
            {note.course_title}
          </span>
        )}
        <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {formatRelativeDay(note.updated_at)}
        </span>
      </div>
    </div>
  )
}

interface ActiveNoteEditorProps {
  note: Note
  onChange: (field: EditableNoteField, value: string) => void
}

function ActiveNoteEditor({ note, onChange }: ActiveNoteEditorProps) {
  return (
    <>
      <div className="border-b border-border px-6 py-3">
        <input
          value={note.title ?? ""}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="Título da anotação…"
          aria-label="Título da anotação"
          className="w-full bg-transparent text-xl font-bold text-level-purple-dark placeholder:text-muted-foreground/50 focus:outline-none"
        />
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {note.lesson_title && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {note.lesson_title}
            </span>
          )}
          {note.course_title && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              {note.course_title}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Atualizado {formatRelativeDay(note.updated_at)}
          </span>
        </div>
      </div>

      {/* Mesmo editor rico do caderno flutuante: o conteúdo é HTML. */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <LazyRichTextEditor
          key={note.id}
          value={note.content}
          onChange={(html) => onChange("content", html)}
          placeholder="Escreva suas anotações aqui…"
          minHeight={280}
        />
      </div>
    </>
  )
}
