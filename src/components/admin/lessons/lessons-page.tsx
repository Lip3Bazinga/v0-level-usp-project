"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search, Plus, Eye, Edit3, Trash2, Globe, EyeOff,
  BookOpen, Zap, Clock, Loader2, FileText, List, Grid3X3, Columns, Copy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DiffBadge, PubBadge } from "@/components/ui/badges"
import { IconBtn } from "@/components/ui/icon-btn"
import { toggleLessonPublished, deleteLesson } from "@/lib/supabase/lessons"
import { swalConfirm, swalError, swalToast } from "@/lib/swal"
import type { Lesson } from "@/lib/supabase/types"
import type { OnToast } from "@/lib/types"

interface LessonsPageProps {
  lessons: Lesson[]
  setLessons: (l: Lesson[] | ((p: Lesson[]) => Lesson[])) => void
  onToast: OnToast
}

export function LessonsPageEnhanced({ lessons, setLessons, onToast }: LessonsPageProps) {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [diff, setDiff] = useState("all")
  const [mod, setMod] = useState("all")
  const [view, setView] = useState<"list" | "grid" | "kanban">("list")
  const [toDelete, setToDelete] = useState<Lesson | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const modules = useMemo(() => Array.from(new Set(lessons.map((l) => l.module))), [lessons])

  const filtered = useMemo(() => {
    return lessons
      .filter((l) => {
        if (q && !l.title.toLowerCase().includes(q.toLowerCase())) return false
        if (status === "published" && !l.published) return false
        if (status === "draft" && l.published) return false
        if (diff !== "all" && l.difficulty !== diff) return false
        if (mod !== "all" && l.module !== mod) return false
        return true
      })
      .sort((a, b) => a.order - b.order)
  }, [lessons, q, status, diff, mod])

  const handleToggle = async (l: Lesson) => {
    setTogglingId(l.id)
    try {
      await toggleLessonPublished(l.id, !l.published)
      setLessons((prev) => prev.map((x) => (x.id === l.id ? { ...x, published: !l.published } : x)))
      onToast(l.published ? "Lição despublicada" : "Lição publicada", "success")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (lesson?: Lesson) => {
    const target = lesson ?? toDelete
    if (!target) return
    const confirmed = await swalConfirm({
      title: "Excluir lição?",
      text: `A lição "${target.title}" será excluída permanentemente. O progresso dos alunos também será removido.`,
      confirmText: "Excluir",
      danger: true,
    })
    if (!confirmed) return
    const id = target.id
    setDeletingId(id)
    setToDelete(null)
    try {
      await deleteLesson(id)
      setLessons((prev) => prev.filter((x) => x.id !== id))
      swalToast({ title: "Lição excluída.", icon: "success" })
    } catch {
      await swalError({ text: "Erro ao excluir lição." })
    } finally {
      setDeletingId(null)
    }
  }

  const duplicate = (l: Lesson) => {
    const copy: Lesson = {
      ...l,
      id:         "dup-" + Date.now(),
      title:      l.title + " (cópia)",
      published:  false,
      order:      lessons.length + 1,
      slug:       l.slug + "-copia",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setLessons((prev) => [...prev, copy])
    onToast("Lição duplicada como rascunho", "success")
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-level-purple-dark">Lições</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {lessons.length} · {lessons.filter((l) => l.published).length} publicadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-white p-0.5">
            {([{ id: "list", Icon: List }, { id: "grid", Icon: Grid3X3 }, { id: "kanban", Icon: Columns }] as const).map(({ id, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  view === id ? "bg-level-purple text-white" : "text-muted-foreground hover:text-level-purple",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <Link href="/teacher/edit/new">
            <button className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4" /> Nova Lição
            </button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar lição..."
            className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-level-purple focus:outline-none"
          />
        </div>
        <select
          value={mod}
          onChange={(e) => setMod(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold focus:border-level-purple focus:outline-none"
        >
          <option value="all">Todos módulos</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {(["all", "published", "draft"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
              status === s ? "bg-level-purple text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple"
            )}
          >
            {s === "all" ? "Todas" : s === "published" ? "Publicadas" : "Rascunhos"}
          </button>
        ))}
        <div className="h-5 w-px bg-border" />
        {(["iniciante", "intermediario", "avancado"] as const).map((d) => (
          <button key={d} onClick={() => setDiff(diff === d ? "all" : d)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
              diff === d ? "bg-level-purple text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple"
            )}
          >
            {d === "iniciante" ? "Iniciante" : d === "intermediario" ? "Intermediário" : "Avançado"}
          </button>
        ))}
      </div>

      {view === "list" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <table className="w-full text-left">
            <thead className="bg-muted/30">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-4 py-2.5">#</th>
                <th className="px-2 py-2.5">Lição</th>
                <th className="hidden px-2 py-2.5 md:table-cell">Módulo</th>
                <th className="hidden px-2 py-2.5 lg:table-cell">Dificuldade</th>
                <th className="hidden px-2 py-2.5 text-right lg:table-cell">XP</th>
                <th className="px-2 py-2.5">Status</th>
                <th className="w-36 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => (
                <tr key={l.id} className="group hover:bg-level-purple-subtle/30">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.order.toString().padStart(2, "0")}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-light text-level-purple">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-level-purple-dark">{l.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {(l.libraries?.length ?? 0) > 0 ? (l.libraries ?? []).join(", ") : "Sem bibliotecas"} · ⏱ {Math.round(l.time_limit / 60)}min
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-2 py-3 text-xs text-muted-foreground md:table-cell">{l.module}</td>
                  <td className="hidden px-2 py-3 lg:table-cell"><DiffBadge d={l.difficulty} /></td>
                  <td className="hidden px-2 py-3 text-right lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-level-purple">
                      <Zap className="h-2.5 w-2.5" />+{l.xp_reward}
                    </span>
                  </td>
                  <td className="px-2 py-3"><PubBadge published={l.published} /></td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn title={l.published ? "Despublicar" : "Publicar"} size="sm" tone={l.published ? "success" : "neutral"} onClick={() => handleToggle(l)}>
                        {togglingId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : l.published ? <Globe className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </IconBtn>
                      <Link href={`/teacher/edit/${l.id}`}>
                        <IconBtn title="Editar" size="sm"><Edit3 className="h-3.5 w-3.5" /></IconBtn>
                      </Link>
                      <IconBtn title="Duplicar" size="sm" onClick={() => duplicate(l)}>
                        <Copy className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn title="Excluir" size="sm" tone="danger" onClick={() => setToDelete(l)}>
                        {deletingId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-3 text-sm font-semibold text-muted-foreground">Nenhuma lição encontrada</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <div key={l.id} className="cursor-pointer rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-level-purple-medium hover:shadow-lg">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-level-purple-light text-level-purple">
                  <BookOpen className="h-5 w-5" />
                </div>
                <PubBadge published={l.published} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{l.module} · Lição {l.order.toString().padStart(2, "0")}</p>
              <h3 className="mt-1 text-base font-extrabold leading-snug text-level-purple-dark">{l.title}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <DiffBadge d={l.difficulty} />
                <span className="inline-flex items-center gap-1 rounded-full bg-level-purple-subtle px-2 py-0.5 text-[11px] font-bold text-level-purple">
                  <Zap className="h-2.5 w-2.5" />{l.xp_reward} XP
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />{Math.round(l.time_limit / 60)}min
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="text-[11px] text-muted-foreground" />
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <IconBtn title={l.published ? "Despublicar" : "Publicar"} size="sm" onClick={() => handleToggle(l)}>
                    {togglingId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : l.published ? <Globe className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </IconBtn>
                  <Link href={`/teacher/edit/${l.id}`}>
                    <IconBtn title="Editar" size="sm"><Edit3 className="h-3.5 w-3.5" /></IconBtn>
                  </Link>
                  <IconBtn title="Excluir" size="sm" tone="danger" onClick={() => setToDelete(l)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "kanban" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { key: "draft",    label: "Rascunho",  tone: "text-muted-foreground bg-muted",      filter: (l: Lesson) => !l.published },
            { key: "published", label: "Publicada", tone: "text-success bg-success/10",          filter: (l: Lesson) => l.published },
            { key: "advanced",  label: "Avançadas", tone: "text-destructive bg-destructive/10",  filter: (l: Lesson) => l.difficulty === "avancado" },
          ].map((col) => {
            const items = filtered.filter(col.filter)
            return (
              <div key={col.key} className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase", col.tone)}>{col.label}</span>
                    <span className="text-xs font-bold text-muted-foreground">{items.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map((l) => (
                    <div key={l.id} className="cursor-pointer rounded-xl border border-border bg-white p-3 hover:border-level-purple-medium hover:shadow-sm">
                      <p className="text-xs font-bold text-muted-foreground">{l.module}</p>
                      <p className="mt-1 text-sm font-extrabold leading-snug text-level-purple-dark">{l.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <DiffBadge d={l.difficulty} />
                        <span className="text-[10px] font-bold text-level-purple">+{l.xp_reward} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-base font-extrabold text-level-purple-dark">Excluir lição?</p>
              </div>
              <button onClick={() => setToDelete(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light">
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-foreground">A lição <b>"{toDelete.title}"</b> será excluída permanentemente.</p>
              <p className="mt-2 text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <button onClick={() => setToDelete(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white">
                Cancelar
              </button>
              <button onClick={() => handleDelete()} className="rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white">
                Excluir permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
