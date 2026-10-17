"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { Note } from "@levelusp/contracts"
import { fetchNotes, createNote, updateNote, deleteNote } from "@/lib/api"
import {
  ArrowLeft, Plus, Trash2, BookOpen, GraduationCap,
  NotebookPen, Search, Loader2, FileText, Clock,
} from "lucide-react"
import { formatRelativeDay, truncatePlainText } from "@/lib/utils"
import { ROUTES } from "@/lib/constants"
import { LazyRichTextEditor } from "@/components/editor/lazy-rich-text-editor"



export default function NotasPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  // Campos alterados desde o último salvamento (título E conteúdo — o debounce não pode perder um deles).
  const pendingSaveRef = useRef<{ id: string; patch: { title?: string; content?: string } } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  // Falha da API ≠ caderno vazio: "Nenhuma anotação ainda" faria parecer que as notas sumiram.
  const [hasLoadError, setHasLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeNote = notes.find((n) => n.id === activeId) ?? null

  useEffect(() => {
    if (authLoading) return
    if (!profile) { router.push(ROUTES.loginWithNext(ROUTES.notes)); return }
    fetchNotes()
      .then((data) => {
        setHasLoadError(false)
        setNotes(data)
        if (data.length > 0) setActiveId(data[0].id)
      })
      .catch(() => setHasLoadError(true))
      .finally(() => setLoading(false))
  }, [profile, authLoading, router, reloadKey])

  const handleCreate = async () => {
    try {
      const note = await createNote({ title: "Nova anotação", content: "" })
      setNotes((prev) => [note, ...prev])
      setActiveId(note.id)
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta anotação?")) return
    setDeleting(id)
    try {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (activeId === id) {
        const remaining = notes.filter((n) => n.id !== id)
        setActiveId(remaining[0]?.id ?? null)
      }
    } catch {} finally {
      setDeleting(null)
    }
  }

  const handleChange = useCallback(
    (field: "title" | "content", value: string) => {
      if (!activeId) return
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeId
            ? { ...n, [field]: value, updated_at: new Date().toISOString() }
            : n
        )
      )
      // Autosave com debounce de 800ms
      if (saveTimer.current) clearTimeout(saveTimer.current)
      const previousPatch = pendingSaveRef.current?.id === activeId ? pendingSaveRef.current.patch : {}
      pendingSaveRef.current = { id: activeId, patch: { ...previousPatch, [field]: value } }
      setSaving(true)
      saveTimer.current = setTimeout(async () => {
        const pendingSave = pendingSaveRef.current
        pendingSaveRef.current = null
        if (!pendingSave) return
        try {
          await updateNote(pendingSave.id, pendingSave.patch)
          setSaveError(false)
        } catch {
          setSaveError(true)
        } finally {
          setSaving(false)
        }
      }, 800)
    },
    [activeId]
  )

  const filtered = notes.filter((n) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (n.title ?? "").toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.lesson_title ?? "").toLowerCase().includes(q) ||
      (n.course_title ?? "").toLowerCase().includes(q)
    )
  })

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="flex h-14 items-center gap-2 px-4 sm:gap-4">
          <Link
            href={ROUTES.dashboard}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Painel
          </Link>
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-level-purple" />
            <h1 className="text-sm font-semibold text-level-purple-dark">Caderno de Anotações</h1>
          </div>
          <span role="status" className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            {saving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</>
            ) : saveError ? (
              <span className="text-destructive">Não foi possível salvar. Verifique a conexão.</span>
            ) : null}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        {/* Sidebar — lista de notas (em cima no celular) */}
        <aside className="flex max-h-[40%] w-full shrink-0 flex-col border-b border-border bg-white sm:max-h-none sm:w-72 sm:border-b-0 sm:border-r">
          {/* Busca + nova nota */}
          <div className="space-y-2 p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar anotações…"
                aria-label="Buscar anotações"
                className="w-full rounded-lg border border-border bg-muted/30 py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-level-purple focus:outline-none"
              />
            </div>
            <button
              onClick={handleCreate}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-level-purple py-1.5 text-xs font-semibold text-white hover:bg-level-purple-dark transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova anotação
            </button>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {hasLoadError ? (
              <div role="alert" className="px-4 py-10 text-center">
                <p className="text-sm font-semibold text-red-800">Não foi possível carregar suas anotações.</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true)
                    setReloadKey((key) => key + 1)
                  }}
                  className="mt-3 rounded-lg bg-level-purple px-4 py-2 text-xs font-semibold text-white hover:bg-level-purple-dark"
                >
                  Tentar novamente
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {search ? "Nenhuma nota encontrada." : "Nenhuma anotação ainda."}
                </p>
              </div>
            ) : (
              filtered.map((note) => (
                <div
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  aria-current={activeId === note.id ? "true" : undefined}
                  onClick={() => setActiveId(note.id)}
                  onKeyDown={(event) => {
                    const isActivationKey = event.key === "Enter" || event.key === " "
                    if (event.target !== event.currentTarget || !isActivationKey) return
                    event.preventDefault()
                    setActiveId(note.id)
                  }}
                  className={`w-full cursor-pointer border-b border-border px-3 py-3 text-left transition-colors hover:bg-level-purple-light/40 ${
                    activeId === note.id ? "bg-level-purple-light/60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-level-purple-dark">
                      {note.title || "Sem título"}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                      aria-label={`Excluir anotação ${note.title || "sem título"}`}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      disabled={deleting === note.id}
                    >
                      {deleting === note.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />
                      }
                    </button>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {truncatePlainText(note.content) || "Sem conteúdo"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
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
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                      <Clock className="h-2.5 w-2.5" />
                      {formatRelativeDay(note.updated_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Editor */}
        <main className="flex flex-1 flex-col min-w-0">
          {activeNote ? (
            <>
              {/* Título */}
              <div className="border-b border-border px-6 py-3">
                <input
                  value={activeNote.title ?? ""}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Título da anotação…"
                  aria-label="Título da anotação"
                  className="w-full text-xl font-bold text-level-purple-dark placeholder:text-muted-foreground/50 focus:outline-none bg-transparent"
                />
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {activeNote.lesson_title && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {activeNote.lesson_title}
                    </span>
                  )}
                  {activeNote.course_title && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {activeNote.course_title}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Atualizado {formatRelativeDay(activeNote.updated_at)}
                  </span>
                </div>
              </div>

              {/* Conteúdo */}
              {/* Mesmo editor rico do caderno flutuante: o conteúdo é HTML. */}
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                <LazyRichTextEditor
                  key={activeNote.id}
                  value={activeNote.content}
                  onChange={(html) => handleChange("content", html)}
                  placeholder="Escreva suas anotações aqui…"
                  minHeight={280}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
              <NotebookPen className="h-16 w-16 text-muted-foreground/20" />
              <div>
                <h2 className="text-base font-semibold text-level-purple-dark">Nenhuma anotação selecionada</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crie uma nova anotação ou selecione uma existente.
                </p>
              </div>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors"
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
