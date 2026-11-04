"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { NotebookPen, X, Plus, Search, Trash2, Loader2, BookOpen, Clock, FileText, Check, Save } from "lucide-react"
import type { Note } from "@levelusp/contracts"
import { LazyRichTextEditor } from "@/components/editor/lazy-rich-text-editor"
import { useAuth } from "@/contexts/auth-context"
import { useModalA11y } from "@/hooks/use-modal-a11y"
import { useTransientFlag } from "@/hooks/use-transient-value"
import { updateNote } from "@/lib/api"
import { ROUTES, SAVED_FEEDBACK_DURATION_MS } from "@/lib/constants"
import { formatRelativeDay, truncatePlainText, cn } from "@/lib/utils"
import { filterNotes, sortByRecentUpdate, useNoteCollection, type NoteSearchField } from "./note-collection"

const IDE_ROUTE_PREFIXES = [ROUTES.lesson(""), ROUTES.ide]
const SEARCH_FIELDS: readonly NoteSearchField[] = ["title", "content", "lesson_title"]
const PREVIEW_LENGTH = 72
const LESSON_TAG_LENGTH = 18

type SavedNote = Pick<Note, "id" | "title" | "content" | "updated_at">

interface NoteEditorProps {
  note: Note
  onSaved: (savedNote: SavedNote) => void
}

/**
 * Editor de uma nota, NÃO controlado: título e conteúdo vivem em refs e digitar não
 * re-renderiza o React. Só "Salvar" (ou Ctrl+S) persiste e atualiza a lista. É
 * remontado (key) ao trocar de nota.
 */
function NoteEditor({ note, onSaved }: NoteEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef(note.content)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSaveError, setHasSaveError] = useState(false)
  const savedFeedback = useTransientFlag(SAVED_FEEDBACK_DURATION_MS)
  const { activate: showSaved } = savedFeedback

  const handleSave = useCallback(async () => {
    if (isSaving) return
    const title = titleRef.current?.value ?? ""
    const content = contentRef.current
    setIsSaving(true)
    setHasSaveError(false)
    try {
      await updateNote(note.id, { title, content })
      onSaved({ id: note.id, title, content, updated_at: new Date().toISOString() })
      showSaved()
    } catch {
      setHasSaveError(true)
    } finally {
      setIsSaving(false)
    }
  }, [note.id, isSaving, onSaved, showSaved])

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return
      event.preventDefault()
      void handleSave()
    }
    window.addEventListener("keydown", handleSaveShortcut)
    return () => window.removeEventListener("keydown", handleSaveShortcut)
  }, [handleSave])

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <input
          ref={titleRef}
          defaultValue={note.title ?? ""}
          placeholder="Título…"
          aria-label="Título da anotação"
          className="min-w-0 flex-1 bg-transparent text-base font-bold text-level-purple-dark placeholder:text-muted-foreground/40 focus:outline-none"
        />
        {note.lesson_title && (
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <BookOpen className="h-3 w-3 text-level-purple" />
            {note.lesson_title}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          aria-live="polite"
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg",
            hasSaveError ? "bg-destructive" : "bg-level-purple",
            "px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-60",
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…
            </>
          ) : hasSaveError ? (
            <>Erro ao salvar — tentar de novo</>
          ) : savedFeedback.isActive ? (
            <>
              <Check className="h-3.5 w-3.5" /> Salvo!
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" /> Salvar
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <LazyRichTextEditor
          value={note.content}
          onChange={(html) => {
            contentRef.current = html
          }}
          placeholder="Escreva suas anotações aqui… (Ctrl+S para salvar)"
          minHeight={280}
        />
      </div>
    </div>
  )
}

function NotesModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const collection = useNoteCollection(Boolean(profile))
  const { notesResource, activeNote, deletingNoteId, setNotes } = collection
  const [searchText, setSearchText] = useState("")
  // Foco preso no diálogo, Esc fecha e o foco volta ao botão que abriu.
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose)

  // A lista só muda quando o editor confirma o salvamento, não a cada tecla.
  const handleSaved = useCallback(
    (savedNote: SavedNote) => {
      setNotes((current) =>
        sortByRecentUpdate(current.map((note) => (note.id === savedNote.id ? { ...note, ...savedNote } : note))),
      )
    },
    [setNotes],
  )

  const visibleNotes = filterNotes(collection.notes, searchText, SEARCH_FIELDS)

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Caderno de anotações"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[80vh] sm:flex-row">
        <aside className="flex max-h-[40%] w-full shrink-0 flex-col border-b border-border bg-[#F7F5FF] sm:max-h-none sm:w-64 sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-level-purple-dark">
              <NotebookPen className="h-4 w-4 text-level-purple" />
              Notas
            </span>
            <button
              onClick={collection.create}
              title="Nova anotação"
              aria-label="Nova anotação"
              className="mr-9 flex h-7 w-7 items-center justify-center rounded-lg bg-level-purple text-white transition-colors hover:bg-level-purple-dark sm:mr-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="border-b border-border px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Buscar…"
                aria-label="Buscar anotações"
                className="w-full rounded-md border border-border bg-white py-1 pl-6 pr-2 text-xs placeholder:text-muted-foreground focus:border-level-purple focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {notesResource.status === "loading" ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-level-purple" />
              </div>
            ) : visibleNotes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">{searchText ? "Nenhuma nota encontrada." : "Nenhuma anotação ainda."}</p>
              </div>
            ) : (
              visibleNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isActive={activeNote?.id === note.id}
                  isDeleting={deletingNoteId === note.id}
                  onSelect={collection.selectNote}
                  onDelete={collection.remove}
                />
              ))
            )}
          </div>
        </aside>

        {activeNote ? (
          <NoteEditor key={activeNote.id} note={activeNote} onSaved={handleSaved} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <NotebookPen className="h-14 w-14 text-muted-foreground/20" />
            <div>
              <p className="text-sm font-semibold text-level-purple-dark">Nenhuma nota aberta</p>
              <p className="mt-1 text-xs text-muted-foreground">Clique em um título à esquerda ou crie uma nova anotação.</p>
            </div>
            <button
              onClick={collection.create}
              className="flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-level-purple-dark"
            >
              <Plus className="h-3.5 w-3.5" /> Nova anotação
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          aria-label="Fechar caderno de anotações"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
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
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        onSelect(note.id)
      }}
      className={cn(
        "group w-full cursor-pointer border-b border-border/50 px-3 py-2.5 text-left transition-colors hover:bg-white/70",
        isActive ? "bg-white shadow-sm" : "",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="truncate text-xs font-semibold leading-tight text-level-purple-dark">{note.title || "Sem título"}</p>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onDelete(note.id)
          }}
          aria-label={`Excluir anotação ${note.title || "sem título"}`}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </button>
      </div>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
        {truncatePlainText(note.content, PREVIEW_LENGTH) || "Sem conteúdo"}
      </p>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        {note.lesson_title && (
          <span className="flex items-center gap-0.5 rounded-full bg-level-purple-subtle px-1.5 py-0.5 text-level-purple">
            <BookOpen className="h-2 w-2" />
            {note.lesson_title.slice(0, LESSON_TAG_LENGTH)}
          </span>
        )}
        <Clock className="ml-auto h-2.5 w-2.5" />
        {formatRelativeDay(note.updated_at)}
      </div>
    </div>
  )
}

const subscribeToNothing = () => () => {}

/** `false` na renderização do servidor e na hidratação; `true` depois, no navegador. */
function useIsClient(): boolean {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false)
}

export function NotesFloatingWidget() {
  const { profile } = useAuth()
  const pathname = usePathname() ?? ""
  const [isOpen, setIsOpen] = useState(false)
  const isClient = useIsClient()

  if (!profile || !isClient) return null
  // Na própria página de notas o botão é redundante.
  if (pathname.startsWith(ROUTES.notes)) return null
  // Na IDE o rodapé (Voltar/Próximo) e as abas móveis ficam no canto inferior:
  // no celular o botão some (as notas continuam em /notas) e no desktop sobe acima do rodapé.
  const isInIde = IDE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const positionClassName = isInIde ? "hidden md:flex bottom-16 right-4" : "flex bottom-20 right-4 lg:bottom-6"

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="Abrir caderno de anotações"
        aria-label="Abrir caderno de anotações"
        aria-haspopup="dialog"
        className={cn(
          "fixed",
          positionClassName,
          "z-40 h-12 w-12 items-center justify-center rounded-full bg-level-purple text-white shadow-lg shadow-purple-300/50 transition-all hover:scale-105 hover:bg-level-purple-dark active:scale-95",
        )}
      >
        <NotebookPen className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && createPortal(<NotesModal onClose={() => setIsOpen(false)} />, document.body)}
    </>
  )
}
