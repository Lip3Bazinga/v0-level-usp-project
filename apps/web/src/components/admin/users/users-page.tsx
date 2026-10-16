"use client"

import { useState, useMemo } from "react"
import {
  Search, Download, Plus, Eye, Edit3, Shield,
  Zap, Flame, Trophy, Users, BookOpen, Ban, X, ChevronRight, Loader2,
} from "lucide-react"
import { RoleBadge } from "@/components/ui/badges"
import { UserEditModal } from "./user-edit-modal"
import { UserDetail } from "./user-detail"
import {
  updateUserRole, updateUserProfile, deleteUser, setUserSuspended,
  inviteUser, exportToCsv,
} from "@/lib/supabase/admin"
import type { Profile } from "@/lib/supabase/types"
import { getInitials } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { OnToast } from "@/lib/types"


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

interface UsersPageProps {
  users: Profile[]
  setUsers: (u: Profile[] | ((p: Profile[]) => Profile[])) => void
  onToast: OnToast
  currentUserId?: string
}

export function UsersPageEnhanced({ users, setUsers, onToast, currentUserId }: UsersPageProps) {
  const [q, setQ] = useState("")
  const [role, setRole] = useState("all")
  const [sort, setSort] = useState("xp-desc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkRole, setShowBulkRole] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [detailUser, setDetailUser] = useState<Profile | null>(null)

  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      const matchQ = !q || [u.full_name, u.email, u.username].some((x) => (x ?? "").toLowerCase().includes(q.toLowerCase()))
      const matchR = role === "all" || u.role === role
      return matchQ && matchR
    })
    if (sort === "xp-desc")   list = [...list].sort((a, b) => b.total_xp - a.total_xp)
    if (sort === "xp-asc")    list = [...list].sort((a, b) => a.total_xp - b.total_xp)
    if (sort === "name")      list = [...list].sort((a, b) => a.full_name.localeCompare(b.full_name))
    if (sort === "recent")    list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (sort === "lessons")   list = [...list].sort((a, b) => b.lessons_completed - a.lessons_completed)
    return list
  }, [users, q, role, sort])

  const allSelected  = filtered.length > 0 && filtered.every((u) => selected.has(u.id))
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map((u) => u.id)))
  }
  const toggleOne = (id: string) => {
    const n = new Set(selected)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setSelected(n)
  }

  const applyBulkRole = async (r: "student" | "teacher" | "admin") => {
    for (const id of [...selected]) {
      try { await updateUserRole(id, r) } catch { /* ignore */ }
    }
    setUsers((prev) => prev.map((u) => (selected.has(u.id) ? { ...u, role: r } : u)))
    onToast(`${selected.size} usuário(s) promovido(s) para ${r}`, "success")
    setSelected(new Set())
    setShowBulkRole(false)
  }

  const applyBulkSuspend = async () => {
    const ids = [...selected]
    for (const id of ids) {
      try { await setUserSuspended(id, true) } catch { /* ignore */ }
    }
    setUsers((prev) => prev.map((u) => (selected.has(u.id) ? { ...u, suspended: true } : u)))
    onToast(`${ids.length} usuário(s) suspenso(s)`, "warning")
    setSelected(new Set())
  }

  const exportUsers = (onlySelected: boolean) => {
    const rows = (onlySelected ? filtered.filter((u) => selected.has(u.id)) : filtered).map((u) => ({
      id: u.id,
      nome: u.full_name,
      username: u.username ?? "",
      email: u.email,
      papel: u.role,
      nivel: u.level,
      xp: u.total_xp,
      licoes: u.lessons_completed,
      streak: u.current_streak,
      suspenso: u.suspended ? "sim" : "não",
      criado_em: u.created_at,
    }))
    if (rows.length === 0) { onToast("Nenhum usuário para exportar", "warning"); return }
    exportToCsv(rows, `usuarios-${new Date().toISOString().slice(0, 10)}.csv`)
    if (onlySelected) setSelected(new Set())
  }

  const handleInvite = async () => {
    const email = window.prompt("Email do usuário a convidar:")
    if (!email) return
    try {
      await inviteUser(email.trim())
      onToast("Convite enviado por email", "success")
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Erro ao convidar", "danger")
    }
  }

  const counts = {
    all:     users.length,
    student: users.filter((u) => u.role === "student").length,
    teacher: users.filter((u) => u.role === "teacher").length,
    admin:   users.filter((u) => u.role === "admin").length,
  }

  if (detailUser) {
    return (
      <UserDetail
        user={detailUser}
        users={users}
        setUsers={setUsers}
        onBack={() => setDetailUser(null)}
        onToast={onToast}
      />
    )
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
            onClick={() => exportUsers(false)}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
          <button
            onClick={handleInvite}
            className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" /> Convidar usuário
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "student", "teacher", "admin"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap",
              role === r
                ? r === "admin" ? "bg-destructive text-white shadow-sm" : "bg-level-purple text-white shadow-sm"
                : r === "admin" ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                : "bg-muted text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple",
            )}
          >
            {r === "all" ? `Todos · ${counts.all}` : r === "student" ? `Alunos · ${counts.student}` : r === "teacher" ? `Professores · ${counts.teacher}` : `Admins · ${counts.admin}`}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/20 p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, email, username..."
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-level-purple focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold focus:border-level-purple focus:outline-none"
          >
            <option value="xp-desc">Maior XP</option>
            <option value="xp-asc">Menor XP</option>
            <option value="name">Nome (A→Z)</option>
            <option value="lessons">Mais lições</option>
            <option value="recent">Mais recentes</option>
          </select>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-level-purple-subtle px-4 py-2.5">
            <p className="text-sm font-bold text-level-purple-dark">
              <span className="rounded-md bg-level-purple px-2 py-0.5 text-xs text-white">{selected.size}</span>{" "}
              selecionado(s)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkRole(true)}
                className="flex items-center gap-1.5 rounded-lg border border-level-purple bg-white px-3 py-1.5 text-xs font-bold text-level-purple hover:bg-level-purple hover:text-white"
              >
                <Shield className="h-3 w-3" /> Alterar role
              </button>
              <button
                onClick={() => exportUsers(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3 w-3" /> Exportar
              </button>
              <button
                onClick={applyBulkSuspend}
                className="flex items-center gap-1.5 rounded-lg border border-warning bg-white px-3 py-1.5 text-xs font-bold text-warning hover:bg-warning hover:text-white"
              >
                <Ban className="h-3 w-3" /> Suspender
              </button>
              <button onClick={() => setSelected(new Set())} className="ml-2 text-xs font-bold text-muted-foreground hover:text-destructive">
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
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleAll}
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
            {filtered.map((u) => {
              const isSel = selected.has(u.id)
              return (
                <tr key={u.id} className={cn("transition-colors hover:bg-level-purple-subtle/30", isSel && "bg-level-purple-subtle/20")}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={isSel} onChange={() => toggleOne(u.id)} className="h-4 w-4 rounded border-border accent-level-purple" />
                  </td>
                  <td className="px-2 py-3">
                    <button onClick={() => setDetailUser(u)} className="flex items-center gap-3 text-left">
                      <AvatarInitials name={u.full_name} role={u.role} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-level-purple-dark">{u.full_name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">@{u.username} · {u.email}</p>
                      </div>
                    </button>
                  </td>
                  <td className="hidden px-2 py-3 md:table-cell"><RoleBadge role={u.role} /></td>
                  <td className="hidden px-2 py-3 text-right lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-level-purple-dark">
                      <Trophy className="h-3 w-3 text-warning" /> {u.level}
                    </span>
                  </td>
                  <td className="hidden px-2 py-3 text-right lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-level-purple">
                      <Zap className="h-3 w-3" /> {u.total_xp.toLocaleString("pt-BR")}
                    </span>
                  </td>
                  <td className="hidden px-2 py-3 text-right font-bold text-foreground lg:table-cell">{u.lessons_completed}</td>
                  <td className="hidden px-2 py-3 xl:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-warning">
                      <Flame className="h-3 w-3" /> {u.current_streak}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => setDetailUser(u)} title="Ver perfil" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditUser(u)} title="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
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
              Mostrando <b className="text-foreground">{filtered.length}</b> de{" "}
              <b className="text-foreground">{users.length}</b>
            </p>
          </div>
        )}
      </div>

      {showBulkRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <p className="text-base font-extrabold text-level-purple-dark">Alterar papel de {selected.size} usuário(s)</p>
              </div>
              <button onClick={() => setShowBulkRole(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 p-6">
              <p className="mb-3 text-xs text-muted-foreground">Esta ação é registrada no log de auditoria.</p>
              {(
                [
                  { r: "student" as const, label: "Aluno",          desc: "Acesso às lições publicadas", danger: false },
                  { r: "teacher" as const, label: "Professor",       desc: "Criar e editar lições",       danger: false },
                  { r: "admin"   as const, label: "Administrador",   desc: "Acesso total",                danger: true  },
                ]
              ).map((o) => (
                <button
                  key={o.r}
                  onClick={() => applyBulkRole(o.r)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                    o.danger ? "border-border hover:border-destructive hover:bg-destructive/5" : "border-border hover:border-level-purple hover:bg-level-purple-subtle",
                  )}
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", o.danger ? "bg-destructive/10 text-destructive" : "bg-level-purple-light text-level-purple")}>
                    {o.r === "admin" ? <Shield className="h-4 w-4" /> : o.r === "teacher" ? <BookOpen className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-level-purple-dark">{o.label}</p>
                    <p className="text-[11px] text-muted-foreground">{o.desc}</p>
                  </div>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <UserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={async (u) => {
            try {
              await updateUserProfile(u.id, {
                full_name: u.full_name,
                username: u.username,
                email: u.email,
                role: u.role,
                level: u.level,
                total_xp: u.total_xp,
                current_streak: u.current_streak,
              })
              setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)))
              setEditUser(null)
              onToast("Usuário atualizado", "success")
            } catch (e) {
              onToast(e instanceof Error ? e.message : "Erro ao salvar", "danger")
            }
          }}
          onDelete={async (u) => {
            try {
              await deleteUser(u.id)
              setUsers((prev) => prev.filter((x) => x.id !== u.id))
              setEditUser(null)
              onToast("Conta excluída", "danger")
            } catch (e) {
              onToast(e instanceof Error ? e.message : "Erro ao excluir", "danger")
            }
          }}
        />
      )}
    </div>
  )
}
