"use client"

import { useState, useEffect } from "react"
import { Edit3, X, Trash2, Info, Loader2 } from "lucide-react"
import type { AdminUpdateUserInput, Profile, UserRole } from "@levelusp/contracts"
import { RoleBadge } from "@/components/ui/badges"
import { getInitials } from "@/lib/utils"
import { cn } from "@/lib/utils"

function AvatarInitials({ name, role, size = 36 }: { name: string; role: string; size?: number }) {
  const bg =
    role === "admin"
      ? "bg-destructive/10 text-destructive"
      : role === "teacher"
        ? "bg-level-purple-light text-level-purple-dark"
        : "bg-level-purple-subtle text-level-purple"
  return (
    <div
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", bg)}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name)}
    </div>
  )
}

interface EditableFields {
  full_name: string
  username: string
  role: UserRole
  suspended: boolean
  bio: string
}

function fieldsOf(user: Profile): EditableFields {
  return {
    full_name: user.full_name,
    username: user.username ?? "",
    role: user.role,
    suspended: user.suspended,
    bio: user.bio ?? "",
  }
}

/** Só o que mudou, no formato aceito por `PATCH /admin/users/:id`. */
export function userChanges(user: Profile, form: EditableFields): AdminUpdateUserInput {
  const changes: AdminUpdateUserInput = {}
  if (form.full_name.trim() !== user.full_name) changes.full_name = form.full_name.trim()
  if (form.username.trim() && form.username.trim() !== (user.username ?? "")) changes.username = form.username.trim()
  if (form.role !== user.role) changes.role = form.role
  if (form.suspended !== user.suspended) changes.suspended = form.suspended
  const bio = form.bio.trim() || null
  if (bio !== (user.bio ?? null)) changes.bio = bio
  return changes
}

interface UserEditModalProps {
  user: Profile
  isSelf?: boolean
  onClose: () => void
  onSave: (changes: AdminUpdateUserInput) => Promise<void>
  onDelete: (u: Profile) => Promise<void>
}

export function UserEditModal({ user, isSelf, onClose, onSave, onDelete }: UserEditModalProps) {
  const [form, setForm] = useState<EditableFields>(() => fieldsOf(user))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => setForm(fieldsOf(user)), [user])

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(userChanges(user, form)) } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Excluir permanentemente a conta de ${user.full_name}? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    try { await onDelete(user) } finally { setDeleting(false) }
  }

  const fieldClass = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-level-purple focus:outline-none"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label={`Editar ${user.full_name}`} className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple text-white">
              <Edit3 className="h-5 w-5" />
            </div>
            <p className="text-base font-extrabold text-level-purple-dark">Editar · {user.full_name}</p>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center gap-4 border-b border-border pb-4">
            <AvatarInitials name={form.full_name || user.full_name} role={form.role} size={56} />
            <div>
              <p className="text-base font-extrabold text-level-purple-dark">{form.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {user.email} · criado em {new Date(user.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="edit-name" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome completo</label>
              <input id="edit-name" value={form.full_name} maxLength={120} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="edit-username" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Username</label>
              <div className="flex items-center rounded-xl border border-border bg-white focus-within:border-level-purple">
                <span className="pl-3 font-mono text-sm text-muted-foreground">@</span>
                <input
                  id="edit-username"
                  value={form.username}
                  maxLength={32}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                  className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">E-mail</p>
              <p className="truncate rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground" title="O e-mail é alterado pelo próprio usuário">
                {user.email}
              </p>
            </div>
            <div className="col-span-2">
              <label htmlFor="edit-bio" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bio</label>
              <textarea id="edit-bio" value={form.bio} maxLength={500} rows={2} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`${fieldClass} resize-none`} />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-foreground">Papel na plataforma</p>
            <div className="grid grid-cols-3 gap-2">
              {(["student", "teacher", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={form.role === r}
                  disabled={isSelf && r !== "admin"}
                  onClick={() => setForm({ ...form, role: r })}
                  className={cn(
                    "rounded-xl border-2 p-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40",
                    form.role === r ? "border-level-purple bg-level-purple-subtle" : "border-border hover:bg-muted",
                  )}
                >
                  <RoleBadge role={r} />
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.suspended}
              disabled={isSelf}
              onChange={(e) => setForm({ ...form, suspended: e.target.checked })}
              className="h-4 w-4 accent-level-purple"
            />
            Conta suspensa (não consegue entrar)
          </label>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Nível", value: user.level },
              { label: "XP total", value: user.total_xp.toLocaleString("pt-BR") },
              { label: "Streak", value: `${user.current_streak}d` },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                <p className="text-sm font-bold text-level-purple-dark">{f.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <p className="text-xs text-foreground">
              XP, nível e sequência só mudam pela correção no servidor. Para zerar, use “Resetar progresso”
              no perfil do usuário. Alterações são registradas no log de auditoria.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
          <button
            onClick={handleDelete}
            disabled={deleting || saving || isSelf}
            className="flex items-center gap-1.5 text-sm font-bold text-destructive hover:underline disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Excluir conta
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || deleting || !form.full_name.trim()}
              className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
