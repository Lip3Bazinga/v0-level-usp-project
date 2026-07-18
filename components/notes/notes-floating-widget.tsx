"use client"

import {
  useCallback, useEffect, useRef, useState,
} from "react"
import {
  NotebookPen, X, Plus, Search, Trash2, Loader2,
  BookOpen, GraduationCap, Clock, FileText,
} from "lucide-react"
import { createPortal } from "react-dom"
import {
  fetchNotes, createNote, updateNote, deleteNote, type Note,
} from "@/lib/supabase/notes"
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

// ── Modal content (runs client-side only) ─────────────────────────────────────

function NotesModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const activeNote = notes.find((n) => n.id === activeId) ?? null

  // Rascunho LOCAL da nota aberta: digitar só re-renderiza o editor.
  // A lista (snippets, busca, datas) sincroniza apenas no debounce do save —
  // antes, cada tecla refazia regex/filtro de todas as notas (travava).
  const [draft, setDraft] = useState({ title: "", content: "" })
  const draftDirty = useRef(false)

  // Troca de nota aberta: o save pendente da anterior COMPLETA (o timer
  // capturou id e conteúdo antigos); só carregamos o rascunho da nova.
  useEffect(() => {
    draftDirty.current = false
    const note = notes.find((n) => n.id === activeId)
    setDraft({ title: note?.title ?? "", content: note?.content ?? "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, loading])

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

  // Close on Escape
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
      setTimeout(() => contentRef.current?.focus(), 50)
    } catch {}
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
    } catch {} finally { setDeleting(null) }
  }

  const handleChange = useCallback(
    (field: "title" | "content", value: string) => {
      if (!activeId) return
      const id = activeId
      draftDirty.current = true
      setDraft((prev) => {
        const next = { ...prev, [field]: value }
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setSaving(true)
        saveTimer.current = setTimeout(async () => {
          try {
            await updateNote(id, { title: next.title, content: next.content })
            draftDirty.current = false
            // Sincroniza a lista UMA vez por ciclo de save, não por tecla
            setNotes((prevNotes) =>
              prevNotes.map((n) =>
                n.id === id
                  ? { ...n, ...next, updated_at: new Date().toISOString() }
                  : n
              )
            )
          } finally { setSaving(false) }
        }, 700)
        return next
      })
    },
    [activeId]
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* ── Sidebar ── */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-[#F7F5FF]">
          {/* Header sidebar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-level-purple-dark">
              <NotebookPen className="h-4 w-4 text-level-purple" />
              Notas
            </span>
            <button
              onClick={handleCreate}
              title="Nova anotação"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-level-purple text-white hover:bg-level-purple-dark transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Busca */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="w-full rounded-md border border-border bg-white py-1 pl-6 pr-2 text-xs placeholder:text-muted-foreground focus:border-level-purple focus:outline-none"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-level-purple" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
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
                    <p className="truncate text-xs font-semibold text-level-purple-dark leading-tight">
                      {note.title || "Sem título"}
                    </p>
                    <button
                      onClick={(e) => handleDelete(note.id, e)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                      disabled={deleting === note.id}
                    >
                      {deleting === note.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground leading-snug">
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
        <div className="flex flex-1 flex-col min-w-0">
          {/* Topbar */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            {activeNote ? (
              <input
                value={draft.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Título…"
                className="flex-1 text-base font-bold text-level-purple-dark placeholder:text-muted-foreground/40 focus:outline-none bg-transparent"
              />
            ) : (
              <span className="text-sm text-muted-foreground">Selecione ou crie uma nota</span>
            )}
            <div className="flex items-center gap-3 ml-4 shrink-0">
              {saving && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
                </span>
              )}
              {activeNote?.lesson_title && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3 text-level-purple" />
                  {activeNote.lesson_title}
                </span>
              )}
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Textarea */}
          {activeNote ? (
            <textarea
              ref={contentRef}
              value={draft.content}
              onChange={(e) => handleChange("content", e.target.value)}
              placeholder="Escreva suas anotações aqui…&#10;&#10;Dica: este caderno é salvo automaticamente na nuvem ☁️"
              className="flex-1 resize-none px-5 py-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none bg-transparent"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-8">
              <NotebookPen className="h-14 w-14 text-muted-foreground/20" />
              <div>
                <p className="text-sm font-semibold text-level-purple-dark">Nenhuma nota aberta</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Clique em um título à esquerda ou crie uma nova anotação.
                </p>
              </div>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-xs font-semibold text-white hover:bg-level-purple-dark transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Nova anotação
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Floating trigger ───────────────────────────────────────────────────────────

export function NotesFloatingWidget() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!profile || !mounted) return null

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        title="Abrir caderno de anotações"
        className="fixed bottom-20 right-4 z-[100] flex h-12 w-12 items-center justify-center rounded-full bg-level-purple shadow-lg shadow-purple-300/50 text-white hover:bg-level-purple-dark hover:scale-105 active:scale-95 transition-all md:bottom-6"
      >
        <NotebookPen className="h-5 w-5" />
      </button>

      {/* Modal via portal */}
      {open && createPortal(
        <NotesModal onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  )
}
