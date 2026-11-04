"use client"

import { useState } from "react"
import { Edit3, Info, Loader2, Trash2 } from "lucide-react"
import { USER_ROLES, MAX_FULL_NAME_LENGTH, type AdminUpdateUserInput, type Profile } from "@levelusp/contracts"
import { RoleBadge } from "@/components/ui/badges"
import { cn, formatDate, formatNumber } from "@/lib/utils"
import { swalConfirm } from "@/lib/swal"
import { AdminModal } from "../admin-modal"
import { UserAvatar } from "./user-avatar"

const MAX_USERNAME_LENGTH = 32
const MAX_BIO_LENGTH = 500
const FIELD_CLASS = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
const LABEL_CLASS = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground"

export interface EditableUserFields {
  full_name: string
  username: string
  role: Profile["role"]
  suspended: boolean
  bio: string
}

function fieldsOf(user: Profile): EditableUserFields {
  return {
    full_name: user.full_name,
    username: user.username ?? "",
    role: user.role,
    suspended: user.suspended,
    bio: user.bio ?? "",
  }
}

/** Só o que mudou, no formato aceito por `PATCH /admin/users/:id`. */
export function userChanges(user: Profile, form: EditableUserFields): AdminUpdateUserInput {
  const changes: AdminUpdateUserInput = {}
  const fullName = form.full_name.trim()
  const username = form.username.trim()
  const bio = form.bio.trim() || null
  if (fullName !== user.full_name) changes.full_name = fullName
  if (username && username !== (user.username ?? "")) changes.username = username
  if (form.role !== user.role) changes.role = form.role
  if (form.suspended !== user.suspended) changes.suspended = form.suspended
  if (bio !== (user.bio ?? null)) changes.bio = bio
  return changes
}

interface UserEditModalProps {
  user: Profile
  isSelf?: boolean
  onClose: () => void
  onSave: (changes: AdminUpdateUserInput) => Promise<void>
  onDelete: (user: Profile) => Promise<void>
}

/** Edição de um usuário pelo admin. Montado com `key={user.id}`, então o formulário nasce do usuário aberto. */
export function UserEditModal({ user, isSelf, onClose, onSave, onDelete }: UserEditModalProps) {
  const [form, setForm] = useState<EditableUserFields>(() => fieldsOf(user))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const patch = (changes: Partial<EditableUserFields>) => setForm({ ...form, ...changes })
  const isBusy = isSaving || isDeleting

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(userChanges(user, form))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const isConfirmed = await swalConfirm({
      title: `Excluir permanentemente a conta de ${user.full_name}?`,
      text: "Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      danger: true,
    })
    if (!isConfirmed) return
    setIsDeleting(true)
    try {
      await onDelete(user)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AdminModal
      title={`Editar · ${user.full_name}`}
      accessibleName={`Editar ${user.full_name}`}
      icon={<Edit3 className="h-5 w-5" />}
      size="xl"
      isScrollable
      onClose={onClose}
      footerAlign="between"
      footer={
        <>
          <button
            onClick={handleDelete}
            disabled={isBusy || isSelf}
            className="flex items-center gap-1.5 text-sm font-bold text-destructive hover:underline disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Excluir conta
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isBusy}
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isBusy || !form.full_name.trim()}
              className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
            </button>
          </div>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-4 border-b border-border pb-4">
        <UserAvatar name={form.full_name || user.full_name} role={form.role} sizePx={56} />
        <div>
          <p className="text-base font-extrabold text-level-purple-dark">{form.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {user.email} · criado em {formatDate(user.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="edit-name" className={LABEL_CLASS}>Nome completo</label>
          <input
            id="edit-name"
            data-autofocus
            value={form.full_name}
            maxLength={MAX_FULL_NAME_LENGTH}
            onChange={(event) => patch({ full_name: event.target.value })}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="edit-username" className={LABEL_CLASS}>Username</label>
          <div className="flex items-center rounded-xl border border-border bg-white focus-within:border-level-purple">
            <span className="pl-3 font-mono text-sm text-muted-foreground">@</span>
            <input
              id="edit-username"
              value={form.username}
              maxLength={MAX_USERNAME_LENGTH}
              onChange={(event) => patch({ username: event.target.value.toLowerCase() })}
              className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
        <div>
          <p className={LABEL_CLASS}>E-mail</p>
          <p className="truncate rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground" title="O e-mail é alterado pelo próprio usuário">
            {user.email}
          </p>
        </div>
        <div className="col-span-2">
          <label htmlFor="edit-bio" className={LABEL_CLASS}>Bio</label>
          <textarea
            id="edit-bio"
            value={form.bio}
            maxLength={MAX_BIO_LENGTH}
            rows={2}
            onChange={(event) => patch({ bio: event.target.value })}
            className={cn(FIELD_CLASS, "resize-none")}
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold text-foreground">Papel na plataforma</p>
        <div className="grid grid-cols-3 gap-2">
          {USER_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              aria-pressed={form.role === role}
              // O admin não pode tirar o próprio acesso de administrador.
              disabled={isSelf && role !== "admin"}
              onClick={() => patch({ role })}
              className={cn(
                "rounded-xl border-2 p-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40",
                form.role === role ? "border-level-purple bg-level-purple-subtle" : "border-border hover:bg-muted",
              )}
            >
              <RoleBadge role={role} />
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={form.suspended}
          disabled={isSelf}
          onChange={(event) => patch({ suspended: event.target.checked })}
          className="h-4 w-4 accent-level-purple"
        />
        Conta suspensa (não consegue entrar)
      </label>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Nível", value: String(user.level) },
          { label: "XP total", value: formatNumber(user.total_xp) },
          { label: "Streak", value: `${user.current_streak}d` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="text-sm font-bold text-level-purple-dark">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p className="text-xs text-foreground">
          XP, nível e sequência só mudam pela correção no servidor. Para zerar, use “Resetar progresso” no perfil do usuário.
          Alterações são registradas no log de auditoria.
        </p>
      </div>
    </AdminModal>
  )
}
