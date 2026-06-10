"use client"

import { useState, useEffect } from "react"
import { Edit3, X, Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { RoleBadge } from "@/components/ui/badges"
import type { Profile } from "@/lib/supabase/types"

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

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

interface UserEditModalProps {
  user: Profile
  onClose: () => void
  onSave: (u: Profile) => Promise<void>
  onDelete: (u: Profile) => Promise<void>
}

export function UserEditModal({ user, onClose, onSave, onDelete }: UserEditModalProps) {
  const [form, setForm] = useState(user)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => setForm(user), [user.id])

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await onDelete(user) } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple text-white">
              <Edit3 className="h-5 w-5" />
            </div>
            <p className="text-base font-extrabold text-level-purple-dark">Editar · {user.full_name}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center gap-4 border-b border-border pb-4">
            <AvatarInitials name={form.full_name} role={form.role} size={56} />
            <div>
              <p className="text-base font-extrabold text-level-purple-dark">{form.full_name}</p>
              <p className="text-xs text-muted-foreground">
                @{form.username} · criado em{" "}
                {new Date(form.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome completo</p>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Username</p>
              <div className="flex items-center rounded-xl border border-border bg-white focus-within:border-level-purple">
                <span className="pl-3 font-mono text-sm text-muted-foreground">@</span>
                <input
                  value={form.username ?? ""}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</p>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-foreground">Papel na plataforma</p>
            <div className="grid grid-cols-3 gap-2">
              {(["student", "teacher", "admin"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setForm({ ...form, role: r })}
                  className={cn(
                    "rounded-xl border-2 p-3 text-center transition-all",
                    form.role === r
                      ? "border-level-purple bg-level-purple-subtle"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <RoleBadge role={r} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {(
              [
                { key: "level",           label: "Nível" },
                { key: "total_xp",        label: "XP total" },
                { key: "current_streak",  label: "Streak" },
              ] as const
            ).map((f) => (
              <div key={f.key}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                <input
                  type="number"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: +e.target.value })}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold focus:border-level-purple focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-xs font-semibold text-warning">
              Alterações em XP e nível manuais são registradas no log de auditoria.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
          <button
            onClick={handleDelete}
            disabled={deleting || saving}
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
              disabled={saving || deleting}
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
