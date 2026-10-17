"use client"

import { useState, type ReactNode } from "react"
import { Award, Edit3, Loader2, Plus, Trash2 } from "lucide-react"
import {
  BADGE_CRITERIA_TYPES, BADGE_ID_PATTERN, BADGE_RARITIES, type Badge, type BadgeCriteriaType, type BadgeInput, type BadgeRarity,
} from "@levelusp/contracts"
import { BadgeIcon } from "@/components/design-system/badge-icon"
import { LoadErrorAlert } from "@/components/design-system/load-error-alert"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { createBadge, deleteBadge, fetchAdminBadges, getErrorMessage, updateBadge } from "@/lib/api"
import { BADGE_ICON_NAMES } from "@/lib/badge-icons"
import type { OnToast } from "@/lib/types"
import { cn } from "@/lib/utils"
import { isOneOf } from "@/lib/utils/guards"
import { AdminModal, ModalCancelButton, ModalSubmitButton } from "./admin-modal"
import { PanelSpinner } from "./panel-spinner"

const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: "Comum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
}

const RARITY_CLASSES: Record<BadgeRarity, string> = {
  common: "bg-gray-100 text-gray-700",
  rare: "bg-blue-100 text-blue-700",
  epic: "bg-level-purple-light text-level-purple",
  legendary: "bg-yellow-100 text-yellow-700",
}

const CRITERIA_LABELS: Record<BadgeCriteriaType, string> = {
  total_xp: "XP total",
  current_streak: "Streak atual",
  max_streak: "Streak máximo",
  lessons_completed: "Lições completas",
  courses_completed: "Cursos completos",
  manual: "Manual",
}

const EMPTY_BADGE: BadgeInput = {
  id: "",
  name: "",
  description: "",
  icon: "Award",
  rarity: "common",
  criteria_type: "lessons_completed",
  criteria_value: 1,
  sort_order: 0,
  active: true,
}

const FIELD_CLASS = "w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"

type BadgeEditor = { mode: "create" | "edit"; form: BadgeInput }

function toBadgeInput(badge: Badge): BadgeInput {
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    rarity: badge.rarity,
    criteria_type: badge.criteria_type,
    criteria_value: badge.criteria_value,
    sort_order: badge.sort_order,
    active: badge.active,
  }
}

/** Primeira mensagem de erro do formulário, ou `null` quando pode salvar. */
export function validateBadgeForm({ mode, form }: BadgeEditor): string | null {
  if (!form.id.trim() || !form.name.trim()) return "ID e nome são obrigatórios"
  if (mode === "create" && !BADGE_ID_PATTERN.test(form.id.trim())) return "ID: use 2 a 40 letras minúsculas, números, _ ou -"
  return null
}

function describeCriteria(badge: Badge): string {
  if (badge.criteria_type === "manual") return "Manual"
  return `${CRITERIA_LABELS[badge.criteria_type]} ≥ ${badge.criteria_value}`
}

interface BadgesAdminPageProps {
  onToast: OnToast
}

export function BadgesAdminPage({ onToast }: BadgesAdminPageProps) {
  const badges = useAsyncResource(() => fetchAdminBadges(), [], { errorMessage: "Não foi possível carregar as badges." })
  const [editor, setEditor] = useState<BadgeEditor | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSave = async () => {
    if (!editor) return
    const invalid = validateBadgeForm(editor)
    if (invalid) {
      onToast(invalid, "warning")
      return
    }
    setIsSaving(true)
    try {
      if (editor.mode === "create") {
        await createBadge({ ...editor.form, id: editor.form.id.trim() })
        onToast("Badge criada", "success")
      } else {
        const { id, ...changes } = editor.form
        await updateBadge(id, changes)
        onToast("Badge atualizada", "success")
      }
      setEditor(null)
      await badges.reload()
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao salvar badge"), "danger")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (badgeId: string) => {
    if (!window.confirm("Excluir esta badge? Quem já a conquistou deixará de exibi-la.")) return
    setDeletingId(badgeId)
    try {
      await deleteBadge(badgeId)
      onToast("Badge excluída", "danger")
      await badges.reload()
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao excluir badge"), "danger")
    } finally {
      setDeletingId(null)
    }
  }

  if (badges.status === "loading") return <PanelSpinner />

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-level-purple-dark">Badges</h2>
          <p className="text-sm text-muted-foreground">Catálogo de conquistas e seus critérios</p>
        </div>
        <button
          onClick={() => setEditor({ mode: "create", form: { ...EMPTY_BADGE } })}
          className="flex items-center gap-1.5 rounded-xl bg-level-purple px-4 py-2 text-sm font-semibold text-white hover:bg-level-purple-dark"
        >
          <Plus className="h-4 w-4" /> Nova badge
        </button>
      </div>

      {badges.status === "error" ? (
        <LoadErrorAlert message={badges.error} onRetry={() => void badges.reload()} />
      ) : (
        <BadgesTable
          badges={badges.data}
          deletingId={deletingId}
          onEdit={(badge) => setEditor({ mode: "edit", form: toBadgeInput(badge) })}
          onDelete={handleDelete}
        />
      )}

      {editor && (
        <BadgeEditModal
          editor={editor}
          isSaving={isSaving}
          onChange={(form) => setEditor({ ...editor, form })}
          onClose={() => setEditor(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

interface BadgesTableProps {
  badges: Badge[]
  deletingId: string | null
  onEdit: (badge: Badge) => void
  onDelete: (badgeId: string) => void
}

function BadgesTable({ badges, deletingId, onEdit, onDelete }: BadgesTableProps) {
  return (
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
          {badges.map((badge) => (
            <tr key={badge.id} className="hover:bg-muted/20">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-level-purple-light text-level-purple">
                    <BadgeIcon name={badge.icon} className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-level-purple-dark">{badge.name}</p>
                    <p className="text-[11px] text-muted-foreground">{badge.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RARITY_CLASSES[badge.rarity])}>
                  {RARITY_LABELS[badge.rarity]}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{describeCriteria(badge)}</td>
              <td className="px-4 py-3">
                <span className={cn("inline-block h-2 w-2 rounded-full", badge.active ? "bg-success" : "bg-muted-foreground/40")} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(badge)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple"
                    title="Editar"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(badge.id)}
                    disabled={deletingId === badge.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                    title="Excluir"
                  >
                    {deletingId === badge.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {badges.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                <Award className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                Nenhuma badge no catálogo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

interface BadgeEditModalProps {
  editor: BadgeEditor
  isSaving: boolean
  onChange: (form: BadgeInput) => void
  onClose: () => void
  onSave: () => void
}

function BadgeEditModal({ editor: { mode, form }, isSaving, onChange, onClose, onSave }: BadgeEditModalProps) {
  const patch = (changes: Partial<BadgeInput>) => onChange({ ...form, ...changes })
  const isCreating = mode === "create"

  return (
    <AdminModal
      title={isCreating ? "Nova badge" : `Editar · ${form.name}`}
      icon={<BadgeIcon name={form.icon} className="h-5 w-5" />}
      size="lg"
      isScrollable
      bodyClassName="space-y-3 p-6"
      onClose={onClose}
      footer={
        <>
          <ModalCancelButton onClick={onClose} />
          <ModalSubmitButton onClick={onSave} isBusy={isSaving}>
            {isCreating ? "Criar" : "Salvar"}
          </ModalSubmitButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="ID (slug)" htmlFor="badge-id">
          <input
            id="badge-id"
            data-autofocus={isCreating || undefined}
            value={form.id}
            disabled={!isCreating}
            onChange={(event) => patch({ id: event.target.value })}
            placeholder="ex: streak-7"
            className={cn(FIELD_CLASS, "font-mono disabled:bg-muted")}
          />
        </Field>
        <Field label="Nome" htmlFor="badge-name">
          <input
            id="badge-name"
            data-autofocus={!isCreating || undefined}
            value={form.name}
            onChange={(event) => patch({ name: event.target.value })}
            className={FIELD_CLASS}
          />
        </Field>
      </div>

      <Field label="Descrição" htmlFor="badge-description">
        <input id="badge-description" value={form.description} onChange={(event) => patch({ description: event.target.value })} className={FIELD_CLASS} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ícone" htmlFor="badge-icon">
          <select id="badge-icon" value={form.icon} onChange={(event) => patch({ icon: event.target.value })} className={FIELD_CLASS}>
            {BADGE_ICON_NAMES.map((iconName) => (
              <option key={iconName} value={iconName}>{iconName}</option>
            ))}
          </select>
        </Field>
        <Field label="Raridade" htmlFor="badge-rarity">
          <select
            id="badge-rarity"
            value={form.rarity}
            onChange={(event) => {
              if (isOneOf(BADGE_RARITIES, event.target.value)) patch({ rarity: event.target.value })
            }}
            className={FIELD_CLASS}
          >
            {BADGE_RARITIES.map((rarity) => (
              <option key={rarity} value={rarity}>{RARITY_LABELS[rarity]}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Critério" htmlFor="badge-criteria">
          <select
            id="badge-criteria"
            value={form.criteria_type}
            onChange={(event) => {
              if (isOneOf(BADGE_CRITERIA_TYPES, event.target.value)) patch({ criteria_type: event.target.value })
            }}
            className={FIELD_CLASS}
          >
            {BADGE_CRITERIA_TYPES.map((criteria) => (
              <option key={criteria} value={criteria}>{CRITERIA_LABELS[criteria]}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor do critério" htmlFor="badge-criteria-value">
          <input
            id="badge-criteria-value"
            type="number"
            value={form.criteria_value}
            onChange={(event) => patch({ criteria_value: Number(event.target.value) })}
            disabled={form.criteria_type === "manual"}
            className={cn(FIELD_CLASS, "disabled:bg-muted")}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ordem" htmlFor="badge-sort-order">
          <input
            id="badge-sort-order"
            type="number"
            value={form.sort_order}
            onChange={(event) => patch({ sort_order: Number(event.target.value) })}
            className={FIELD_CLASS}
          />
        </Field>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ativa</p>
          <label className="flex items-center gap-2 px-1 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => patch({ active: event.target.checked })}
              className="h-4 w-4 accent-level-purple"
            />
            Badge ativa
          </label>
        </div>
      </div>
    </AdminModal>
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  children: ReactNode
}

function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
