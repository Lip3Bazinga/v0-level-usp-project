"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Layers, Edit3, Eye, Plus, Trash2, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { PubBadge } from "@/components/ui/badges"
import {
  fetchModules, createModule, updateModule, deleteModule,
  type ModuleFormData,
} from "@/lib/supabase/modules"
import type { Lesson, Module } from "@/lib/supabase/types"

const GRADIENTS = [
  "from-level-purple to-level-purple-medium",
  "from-warning to-destructive",
  "from-success to-info",
  "from-info to-level-purple",
  "from-level-purple-dark to-level-purple",
  "from-warning to-success",
]

const EMPTY: ModuleFormData = {
  title: "", description: "", icon: "BookOpen", color: "bg-level-purple", sort_order: 0,
}

interface ModulesPageProps {
  lessons: Lesson[]
  onToast: (msg: string, kind?: "success" | "danger" | "info" | "warning") => void
}

export function ModulesPage({ lessons, onToast }: ModulesPageProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<(ModuleFormData & { id?: string }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setModules(await fetchModules()) }
    catch { onToast("Erro ao carregar módulos", "danger") }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Agrupa lições por module_id (fallback para o texto module por retrocompat)
  const lessonsByModule = useMemo(() => {
    const byId: Record<string, Lesson[]> = {}
    const byName: Record<string, Lesson[]> = {}
    for (const l of lessons) {
      if (l.module_id) (byId[l.module_id] ||= []).push(l)
      else (byName[l.module] ||= []).push(l)
    }
    return { byId, byName }
  }, [lessons])

  const handleSave = async () => {
    if (!editing) return
    if (!editing.title.trim()) { onToast("Título é obrigatório", "warning"); return }
    setSaving(true)
    try {
      if (editing.id) {
        const { id, ...patch } = editing
        await updateModule(id, patch)
        onToast("Módulo atualizado", "success")
      } else {
        await createModule({ ...editing, sort_order: modules.length })
        onToast("Módulo criado", "success")
      }
      setEditing(null)
      await load()
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Erro ao salvar", "danger")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir este módulo? As lições não serão apagadas, apenas desvinculadas.")) return
    setDeletingId(id)
    try {
      await deleteModule(id)
      onToast("Módulo excluído", "danger")
      await load()
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Erro ao excluir", "danger")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-level-purple" /></div>
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-level-purple-dark">Módulos &amp; trilhas</h2>
          <p className="text-sm text-muted-foreground">Agrupe lições em jornadas de aprendizado</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" /> Novo módulo
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {modules.map((mod, i) => {
          const list = lessonsByModule.byId[mod.id] ?? lessonsByModule.byName[mod.title] ?? []
          const published = list.filter((l) => l.published).length
          const totalXp = list.reduce((s, l) => s + l.xp_reward, 0)
          return (
            <div key={mod.id} className="overflow-hidden rounded-2xl border border-border bg-white">
              <div className={cn("relative h-20 bg-linear-to-br px-5 py-4 text-white", GRADIENTS[i % GRADIENTS.length])}>
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Módulo {i + 1}</p>
                    <p className="text-lg font-extrabold">{mod.title}</p>
                  </div>
                  <Layers className="h-7 w-7 opacity-60" />
                </div>
              </div>
              <div className="p-5">
                {mod.description && <p className="mb-3 text-xs text-muted-foreground">{mod.description}</p>}
                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span><b className="text-foreground">{list.length}</b> lições</span>
                  <span className="text-success"><b>{published}</b> publicadas</span>
                  <span><b className="text-foreground">{totalXp}</b> XP total</span>
                </div>
                <div className="space-y-1">
                  {list.slice(0, 4).map((l) => (
                    <div key={l.id} className="flex items-center gap-2 rounded-lg p-2 text-xs hover:bg-muted">
                      <span className="w-6 font-mono text-muted-foreground">{l.order.toString().padStart(2, "0")}</span>
                      <span className="flex-1 truncate font-semibold text-foreground">{l.title}</span>
                      <PubBadge published={l.published} />
                    </div>
                  ))}
                  {list.length > 4 && <p className="pl-8 text-[11px] text-muted-foreground">+{list.length - 4} mais</p>}
                  {list.length === 0 && <p className="py-2 text-[11px] italic text-muted-foreground">Sem lições vinculadas</p>}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                  <button
                    onClick={() => setEditing({ id: mod.id, title: mod.title, description: mod.description, icon: mod.icon, color: mod.color, sort_order: mod.sort_order })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
                  >
                    <Edit3 className="h-3 w-3" /> Editar
                  </button>
                  <Link
                    href={`/dashboard?modulo=${encodeURIComponent(mod.title)}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-level-purple-subtle px-3 py-1.5 text-xs font-bold text-level-purple hover:bg-level-purple-light"
                  >
                    <Eye className="h-3 w-3" /> Pré-visualizar
                  </Link>
                  <button
                    onClick={() => handleDelete(mod.id)}
                    disabled={deletingId === mod.id}
                    className="flex items-center justify-center rounded-lg border border-destructive/30 px-2.5 py-1.5 text-destructive hover:bg-destructive/10"
                    title="Excluir módulo"
                  >
                    {deletingId === mod.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {modules.length === 0 && (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-border py-12 text-center">
            <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum módulo. Crie o primeiro.</p>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
              <p className="text-base font-extrabold text-level-purple-dark">{editing.id ? "Editar módulo" : "Novo módulo"}</p>
              <button onClick={() => setEditing(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-6">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Título</p>
                <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none" />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</p>
                <textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <button onClick={() => setEditing(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white hover:bg-level-purple-dark disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing.id ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
