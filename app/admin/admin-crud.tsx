"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Search, Download, Plus, Eye, Edit3, Trash2, Globe, EyeOff,
  ChevronLeft, Zap, Flame, Trophy, Users, BookOpen, Shield,
  AlertTriangle, Check, X, Ban, Key, RefreshCw, Mail,
  Activity, Star, Clock, Lock, List, Grid3X3, Columns,
  Copy, Loader2, FileText, ChevronRight,
} from "lucide-react"
import { updateUserRole } from "@/lib/supabase/admin"
import { toggleLessonPublished, deleteLesson } from "@/lib/supabase/lessons"
import type { Profile, Lesson } from "@/lib/supabase/types"
import { swalConfirm, swalError, swalToast, swalSuccess } from "@/lib/swal"

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

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

function RoleBadge({ role, size = "md" }: { role: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
  if (role === "admin")
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-destructive/10 font-semibold text-destructive", sz)}>
        <Shield className="h-2.5 w-2.5" /> Admin
      </span>
    )
  if (role === "teacher")
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-level-purple-light font-semibold text-level-purple-dark", sz)}>
        <BookOpen className="h-2.5 w-2.5" /> Professor
      </span>
    )
  return (
    <span className={cn("inline-flex items-center rounded-full bg-muted font-semibold text-muted-foreground", sz)}>
      Aluno
    </span>
  )
}

function DiffBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    iniciante: "bg-success/10 text-success",
    intermediario: "bg-warning/10 text-warning",
    avancado: "bg-destructive/10 text-destructive",
  }
  const label = d === "iniciante" ? "Iniciante" : d === "intermediario" ? "Intermediário" : "Avançado"
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", map[d])}>
      {label}
    </span>
  )
}

function PubBadge({ published }: { published: boolean }) {
  if (published)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Publicada
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" /> Rascunho
    </span>
  )
}

function IconBtn({
  title, onClick, children, tone = "neutral", size = "md",
}: {
  title?: string; onClick?: () => void; children: React.ReactNode
  tone?: "neutral" | "danger" | "success" | "warning"; size?: "sm" | "md"
}) {
  const tones = {
    neutral: "text-muted-foreground hover:bg-level-purple-light hover:text-level-purple",
    danger: "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
    success: "text-success hover:bg-success/10",
    warning: "text-warning hover:bg-warning/10",
  }
  const sizes = { sm: "h-8 w-8", md: "h-9 w-9" }
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn("flex items-center justify-center rounded-lg transition-colors", tones[tone], sizes[size])}
    >
      {children}
    </button>
  )
}

// ── Enhanced Users Page ────────────────────────────────────────────────────────

export function UsersPageEnhanced({
  users,
  setUsers,
  onToast,
  currentUserId,
}: {
  users: Profile[]
  setUsers: (u: Profile[] | ((p: Profile[]) => Profile[])) => void
  onToast: (msg: string, kind?: "success" | "danger" | "info" | "warning") => void
  currentUserId?: string
}) {
  const [q, setQ] = useState("")
  const [role, setRole] = useState("all")
  const [sort, setSort] = useState("xp-desc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkRole, setShowBulkRole] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [detailUser, setDetailUser] = useState<Profile | null>(null)
  const [changingId, setChangingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      const matchQ =
        !q ||
        [u.full_name, u.email, u.username].some((x) =>
          (x ?? "").toLowerCase().includes(q.toLowerCase()),
        )
      const matchR = role === "all" || u.role === role
      return matchQ && matchR
    })
    if (sort === "xp-desc") list = [...list].sort((a, b) => b.total_xp - a.total_xp)
    else if (sort === "xp-asc") list = [...list].sort((a, b) => a.total_xp - b.total_xp)
    else if (sort === "name") list = [...list].sort((a, b) => a.full_name.localeCompare(b.full_name))
    else if (sort === "recent")
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sort === "lessons") list = [...list].sort((a, b) => b.lessons_completed - a.lessons_completed)
    return list
  }, [users, q, role, sort])

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id))
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
    const ids = [...selected]
    for (const id of ids) {
      try {
        await updateUserRole(id, r)
      } catch { /* ignore */ }
    }
    setUsers((prev) => prev.map((u) => (selected.has(u.id) ? { ...u, role: r } : u)))
    onToast(`${selected.size} usuário(s) promovido(s) para ${r}`, "success")
    setSelected(new Set())
    setShowBulkRole(false)
  }

  const counts = {
    all: users.length,
    student: users.filter((u) => u.role === "student").length,
    teacher: users.filter((u) => u.role === "teacher").length,
    admin: users.filter((u) => u.role === "admin").length,
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
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {users.length} usuários
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
          <button className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> Convidar usuário
          </button>
        </div>
      </div>

      {/* Role chips */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "student", "teacher", "admin"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap",
              role === r
                ? r === "admin"
                  ? "bg-destructive text-white shadow-sm"
                  : "bg-level-purple text-white shadow-sm"
                : r === "admin"
                  ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  : "bg-muted text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple",
            )}
          >
            {r === "all" ? `Todos · ${counts.all}` : r === "student" ? `Alunos · ${counts.student}` : r === "teacher" ? `Professores · ${counts.teacher}` : `Admins · ${counts.admin}`}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {/* Toolbar */}
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

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-level-purple-subtle px-4 py-2.5">
            <p className="text-sm font-bold text-level-purple-dark">
              <span className="rounded-md bg-level-purple px-2 py-0.5 text-xs text-white">
                {selected.size}
              </span>{" "}
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
                onClick={() => { onToast(`Exportando ${selected.size} usuário(s) em CSV...`, "info"); setSelected(new Set()) }}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3 w-3" /> Exportar
              </button>
              <button
                onClick={() => { onToast(`${selected.size} usuário(s) suspenso(s)`, "warning"); setSelected(new Set()) }}
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

        {/* Table */}
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
                <tr
                  key={u.id}
                  className={cn(
                    "transition-colors hover:bg-level-purple-subtle/30",
                    isSel && "bg-level-purple-subtle/20",
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleOne(u.id)}
                      className="h-4 w-4 rounded border-border accent-level-purple"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() => setDetailUser(u)}
                      className="flex items-center gap-3 text-left"
                    >
                      <AvatarInitials name={u.full_name} role={u.role} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-level-purple-dark">
                          {u.full_name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          @{u.username} · {u.email}
                        </p>
                      </div>
                    </button>
                  </td>
                  <td className="hidden px-2 py-3 md:table-cell">
                    <RoleBadge role={u.role} />
                  </td>
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
                  <td className="hidden px-2 py-3 text-right font-bold text-foreground lg:table-cell">
                    {u.lessons_completed}
                  </td>
                  <td className="hidden px-2 py-3 xl:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-warning">
                      <Flame className="h-3 w-3" /> {u.current_streak}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn title="Ver perfil" size="sm" onClick={() => setDetailUser(u)}>
                        <Eye className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn title="Editar" size="sm" onClick={() => setEditUser(u)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm font-semibold text-muted-foreground">
                    Nenhum usuário encontrado
                  </p>
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

      {/* Bulk role modal */}
      {showBulkRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <p className="text-base font-extrabold text-level-purple-dark">
                  Alterar papel de {selected.size} usuário(s)
                </p>
              </div>
              <button
                onClick={() => setShowBulkRole(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 p-6">
              <p className="mb-3 text-xs text-muted-foreground">
                Esta ação é registrada no log de auditoria.
              </p>
              {(
                [
                  { r: "student" as const, label: "Aluno", desc: "Acesso às lições publicadas", danger: false },
                  { r: "teacher" as const, label: "Professor", desc: "Criar e editar lições", danger: false },
                  { r: "admin" as const, label: "Administrador", desc: "Acesso total", danger: true },
                ]
              ).map((o) => (
                <button
                  key={o.r}
                  onClick={() => applyBulkRole(o.r as "student" | "teacher" | "admin")}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                    o.danger
                      ? "border-border hover:border-destructive hover:bg-destructive/5"
                      : "border-border hover:border-level-purple hover:bg-level-purple-subtle",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      o.danger ? "bg-destructive/10 text-destructive" : "bg-level-purple-light text-level-purple",
                    )}
                  >
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

      {/* Quick edit modal */}
      {editUser && (
        <UserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={(u) => {
            setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)))
            setEditUser(null)
            onToast("Usuário atualizado", "success")
          }}
        />
      )}
    </div>
  )
}

function UserEditModal({
  user,
  onClose,
  onSave,
}: {
  user: Profile
  onClose: () => void
  onSave: (u: Profile) => void
}) {
  const [form, setForm] = useState(user)
  useEffect(() => setForm(user), [user.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple text-white">
              <Edit3 className="h-5 w-5" />
            </div>
            <p className="text-base font-extrabold text-level-purple-dark">
              Editar · {user.full_name}
            </p>
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
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Nome completo
              </p>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Username
              </p>
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
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Email
              </p>
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
                { key: "level", label: "Nível" },
                { key: "total_xp", label: "XP total" },
                { key: "current_streak", label: "Streak" },
              ] as const
            ).map((f) => (
              <div key={f.key}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </p>
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
          <button className="flex items-center gap-1.5 text-sm font-bold text-destructive hover:underline">
            <Trash2 className="h-3.5 w-3.5" /> Excluir conta
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(form)}
              className="btn-3d rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white"
            >
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── User detail page ───────────────────────────────────────────────────────────

function UserDetail({
  user,
  users,
  setUsers,
  onBack,
  onToast,
}: {
  user: Profile
  users: Profile[]
  setUsers: (u: Profile[] | ((p: Profile[]) => Profile[])) => void
  onBack: () => void
  onToast: (msg: string, kind?: "success" | "danger" | "info" | "warning") => void
}) {
  const [tab, setTab] = useState("overview")
  const [confirmAction, setConfirmAction] = useState<{ id: string; label: string; tone: string } | null>(null)
  const current = users.find((u) => u.id === user.id) || user

  const adminActions = [
    { id: "reset-pw", label: "Enviar reset de senha", Icon: Key, tone: "info", desc: "Envia email com link de reset" },
    { id: "suspend", label: "Suspender conta", Icon: Ban, tone: "warning", desc: "Bloqueia login temporariamente" },
    { id: "reset-xp", label: "Resetar progresso", Icon: RefreshCw, tone: "warning", desc: "Zera XP, nível e lições" },
    { id: "export", label: "Exportar dados (LGPD)", Icon: Download, tone: "info", desc: "Gera JSON com todos os dados" },
    { id: "delete", label: "Excluir conta permanentemente", Icon: Trash2, tone: "danger", desc: "Remove conta e progresso" },
  ]

  const applyAction = (id: string) => {
    if (id === "reset-xp")
      setUsers((prev) =>
        prev.map((u) =>
          u.id === current.id
            ? { ...u, total_xp: 0, level: 1, lessons_completed: 0, current_streak: 0 }
            : u,
        ),
      )
    if (id === "delete") {
      setUsers((prev) => prev.filter((u) => u.id !== current.id))
      onBack()
    }
    const msg: Record<string, string> = {
      "reset-pw": "Email de reset enviado",
      suspend: "Conta suspensa",
      "reset-xp": "Progresso zerado",
      export: "Arquivo LGPD gerado",
      delete: "Conta excluída",
    }
    onToast(msg[id] || "Ação aplicada", id === "delete" ? "danger" : "success")
    setConfirmAction(null)
  }

  return (
    <div className="space-y-5 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-level-purple"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Voltar para usuários
      </button>

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl border border-border bg-white">
        <div className="relative h-28 bg-linear-to-br from-level-purple-dark via-level-purple to-level-purple-medium">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
        </div>
        <div className="relative px-6 pb-6">
          <div className="-mt-12 flex items-end gap-4">
            <div className="rounded-2xl bg-white p-1.5 shadow-sm">
              <AvatarInitials name={current.full_name} role={current.role} size={88} />
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-level-purple-dark">{current.full_name}</h2>
                <RoleBadge role={current.role} />
              </div>
              <p className="text-sm text-muted-foreground">
                @{current.username} · {current.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ingressou em{" "}
                {new Date(current.created_at).toLocaleDateString("pt-BR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <button className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
                <Mail className="h-3.5 w-3.5" /> Enviar mensagem
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { Icon: Trophy, label: "Nível", value: String(current.level), color: "text-warning", bg: "bg-warning/10" },
              { Icon: Zap, label: "XP", value: current.total_xp.toLocaleString("pt-BR"), color: "text-level-purple", bg: "bg-level-purple-light" },
              { Icon: Flame, label: "Streak", value: `${current.current_streak}d`, color: "text-warning", bg: "bg-warning/10" },
              { Icon: BookOpen, label: "Lições", value: String(current.lessons_completed), color: "text-info", bg: "bg-info/10" },
              { Icon: Activity, label: "Cadastro", value: new Date(current.created_at).toLocaleDateString("pt-BR"), color: "text-success", bg: "bg-success/10", small: true },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className={cn("mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg", s.bg, s.color)}>
                  <s.Icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={cn("font-extrabold text-level-purple-dark", s.small ? "text-sm" : "text-xl")}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border">
        {[
          { id: "overview", label: "Visão geral" },
          { id: "actions", label: "Ações admin" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-bold transition-colors",
              tab === t.id
                ? "border-level-purple text-level-purple"
                : "border-transparent text-muted-foreground hover:text-level-purple",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-3 text-sm font-extrabold text-level-purple-dark">Conquistas recentes</p>
          <div className="space-y-2">
            {[
              { Icon: Flame, label: `Streak de ${current.current_streak} dias`, color: "text-warning bg-warning/10" },
              { Icon: Trophy, label: `Nível ${current.level} atingido`, color: "text-level-purple bg-level-purple-light" },
              { Icon: Star, label: "Primeira lição avançada", color: "text-success bg-success/10" },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", a.color)}>
                  <a.Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-foreground">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "actions" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-level-purple" />
              <p className="text-sm font-extrabold text-level-purple-dark">Ações administrativas</p>
            </div>
            <div className="space-y-2">
              {adminActions.slice(0, 4).map((a) => {
                const tones: Record<string, string> = {
                  info: "border-info/20 hover:bg-info/5",
                  warning: "border-warning/20 hover:bg-warning/5",
                }
                const iconTones: Record<string, string> = {
                  info: "bg-info/10 text-info",
                  warning: "bg-warning/10 text-warning",
                }
                return (
                  <button
                    key={a.id}
                    onClick={() => setConfirmAction({ id: a.id, label: a.label, tone: a.tone })}
                    className={cn("flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all", tones[a.tone])}
                  >
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconTones[a.tone])}>
                      <a.Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-level-purple-dark">{a.label}</p>
                      <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-extrabold text-destructive">Zona de perigo</p>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Ações irreversíveis. Todas requerem confirmação.
            </p>
            {adminActions.slice(4).map((a) => (
              <button
                key={a.id}
                onClick={() => setConfirmAction({ id: a.id, label: a.label, tone: a.tone })}
                className="group flex w-full items-center gap-3 rounded-xl border-2 border-destructive/30 bg-white p-3 text-left transition-all hover:border-destructive hover:bg-destructive hover:text-white"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive group-hover:bg-white/20 group-hover:text-white">
                  <a.Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{a.label}</p>
                  <p className="text-[11px] opacity-70">{a.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="text-base font-extrabold text-level-purple-dark">{confirmAction.label}</p>
              </div>
              <button onClick={() => setConfirmAction(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-foreground">
                Você está prestes a executar <b>{confirmAction.label.toLowerCase()}</b> em{" "}
                <b>{current.full_name}</b>.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Esta ação será registrada no log de auditoria com seu nome e data/hora.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => applyAction(confirmAction.id)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-bold text-white",
                  confirmAction.tone === "danger"
                    ? "bg-destructive"
                    : confirmAction.tone === "warning"
                      ? "bg-warning"
                      : "bg-level-purple",
                )}
              >
                Confirmar ação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Enhanced Lessons Page ─────────────────────────────────────────────────────

export function LessonsPageEnhanced({
  lessons,
  setLessons,
  onToast,
}: {
  lessons: Lesson[]
  setLessons: (l: Lesson[] | ((p: Lesson[]) => Lesson[])) => void
  onToast: (msg: string, kind?: "success" | "danger" | "info" | "warning") => void
}) {
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
      id: "dup-" + Date.now(),
      title: l.title + " (cópia)",
      published: false,
      order: lessons.length + 1,
      slug: l.slug + "-copia",
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
          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-white p-0.5">
            {(
              [
                { id: "list", Icon: List },
                { id: "grid", Icon: Grid3X3 },
                { id: "kanban", Icon: Columns },
              ] as const
            ).map(({ id, Icon }) => (
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

      {/* Filters */}
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
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {(["all", "published", "draft"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
              status === s
                ? "bg-level-purple text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple",
            )}
          >
            {s === "all" ? "Todas" : s === "published" ? "Publicadas" : "Rascunhos"}
          </button>
        ))}
        <div className="h-5 w-px bg-border" />
        {(["iniciante", "intermediario", "avancado"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDiff(diff === d ? "all" : d)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
              diff === d
                ? "bg-level-purple text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple",
            )}
          >
            {d === "iniciante" ? "Iniciante" : d === "intermediario" ? "Intermediário" : "Avançado"}
          </button>
        ))}
      </div>

      {/* List view */}
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
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {l.order.toString().padStart(2, "0")}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-light text-level-purple">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-level-purple-dark">{l.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {(l.libraries?.length ?? 0) > 0 ? (l.libraries ?? []).join(", ") : "Sem bibliotecas"} ·{" "}
                          ⏱ {Math.round(l.time_limit / 60)}min
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-2 py-3 text-xs text-muted-foreground md:table-cell">
                    {l.module}
                  </td>
                  <td className="hidden px-2 py-3 lg:table-cell">
                    <DiffBadge d={l.difficulty} />
                  </td>
                  <td className="hidden px-2 py-3 text-right lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-level-purple">
                      <Zap className="h-2.5 w-2.5" />+{l.xp_reward}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <PubBadge published={l.published} />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn
                        title={l.published ? "Despublicar" : "Publicar"}
                        size="sm"
                        tone={l.published ? "success" : "neutral"}
                        onClick={() => handleToggle(l)}
                      >
                        {togglingId === l.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : l.published ? (
                          <Globe className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </IconBtn>
                      <Link href={`/teacher/edit/${l.id}`}>
                        <IconBtn title="Editar" size="sm">
                          <Edit3 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </Link>
                      <IconBtn title="Duplicar" size="sm" onClick={() => duplicate(l)}>
                        <Copy className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn title="Excluir" size="sm" tone="danger" onClick={() => setToDelete(l)}>
                        {deletingId === l.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-3 text-sm font-semibold text-muted-foreground">
                      Nenhuma lição encontrada
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid view */}
      {view === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <div
              key={l.id}
              className="cursor-pointer rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-level-purple-medium hover:shadow-lg"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-level-purple-light text-level-purple">
                  <BookOpen className="h-5 w-5" />
                </div>
                <PubBadge published={l.published} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {l.module} · Lição {l.order.toString().padStart(2, "0")}
              </p>
              <h3 className="mt-1 text-base font-extrabold leading-snug text-level-purple-dark">
                {l.title}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <DiffBadge d={l.difficulty} />
                <span className="inline-flex items-center gap-1 rounded-full bg-level-purple-subtle px-2 py-0.5 text-[11px] font-bold text-level-purple">
                  <Zap className="h-2.5 w-2.5" />
                  {l.xp_reward} XP
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {Math.round(l.time_limit / 60)}min
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="text-[11px] text-muted-foreground" />
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <IconBtn title={l.published ? "Despublicar" : "Publicar"} size="sm" onClick={() => handleToggle(l)}>
                    {togglingId === l.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : l.published ? (
                      <Globe className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </IconBtn>
                  <Link href={`/teacher/edit/${l.id}`}>
                    <IconBtn title="Editar" size="sm">
                      <Edit3 className="h-3.5 w-3.5" />
                    </IconBtn>
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

      {/* Kanban view */}
      {view === "kanban" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { key: "draft", label: "Rascunho", tone: "text-muted-foreground bg-muted", filter: (l: Lesson) => !l.published },
            { key: "published", label: "Publicada", tone: "text-success bg-success/10", filter: (l: Lesson) => l.published },
            { key: "advanced", label: "Avançadas", tone: "text-destructive bg-destructive/10", filter: (l: Lesson) => l.difficulty === "avancado" },
          ].map((col) => {
            const items = filtered.filter(col.filter)
            return (
              <div key={col.key} className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase", col.tone)}>
                      {col.label}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">{items.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map((l) => (
                    <div
                      key={l.id}
                      className="cursor-pointer rounded-xl border border-border bg-white p-3 hover:border-level-purple-medium hover:shadow-sm"
                    >
                      <p className="text-xs font-bold text-muted-foreground">{l.module}</p>
                      <p className="mt-1 text-sm font-extrabold leading-snug text-level-purple-dark">
                        {l.title}
                      </p>
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

      {/* Delete confirm */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-level-purple-dark/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-level-purple-subtle/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-base font-extrabold text-level-purple-dark">Excluir lição?</p>
              </div>
              <button onClick={() => setToDelete(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-foreground">
                A lição <b>"{toDelete.title}"</b> será excluída permanentemente.
              </p>
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
