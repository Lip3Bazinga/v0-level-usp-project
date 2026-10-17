"use client"

import { useMemo, useState } from "react"
import { Ban, Download, Edit3, Eye, Flame, Plus, Search, Shield, Trophy, Users, Zap } from "lucide-react"
import type { AdminUpdateUserInput, Profile, UserRole } from "@levelusp/contracts"
import { RoleBadge } from "@/components/ui/badges"
import {
  deleteUser, getErrorMessage, inviteUser, setUserSuspended, updateUserProfile, updateUserRole,
} from "@/lib/api"
import type { OnToast } from "@/lib/types"
import { cn, downloadCsv, formatNumber, indexBy, todayKey, isOneOf } from "@/lib/utils"
import type { ListUpdate } from "../use-admin-dashboard"
import { BulkRoleModal } from "./bulk-role-modal"
import { UserAvatar } from "./user-avatar"
import { UserDetail } from "./user-detail"
import { UserEditModal } from "./user-edit-modal"
import {
  USER_SORTS, USER_SORT_IDS, countByRole, filterUsers, runForEachUser, toUserCsvRows, type RoleFilter, type UserSortId,
} from "./user-list"

const ROLE_LABELS: Record<UserRole, string> = { student: "aluno", teacher: "professor", admin: "administrador" }

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "student", label: "Alunos" },
  { id: "teacher", label: "Professores" },
  { id: "admin", label: "Admins" },
]

const ICON_ACTION_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"

interface UsersPageProps {
  users: Profile[]
  updateUsers: ListUpdate<Profile>
  onToast: OnToast
  currentUserId?: string
}

export function UsersPage({ users, updateUsers, onToast, currentUserId }: UsersPageProps) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [sort, setSort] = useState<UserSortId>("xp-desc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkRoleOpen, setIsBulkRoleOpen] = useState(false)
  const [isBulkBusy, setIsBulkBusy] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [detailUser, setDetailUser] = useState<Profile | null>(null)

  const filtered = useMemo(() => filterUsers(users, { search, role: roleFilter, sort }), [users, search, roleFilter, sort])
  const counts = countByRole(users)
  const areAllSelected = filtered.length > 0 && filtered.every((user) => selectedIds.has(user.id))
  const isPartiallySelected = selectedIds.size > 0 && !areAllSelected
  const clearSelection = () => setSelectedIds(new Set())

  const handleToggleAll = () => setSelectedIds(areAllSelected ? new Set() : new Set(filtered.map((user) => user.id)))
  const handleToggleOne = (userId: string) => {
    const next = new Set(selectedIds)
    if (next.has(userId)) next.delete(userId)
    else next.add(userId)
    setSelectedIds(next)
  }

  /** O próprio admin fica fora das ações em massa (evita se rebaixar/suspender sem querer). */
  const bulkTargetIds = () => {
    const targetIds = [...selectedIds].filter((userId) => userId !== currentUserId)
    if (targetIds.length < selectedIds.size) onToast("Sua própria conta foi ignorada na ação em massa", "info")
    return targetIds
  }

  const mergeUpdated = (updated: Profile[]) => {
    const updatedById = indexBy(updated, (user) => user.id)
    updateUsers((current) => current.map((user) => updatedById.get(user.id) ?? user))
  }

  const handleBulkRole = async (role: UserRole) => {
    setIsBulkBusy(true)
    const { updated, failedCount, firstError } = await runForEachUser(bulkTargetIds(), (userId) => updateUserRole(userId, role))
    setIsBulkBusy(false)
    mergeUpdated(updated)
    if (updated.length) onToast(`${updated.length} usuário(s) agora com papel de ${ROLE_LABELS[role]}`, "success")
    if (failedCount) onToast(`${failedCount} não alterado(s): ${getErrorMessage(firstError)}`, "error")
    clearSelection()
    setIsBulkRoleOpen(false)
  }

  const handleBulkSuspend = async () => {
    setIsBulkBusy(true)
    const { updated, failedCount, firstError } = await runForEachUser(bulkTargetIds(), (userId) => setUserSuspended(userId, true))
    setIsBulkBusy(false)
    mergeUpdated(updated)
    if (updated.length) onToast(`${updated.length} usuário(s) suspenso(s)`, "warning")
    if (failedCount) onToast(`${failedCount} não suspenso(s): ${getErrorMessage(firstError)}`, "error")
    clearSelection()
  }

  const handleExport = (isOnlySelected: boolean) => {
    const rows = toUserCsvRows(isOnlySelected ? filtered.filter((user) => selectedIds.has(user.id)) : filtered)
    if (rows.length === 0) {
      onToast("Nenhum usuário para exportar", "warning")
      return
    }
    downloadCsv(rows, `usuarios-${todayKey()}.csv`)
    if (isOnlySelected) clearSelection()
  }

  const handleInvite = async () => {
    const email = window.prompt("E-mail do usuário a convidar:")
    if (!email?.trim()) return
    try {
      const invited = await inviteUser(email.trim())
      updateUsers((current) => (current.some((user) => user.id === invited.id) ? current : [invited, ...current]))
      onToast("Convite enviado por e-mail", "success")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao convidar"), "error")
    }
  }

  const handleSaveUser = async (user: Profile, changes: AdminUpdateUserInput) => {
    if (!Object.keys(changes).length) {
      setEditingUser(null)
      return
    }
    try {
      const updated = await updateUserProfile(user.id, changes)
      updateUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setEditingUser(null)
      onToast("Usuário atualizado", "success")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao salvar"), "error")
    }
  }

  const handleDeleteUser = async (user: Profile) => {
    try {
      await deleteUser(user.id)
      updateUsers((current) => current.filter((item) => item.id !== user.id))
      setEditingUser(null)
      onToast("Conta excluída", "error")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao excluir"), "error")
    }
  }

  if (detailUser) {
    return <UserDetail user={detailUser} users={users} updateUsers={updateUsers} onBack={() => setDetailUser(null)} onToast={onToast} />
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-level-purple-dark">Gestão de usuários</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} de {users.length} usuários</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport(false)}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
          <button onClick={handleInvite} className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> Convidar usuário
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ROLE_FILTERS.map((filter) => {
          const isAdminFilter = filter.id === "admin"
          return (
            <button
              key={filter.id}
              onClick={() => setRoleFilter(filter.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap",
                roleFilter === filter.id
                  ? isAdminFilter ? "bg-destructive text-white shadow-sm" : "bg-level-purple text-white shadow-sm"
                  : isAdminFilter
                    ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    : "bg-muted text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple",
              )}
            >
              {filter.label} · {counts[filter.id]}
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/20 p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Buscar usuários"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, email, username..."
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-level-purple focus:outline-none"
            />
          </div>
          <select
            aria-label="Ordenar usuários"
            value={sort}
            onChange={(event) => {
              if (isOneOf(USER_SORT_IDS, event.target.value)) setSort(event.target.value)
            }}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold focus:border-level-purple focus:outline-none"
          >
            {USER_SORTS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-level-purple-subtle px-4 py-2.5">
            <p className="text-sm font-bold text-level-purple-dark">
              <span className="rounded-md bg-level-purple px-2 py-0.5 text-xs text-white">{selectedIds.size}</span> selecionado(s)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBulkRoleOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-level-purple bg-white px-3 py-1.5 text-xs font-bold text-level-purple hover:bg-level-purple hover:text-white"
              >
                <Shield className="h-3 w-3" /> Alterar role
              </button>
              <button
                onClick={() => handleExport(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3 w-3" /> Exportar
              </button>
              <button
                onClick={handleBulkSuspend}
                disabled={isBulkBusy}
                className="flex items-center gap-1.5 rounded-lg border border-warning bg-white px-3 py-1.5 text-xs font-bold text-warning hover:bg-warning hover:text-white"
              >
                <Ban className="h-3 w-3" /> Suspender
              </button>
              <button onClick={clearSelection} className="ml-2 text-xs font-bold text-muted-foreground hover:text-destructive">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-left">
          <thead className="bg-muted/30">
            <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={areAllSelected}
                  aria-label="Selecionar todos"
                  ref={(checkbox) => {
                    if (checkbox) checkbox.indeterminate = isPartiallySelected
                  }}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-border accent-level-purple"
                />
              </th>
              <th className="px-2 py-2.5">Usuário</th>
              <th className="hidden px-2 py-2.5 md:table-cell">Papel</th>
              <th className="hidden px-2 py-2.5 text-right lg:table-cell">Nível</th>
              <th className="hidden px-2 py-2.5 text-right lg:table-cell">XP</th>
              <th className="hidden px-2 py-2.5 text-right lg:table-cell">Lições</th>
              <th className="hidden px-2 py-2.5 xl:table-cell">Streak</th>
              <th className="w-28 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelected={selectedIds.has(user.id)}
                onToggleSelected={() => handleToggleOne(user.id)}
                onOpenDetail={() => setDetailUser(user)}
                onEdit={() => setEditingUser(user)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm font-semibold text-muted-foreground">Nenhum usuário encontrado</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3 text-xs">
            <p className="text-muted-foreground">
              Mostrando <b className="text-foreground">{filtered.length}</b> de <b className="text-foreground">{users.length}</b>
            </p>
          </div>
        )}
      </div>

      {isBulkRoleOpen && (
        <BulkRoleModal
          selectedCount={selectedIds.size}
          isBusy={isBulkBusy}
          onSelectRole={handleBulkRole}
          onClose={() => setIsBulkRoleOpen(false)}
        />
      )}

      {editingUser && (
        <UserEditModal
          key={editingUser.id}
          user={editingUser}
          isSelf={editingUser.id === currentUserId}
          onClose={() => setEditingUser(null)}
          onSave={(changes) => handleSaveUser(editingUser, changes)}
          onDelete={handleDeleteUser}
        />
      )}
    </div>
  )
}

interface UserRowProps {
  user: Profile
  isSelected: boolean
  onToggleSelected: () => void
  onOpenDetail: () => void
  onEdit: () => void
}

function UserRow({ user, isSelected, onToggleSelected, onOpenDetail, onEdit }: UserRowProps) {
  return (
    <tr className={cn("transition-colors hover:bg-level-purple-subtle/30", isSelected && "bg-level-purple-subtle/20")}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          aria-label={`Selecionar ${user.full_name}`}
          checked={isSelected}
          onChange={onToggleSelected}
          className="h-4 w-4 rounded border-border accent-level-purple"
        />
      </td>
      <td className="px-2 py-3">
        <button onClick={onOpenDetail} className="flex items-center gap-3 text-left">
          <UserAvatar name={user.full_name} role={user.role} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-bold text-level-purple-dark">
              {user.full_name}
              {user.suspended && <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning">suspenso</span>}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.username ? `@${user.username} · ` : ""}
              {user.email}
            </p>
          </div>
        </button>
      </td>
      <td className="hidden px-2 py-3 md:table-cell"><RoleBadge role={user.role} /></td>
      <td className="hidden px-2 py-3 text-right lg:table-cell">
        <span className="inline-flex items-center gap-1 text-sm font-bold text-level-purple-dark">
          <Trophy className="h-3 w-3 text-warning" /> {user.level}
        </span>
      </td>
      <td className="hidden px-2 py-3 text-right lg:table-cell">
        <span className="inline-flex items-center gap-1 text-sm font-bold text-level-purple">
          <Zap className="h-3 w-3" /> {formatNumber(user.total_xp)}
        </span>
      </td>
      <td className="hidden px-2 py-3 text-right font-bold text-foreground lg:table-cell">{user.lessons_completed}</td>
      <td className="hidden px-2 py-3 xl:table-cell">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-warning">
          <Flame className="h-3 w-3" /> {user.current_streak}
        </span>
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center justify-end gap-0.5">
          <button onClick={onOpenDetail} title="Ver perfil" className={ICON_ACTION_CLASS}>
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button onClick={onEdit} title="Editar" className={ICON_ACTION_CLASS}>
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}
