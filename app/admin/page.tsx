"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LevelButton } from "@/components/design-system/level-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  fetchAllUsers,
  fetchPlatformMetrics,
  fetchAllLessons,
  updateUserRole,
  type PlatformMetrics,
} from "@/lib/supabase/admin"
import { deleteLesson, toggleLessonPublished } from "@/lib/supabase/lessons"
import type { Profile, Lesson } from "@/lib/supabase/types"
import {
  Shield,
  ChevronLeft,
  Users,
  BookOpen,
  Activity,
  TrendingUp,
  GraduationCap,
  Crown,
  Search,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Edit3,
  AlertTriangle,
  Plus,
  FileText,
  BarChart3,
} from "lucide-react"

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Admin</Badge>
    case "teacher":
      return <Badge className="bg-level-purple/10 text-level-purple border-0 text-xs">Professor</Badge>
    default:
      return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Aluno</Badge>
  }
}

// ── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-level-purple-dark">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border-2 border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Admin Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<"users" | "lessons">("users")
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  // Users filters
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null)

  // Lessons filters
  const [lessonSearch, setLessonSearch] = useState("")
  const [lessonFilter, setLessonFilter] = useState<"all" | "published" | "draft">("all")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toDeleteLesson, setToDeleteLesson] = useState<Lesson | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!profile || profile.role !== "admin") {
      router.push("/dashboard")
      return
    }
    async function load() {
      setLoading(true)
      const [m, u, l] = await Promise.all([
        fetchPlatformMetrics(),
        fetchAllUsers(),
        fetchAllLessons(),
      ])
      setMetrics(m)
      setUsers(u)
      setLessons(l)
      setLoading(false)
    }
    load()
  }, [authLoading, profile, router])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRoleChange = async (userId: string, newRole: "student" | "teacher" | "admin") => {
    setChangingRoleId(userId)
    try {
      await updateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      setRoleSuccess(userId)
      setTimeout(() => setRoleSuccess(null), 2000)
      // Atualiza contagem de metricas localmente
      if (metrics) {
        const oldUser = users.find((u) => u.id === userId)
        if (oldUser) {
          const m = { ...metrics }
          if (oldUser.role === "student") m.totalStudents--
          else if (oldUser.role === "teacher") m.totalTeachers--
          else if (oldUser.role === "admin") m.totalAdmins--
          if (newRole === "student") m.totalStudents++
          else if (newRole === "teacher") m.totalTeachers++
          else if (newRole === "admin") m.totalAdmins++
          setMetrics(m)
        }
      }
    } catch {
      alert("Erro ao alterar role. Tente novamente.")
    } finally {
      setChangingRoleId(null)
    }
  }

  const handleTogglePublished = async (lesson: Lesson) => {
    setTogglingId(lesson.id)
    try {
      await toggleLessonPublished(lesson.id, !lesson.published)
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, published: !lesson.published } : l))
      )
      if (metrics) {
        setMetrics({
          ...metrics,
          publishedLessons: lesson.published
            ? metrics.publishedLessons - 1
            : metrics.publishedLessons + 1,
        })
      }
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteLesson = async () => {
    if (!toDeleteLesson) return
    const id = toDeleteLesson.id
    setDeletingId(id)
    setToDeleteLesson(null)
    try {
      await deleteLesson(id)
      const removed = lessons.find((l) => l.id === id)
      setLessons((prev) => prev.filter((l) => l.id !== id))
      if (metrics && removed) {
        setMetrics({
          ...metrics,
          totalLessons: metrics.totalLessons - 1,
          publishedLessons: removed.published
            ? metrics.publishedLessons - 1
            : metrics.publishedLessons,
        })
      }
    } finally {
      setDeletingId(null)
    }
  }

  // ── Filters ──────────────────────────────────────────────────────────────

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(lessonSearch.toLowerCase())
    const matchesFilter =
      lessonFilter === "all" ||
      (lessonFilter === "published" && lesson.published) ||
      (lessonFilter === "draft" && !lesson.published)
    return matchesSearch && matchesFilter
  })

  // ── Loading / Guard ──────────────────────────────────────────────────────

  if (authLoading || loading || !metrics) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
        <p className="text-sm text-muted-foreground">Carregando painel admin...</p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {toDeleteLesson && (
        <DeleteDialog
          title="Excluir licao?"
          message={`A licao "${toDeleteLesson.title}" sera excluida permanentemente, junto com todo o progresso dos alunos.`}
          onConfirm={handleDeleteLesson}
          onCancel={() => setToDeleteLesson(null)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-level-purple transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-level-purple-dark">Admin Console</h1>
                <p className="text-xs text-muted-foreground">Gestao da Plataforma</p>
              </div>
            </div>
          </div>

          <Link href="/teacher/edit/new">
            <LevelButton variant="primary" size="md">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Licao
              </span>
            </LevelButton>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Platform Metrics */}
        <h2 className="mb-4 text-lg font-bold text-level-purple-dark">Metricas da Plataforma</h2>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                <Users className="h-5 w-5 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{metrics.totalUsers.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">Usuarios Total</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <Activity className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{metrics.totalCompletions.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">Licoes Concluidas</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <BookOpen className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{metrics.publishedLessons}/{metrics.totalLessons}</p>
                <p className="text-xs text-muted-foreground">Licoes Publicadas</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                <TrendingUp className="h-5 w-5 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">
                  {metrics.totalLessons > 0 ? Math.round((metrics.publishedLessons / metrics.totalLessons) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Taxa de Publicacao</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-level-purple-dark">{metrics.totalStudents}</p>
              <p className="text-sm text-muted-foreground">Alunos</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
              <BookOpen className="h-6 w-6 text-level-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-level-purple-dark">{metrics.totalTeachers}</p>
              <p className="text-sm text-muted-foreground">Professores</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <Crown className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-level-purple-dark">{metrics.totalAdmins}</p>
              <p className="text-sm text-muted-foreground">Administradores</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-muted/50 p-1 w-fit">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "users" ? "bg-level-purple text-white shadow-sm" : "text-muted-foreground hover:text-level-purple"
            }`}
          >
            <Users className="h-4 w-4" />
            Usuarios ({metrics.totalUsers})
          </button>
          <button
            onClick={() => setActiveTab("lessons")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "lessons" ? "bg-level-purple text-white shadow-sm" : "text-muted-foreground hover:text-level-purple"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Licoes ({metrics.totalLessons})
          </button>
        </div>

        {/* ═══════════════ USERS TAB ═══════════════ */}
        {activeTab === "users" && (
          <div className="rounded-2xl border border-border bg-white">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, email ou username..."
                  className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                {[
                  { value: "all", label: "Todos" },
                  { value: "student", label: "Alunos" },
                  { value: "teacher", label: "Professores" },
                  { value: "admin", label: "Admins" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setRoleFilter(f.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      roleFilter === f.value
                        ? "bg-level-purple text-white"
                        : "bg-muted text-muted-foreground hover:bg-level-purple-subtle"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* User List */}
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback
                      className={`text-sm font-bold ${
                        user.role === "admin"
                          ? "bg-destructive/10 text-destructive"
                          : user.role === "teacher"
                            ? "bg-level-purple-light text-level-purple-dark"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-level-purple-dark">{user.full_name}</p>
                      {getRoleBadge(user.role)}
                      {roleSuccess === user.id && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="h-3 w-3" /> Salvo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      @{user.username} · {user.email}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-level-purple-dark">Nv. {user.level}</p>
                      <p className="text-xs text-muted-foreground">Nivel</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-level-purple-dark">{user.total_xp.toLocaleString("pt-BR")}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-level-purple-dark">{user.lessons_completed}</p>
                      <p className="text-xs text-muted-foreground">Licoes</p>
                    </div>
                  </div>

                  {/* Role Change */}
                  <div className="relative">
                    {changingRoleId === user.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
                        <Loader2 className="h-4 w-4 animate-spin text-level-purple" />
                      </div>
                    )}
                    <Select
                      value={user.role}
                      onValueChange={(value) =>
                        handleRoleChange(user.id, value as "student" | "teacher" | "admin")
                      }
                      disabled={changingRoleId === user.id || user.id === profile?.id}
                    >
                      <SelectTrigger className="h-9 w-32 rounded-lg border border-border text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Aluno</SelectItem>
                        <SelectItem value="teacher">Professor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View Profile */}
                  <Link href={`/perfil/${user.username}`}>
                    <button
                      title="Ver perfil"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">Nenhum usuario encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ LESSONS TAB ═══════════════ */}
        {activeTab === "lessons" && (
          <div className="rounded-2xl border border-border bg-white">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  placeholder="Buscar licoes..."
                  className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                {(["all", "published", "draft"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setLessonFilter(f)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      lessonFilter === f
                        ? "bg-level-purple text-white"
                        : "bg-muted text-muted-foreground hover:bg-level-purple-subtle"
                    }`}
                  >
                    {f === "all" ? "Todas" : f === "published" ? "Publicadas" : "Rascunhos"}
                  </button>
                ))}
              </div>
            </div>

            {/* Lessons List */}
            <div className="divide-y divide-border">
              {filteredLessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-light">
                    <BookOpen className="h-5 w-5 text-level-purple" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-level-purple-dark truncate">{lesson.title}</p>
                      {lesson.published ? (
                        <Badge className="bg-success/10 text-success border-0 text-xs">Publicada</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border-0 text-xs">Rascunho</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{lesson.module}</span>
                      <Badge
                        className={`border-0 text-xs ${
                          lesson.difficulty === "iniciante"
                            ? "bg-success/10 text-success"
                            : lesson.difficulty === "intermediario"
                              ? "bg-warning/10 text-warning"
                              : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {lesson.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground">+{lesson.xp_reward} XP</span>
                      <span className="text-xs text-muted-foreground">Ordem: {lesson.order}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTogglePublished(lesson)}
                      disabled={togglingId === lesson.id}
                      title={lesson.published ? "Despublicar" : "Publicar"}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                        lesson.published
                          ? "text-success hover:bg-success/10"
                          : "text-muted-foreground hover:bg-level-purple-light hover:text-level-purple"
                      }`}
                    >
                      {togglingId === lesson.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : lesson.published ? (
                        <Globe className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>

                    {lesson.published && (
                      <Link href={`/lesson/${lesson.id}`} target="_blank">
                        <button
                          title="Visualizar"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                    )}

                    <Link href={`/teacher/edit/${lesson.id}`}>
                      <button
                        title="Editar"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </Link>

                    <button
                      onClick={() => setToDeleteLesson(lesson)}
                      disabled={deletingId === lesson.id}
                      title="Excluir"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      {deletingId === lesson.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {filteredLessons.length === 0 && (
                <div className="py-16 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm font-medium text-level-purple-dark">
                    {lessons.length === 0 ? "Nenhuma licao na plataforma" : "Nenhuma licao encontrada"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Atencao ao promover usuarios</p>
            <p className="text-xs text-muted-foreground mt-1">
              Professores podem criar e editar licoes. Administradores tem acesso total a plataforma.
              Altere roles com cuidado.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
