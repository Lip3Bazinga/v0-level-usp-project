"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  NotebookPen, X, Plus, Search, Trash2, Loader2,
  BookOpen, Clock, FileText, Check, Save,
} from "lucide-react"
import { createPortal } from "react-dom"
import {
  fetchNotes, createNote, updateNote, deleteNote, type Note,
} from "@/lib/supabase/notes"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { useAuth } from "@/contexts/auth-context"

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return `Hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
  if (diff === 1) return "Ontem"
  if (diff < 7) return `${diff} dias atrás`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function snippet(text: string, max = 72) {
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return clean.length > max ? clean.slice(0, max) + "…" : clean
}

// ── Editor de uma nota (NÃO controlado) ────────────────────────────────────────
// Recebe a nota como estado inicial e é remontado (key={note.id}) ao trocar de
// nota. Digitar NÃO toca no estado React — título e conteúdo vivem em refs; só
// o clique em "Salvar" (ou Ctrl+S) persiste e atualiza a lista lateral.

function NoteEditor({
  note,
  onSaved,
}: {
  note: Note
  onSaved: (patch: { id: string; title: string; content: string; updated_at: string }) => void
}) {
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<string>(note.content)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const handleSave = useCallback(async () => {
    if (saving) return
    const title = titleRef.current?.value ?? ""
    const content = contentRef.current
    setSaving(true)
    try {
      await updateNote(note.id, { title, content })
      const updated_at = new Date().toISOString()
      onSaved({ id: note.id, title, content, updated_at })
      setSavedAt(Date.now())
    } catch {
      /* silencioso — o usuário pode tentar de novo */
    } finally {
      setSaving(false)
    }
  }, [note.id, saving, onSaved])

  // Ctrl/Cmd+S salva sem sair do editor
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleSave])

  // Feedback "Salvo" some após 2s
  useEffect(() => {
    if (savedAt === null) return
    const t = setTimeout(() => setSavedAt(null), 2000)
    return () => clearTimeout(t)
  }, [savedAt])

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Topbar: título + salvar */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <input
          ref={titleRef}
          defaultValue={note.title ?? ""}
          placeholder="Título…"
          className="flex-1 bg-transparent text-base font-bold text-level-purple-dark placeholder:text-muted-foreground/40 focus:outline-none"
        />
        {note.lesson_title && (
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <BookOpen className="h-3 w-3 text-level-purple" />
            {note.lesson_title}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-level-purple px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…</>
          ) : savedAt ? (
            <><Check className="h-3.5 w-3.5" /> Salvo!</>
          ) : (
            <><Save className="h-3.5 w-3.5" /> Salvar</>
          )}
        </button>
      </div>

      {/* Editor rico NÃO controlado — digitar não re-renderiza o React */}
      <div className="flex-1 overflow-y-auto p-4">
        <RichTextEditor
          value={note.content}
          onChange={(html) => { contentRef.current = html }}
          placeholder="Escreva suas anotações aqui… (Ctrl+S para salvar)"
          minHeight={280}
        />
      </div>
    </div>
  )
}

// ── Modal (client-side only) ───────────────────────────────────────────────────

function NotesModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)

  const activeNote = notes.find((n) => n.id === activeId) ?? null

  useEffect(() => {
    if (!profile) return
    fetchNotes()
      .then((data) => {
        setNotes(data)
        if (data.length > 0) setActiveId(data[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [profile])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handleCreate = async () => {
    try {
      const note = await createNote({ title: "Nova anotação", content: "" })
      setNotes((prev) => [note, ...prev])
      setActiveId(note.id)
    } catch { /* silencioso */ }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Excluir esta anotação?")) return
    setDeleting(id)
    try {
      await deleteNote(id)
      const remaining = notes.filter((n) => n.id !== id)
      setNotes(remaining)
      if (activeId === id) setActiveId(remaining[0]?.id ?? null)
    } catch { /* silencioso */ } finally { setDeleting(null) }
  }

  // Atualiza a lista UMA vez, quando o editor confirma o save (não por tecla)
  const handleSaved = useCallback(
    (patch: { id: string; title: string; content: string; updated_at: string }) => {
      setNotes((prev) => {
        const next = prev.map((n) =>
          n.id === patch.id
            ? { ...n, title: patch.title, content: patch.content, updated_at: patch.updated_at }
            : n
        )
        return [...next].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      })
    },
    []
  )

  const filtered = notes.filter((n) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (n.title ?? "").toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.lesson_title ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Sidebar ── */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-[#F7F5FF]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-level-purple-dark">
              <NotebookPen className="h-4 w-4 text-level-purple" />
              Notas
            </span>
            <button
              onClick={handleCreate}
              title="Nova anotação"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-level-purple text-white transition-colors hover:bg-level-purple-dark"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="border-b border-border px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="w-full rounded-md border border-border bg-white py-1 pl-6 pr-2 text-xs placeholder:text-muted-foreground focus:border-level-purple focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-level-purple" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {search ? "Nenhuma nota encontrada." : "Nenhuma anotação ainda."}
                </p>
              </div>
            ) : (
              filtered.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setActiveId(note.id)}
                  className={`group w-full border-b border-border/50 px-3 py-2.5 text-left transition-colors hover:bg-white/70 ${
                    activeId === note.id ? "bg-white shadow-sm" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate text-xs font-semibold leading-tight text-level-purple-dark">
                      {note.title || "Sem título"}
                    </p>
                    <button
                      onClick={(e) => handleDelete(note.id, e)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                      disabled={deleting === note.id}
                    >
                      {deleting === note.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {snippet(note.content) || "Sem conteúdo"}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    {note.lesson_title && (
                      <span className="flex items-center gap-0.5 rounded-full bg-level-purple-subtle px-1.5 py-0.5 text-level-purple">
                        <BookOpen className="h-2 w-2" />
                        {note.lesson_title.slice(0, 18)}
                      </span>
                    )}
                    <Clock className="ml-auto h-2.5 w-2.5" />
                    {formatDate(note.updated_at)}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Editor ── */}
        {activeNote ? (
          <NoteEditor key={activeNote.id} note={activeNote} onSaved={handleSaved} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <NotebookPen className="h-14 w-14 text-muted-foreground/20" />
            <div>
              <p className="text-sm font-semibold text-level-purple-dark">Nenhuma nota aberta</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clique em um título à esquerda ou crie uma nova anotação.
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-level-purple-dark"
            >
              <Plus className="h-3.5 w-3.5" /> Nova anotação
            </button>
          </div>
        )}

        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Botão flutuante ─────────────────────────────────────────────────────────────

export function NotesFloatingWidget() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!profile || !mounted) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Abrir caderno de anotações"
        className="fixed bottom-20 right-4 z-[100] flex h-12 w-12 items-center justify-center rounded-full bg-level-purple text-white shadow-lg shadow-purple-300/50 transition-all hover:bg-level-purple-dark hover:scale-105 active:scale-95 md:bottom-6"
      >
        <NotebookPen className="h-5 w-5" />
      </button>

      {open && createPortal(
        <NotesModal onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  )
}
