"use client"

import { useState, useEffect } from "react"
import { Plus, Edit3, Trash2, Loader2, X, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  fetchAllBadges, createBadge, updateBadge, deleteBadge,
  type BadgeFormData,
} from "@/lib/supabase/badges"
import { badgeIcon, BADGE_ICON_NAMES } from "@/lib/badge-icons"
import type { Badge, BadgeRarity, BadgeCriteriaType } from "@/lib/supabase/types"
import type { OnToast } from "@/lib/types"

const RARITY_LABEL: Record<BadgeRarity, string> = {
  common: "Comum", rare: "Raro", epic: "Épico", legendary: "Lendário",
}
const RARITY_COLOR: Record<BadgeRarity, string> = {
  common:    "bg-gray-100 text-gray-700",
  rare:      "bg-blue-100 text-blue-700",
  epic:      "bg-level-purple-light text-level-purple",
  legendary: "bg-yellow-100 text-yellow-700",
}
const CRITERIA_LABEL: Record<BadgeCriteriaType, string> = {
  total_xp:          "XP total",
  current_streak:    "Streak atual",
  max_streak:        "Streak máximo",
  lessons_completed: "Lições completas",
  courses_completed: "Cursos completos",
  manual:            "Manual",
}

const EMPTY: BadgeFormData = {
  id: "", name: "", description: "", icon: "Award",
  rarity: "common", criteria_type: "lessons_completed", criteria_value: 1,
  sort_order: 0, active: true,
}

interface BadgesAdminPageProps {
  onToast: OnToast
}

export function BadgesAdminPage({ onToast }: BadgesAdminPageProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<BadgeFormData | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setBadges(await fetchAllBadges(true))
    } catch {
      onToast("Erro ao carregar badges", "danger")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true) }
  const openEdit = (b: Badge) => {
    const { created_at, ...rest } = b
    setEditing(rest)
    setIsNew(false)
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.id.trim() || !editing.name.trim()) {
      onToast("ID e nome são obrigatórios", "warning")
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        await createBadge(editing)
        onToast("Badge criada", "success")
      } else {
        const { id, ...patch } = editing
        await updateBadge(id, patch)
        onToast("Badge atualizada", "success")
      }
      setEditing(null)
      await load()
    } catch {
      onToast("Erro ao salvar badge", "danger")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteBadge(id)
      onToast("Badge excluída", "danger")
      await load()
    } catch {
      onToast("Erro ao excluir badge", "danger")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-level-purple-dark">Badges</h2>
          <p className="text-sm text-muted-foreground">Catálogo de conquistas e seus critérios</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-level-purple px-4 py-2 text-sm font-semibold text-white hover:bg-level-purple-dark"
        >
          <Plus className="h-4 w-4" /> Nova badge
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Badge</th>
              <th className="px-4 py-3">Raridade</th>
              <th className="px-4 py-3">Critério</th>
              <th className="px-4 py-3">Ativa</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {badges.map((b) => {
              const Icon = badgeIcon(b.icon)
              return (
                <tr key={b.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-level-purple-light text-level-purple">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-level-purple-dark">{b.name}</p>
                        <p className="text-[11px] text-muted-foreground">{b.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RARITY_COLOR[b.rarity])}>
                      {RARITY_LABEL[b.rarity]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.criteria_type === "manual"
                      ? "Manual"
                      : `${CRITERIA_LABEL[b.criteria_type]} ≥ ${b.criteria_value}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-block h-2 w-2 rounded-full", b.active ? "bg-success" : "bg-muted-foreground/40")} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(b)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple" title="Editar">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(b.id)} disabled={deletingId === b.id} className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10" title="Excluir">
                        {deletingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {badges.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                <Award className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                Nenhuma badge no catálogo.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <BadgeEditModal
          form={editing}
          isNew={isNew}
          saving={saving}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// ── Modal de edição ─────────────────────────────────────────────────────────

function BadgeEditModal({
  form, isNew, saving, onChange, onClose, onSave,
}: {
  form: BadgeFormData
  isNew: boolean
  saving: boolean
  onChange: (f: BadgeFormData) => void
  onClose: () => void
  onSave: () => void
}) {
  const set = (patch: Partial<BadgeFormData>) => onChange({ ...form, ...patch })
  const Icon = badgeIcon(form.icon)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple text-white">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-base font-extrabold text-level-purple-dark">
              {isNew ? "Nova badge" : `Editar · ${form.name}`}
            </p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID (slug)">
              <input
                value={form.id}
                disabled={!isNew}
                onChange={(e) => set({ id: e.target.value })}
                placeholder="ex: streak-7"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm font-mono focus:border-level-purple focus:outline-none disabled:bg-muted"
              />
            </Field>
            <Field label="Nome">
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none" />
            </Field>
          </div>

          <Field label="Descrição">
            <input value={form.description} onChange={(e) => set({ description: e.target.value })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ícone">
              <select value={form.icon} onChange={(e) => set({ icon: e.target.value })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none">
                {BADGE_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Raridade">
              <select value={form.rarity} onChange={(e) => set({ rarity: e.target.value as BadgeRarity })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none">
                {(["common", "rare", "epic", "legendary"] as const).map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Critério">
              <select value={form.criteria_type} onChange={(e) => set({ criteria_type: e.target.value as BadgeCriteriaType })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none">
                {(Object.keys(CRITERIA_LABEL) as BadgeCriteriaType[]).map((c) => <option key={c} value={c}>{CRITERIA_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="Valor do critério">
              <input type="number" value={form.criteria_value} onChange={(e) => set({ criteria_value: +e.target.value })} disabled={form.criteria_type === "manual"} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none disabled:bg-muted" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ordem">
              <input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: +e.target.value })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none" />
            </Field>
            <Field label="Ativa">
              <label className="flex items-center gap-2 px-1 py-2.5 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 accent-level-purple" />
                Badge ativa
              </label>
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white">Cancelar</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white hover:bg-level-purple-dark disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? "Criar" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}
