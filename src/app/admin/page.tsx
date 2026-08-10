"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  fetchAllUsers,
  fetchPlatformMetrics,
  fetchAllLessons,
  fetchRecentActivity,
  fetchDailyActivity,
  type PlatformMetrics,
  type RecentActivity,
} from "@/lib/supabase/admin"
import type { Profile, Lesson } from "@/lib/supabase/types"
import { AnalyticsPage } from "@/components/admin/analytics-page"
import { ModulesPage } from "@/components/admin/modules-page"
import { ApprovalsPage } from "@/components/admin/approvals-page"
import { AuditPage } from "@/components/admin/audit-page"
import { SettingsPage } from "@/components/admin/settings-page"
import { CoursesAdminPage } from "@/components/admin/courses-admin-page"
import { UsersPageEnhanced } from "@/components/admin/users/users-page"
import { LessonsPageEnhanced } from "@/components/admin/lessons/lessons-page"
import { NotificationBell } from "@/components/notification-bell"
import { BadgesAdminPage } from "@/components/admin/badges-page"
import { LibrariesAdminPage } from "@/components/admin/libraries-page"
import { ExamQuestionsAdminPage } from "@/components/admin/exam-questions-page"
import { CommandPalette } from "@/components/admin/command-palette"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  Users,
  BookOpen,
  Activity,
  TrendingUp,
  Crown,
  Search,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Plus,
  Package,
  BarChart3,
  LayoutDashboard,
  Layers,
  ShieldCheck,
  History,
  Settings as SettingsIcon,
  Sparkles,
  LogOut,
  ChevronRight,
  GraduationCap as Cap,
  Menu,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { SparkBar, Donut } from "@/components/admin/charts"

// ── Types & helpers ───────────────────────────────────────────────────────────

type PageId =
  | "overview"
  | "analytics"
  | "courses"
  | "lessons"
  | "modules"
  | "badges"
  | "users"
  | "approvals"
  | "audit"
  | "libraries"
  | "exams"
  | "settings"



// ── Atoms ─────────────────────────────────────────────────────────────────────

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ current, onChange, counts, profileName, profileEmail }: {
  current: PageId
  onChange: (p: PageId) => void
  counts: { courses: number; lessons: number; users: number; approvals: number }
  profileName: string
  profileEmail: string
}) {
  const sections: { header: string; items: { id: PageId; label: string; icon: React.ReactNode; count?: number; badge?: string; urgent?: boolean }[] }[] = [
    { header: "PAINEL", items: [
      { id: "overview",  label: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: "analytics", label: "Analytics",   icon: <BarChart3 className="h-4 w-4" />, badge: "novo" },
    ]},
    { header: "CONTEÚDO", items: [
      { id: "courses", label: "Cursos",  icon: <Cap className="h-4 w-4" />,     count: counts.courses },
      { id: "lessons", label: "Lições",  icon: <BookOpen className="h-4 w-4" />, count: counts.lessons },
      { id: "modules", label: "Módulos", icon: <Layers className="h-4 w-4" /> },
      { id: "libraries", label: "Bibliotecas", icon: <Package className="h-4 w-4" /> },
      { id: "exams", label: "Prova Final", icon: <Cap className="h-4 w-4" /> },
      { id: "badges",  label: "Badges",  icon: <Sparkles className="h-4 w-4" /> },
    ]},
    { header: "PESSOAS", items: [
      { id: "users",     label: "Usuários",   icon: <Users className="h-4 w-4" />, count: counts.users },
      { id: "approvals", label: "Aprovações", icon: <ShieldCheck className="h-4 w-4" />, count: counts.approvals, urgent: counts.approvals > 0 },
    ]},
    { header: "SISTEMA", items: [
      { id: "audit",    label: "Logs · auditoria", icon: <History className="h-4 w-4" /> },
      { id: "settings", label: "Ajustes",           icon: <SettingsIcon className="h-4 w-4" /> },
    ]},
  ]

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-level-purple to-level-purple-medium shadow-sm">
          <span className="text-sm font-extrabold text-white">L</span>
          <div className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-warning" />
        </div>
        <div>
          <p className="text-sm font-extrabold leading-tight text-level-purple-dark">LevelUSP</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {sections.map((sec) => (
          <div key={sec.header}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{sec.header}</p>
            <div className="space-y-0.5">
              {sec.items.map((it) => {
                const active = current === it.id
                return (
                  <button key={it.id} onClick={() => onChange(it.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                      active
                        ? "bg-linear-to-br from-level-purple to-level-purple-medium text-white shadow-sm shadow-level-purple/30"
                        : "text-foreground hover:bg-level-purple-subtle hover:text-level-purple",
                    )}>
                    {it.icon}
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.badge && (
                      <span className="rounded bg-linear-to-r from-warning to-destructive px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                        {it.badge}
                      </span>
                    )}
                    {it.count !== undefined && (
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold",
                        active ? "bg-white/20 text-white" : it.urgent ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
                      )}>
                        {it.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-2xl border border-level-purple-subtle bg-linear-to-br from-level-purple-subtle to-white p-3">
        <div className="mb-2 flex items-center gap-2 text-level-purple">
          <Sparkles className="h-3.5 w-3.5" />
          <p className="text-xs font-extrabold">Saúde da plataforma</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-extrabold leading-none text-level-purple-dark">98<span className="text-xs">%</span></p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">uptime · 30d</p>
          </div>
          <SparkBar data={[82, 88, 84, 90, 92, 94, 96, 95, 97, 98, 98, 96, 98, 98]} color="#7C3AED" height={28} width={4} />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border p-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-destructive/10 text-xs font-bold text-destructive">
            {getInitials(profileName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-level-purple-dark">{profileName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{profileEmail}</p>
        </div>
        <Link href="/dashboard" title="Voltar à plataforma"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple">
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Link>
      </div>
    </aside>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────
// NotificationBell agora vem de components/notification-bell.tsx (dados reais via contexto).

function TopBar({ title, breadcrumb, primaryHref, primaryLabel, onMenuClick }: {
  title: string; breadcrumb?: string; primaryHref?: string; primaryLabel?: string; onMenuClick?: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            aria-label="Abrir menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span>LevelUSP</span>
              <ChevronRight className="h-3 w-3" />
              <span>Admin</span>
              {breadcrumb && (<><ChevronRight className="h-3 w-3" /><span className="font-semibold text-level-purple-dark">{breadcrumb}</span></>)}
            </div>
            <h1 className="truncate text-lg font-extrabold leading-tight text-level-purple-dark sm:text-xl">{title}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => (window as unknown as { __openAdminSearch?: () => void }).__openAdminSearch?.()}
            className="relative hidden items-center lg:flex"
          >
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <span className="w-72 cursor-text rounded-xl border border-border bg-white py-2 pl-9 pr-12 text-left text-sm text-muted-foreground hover:border-level-purple">
              Buscar usuário, lição, curso...
            </span>
            <kbd className="absolute right-3 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
          </button>
          <NotificationBell />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span className="hidden sm:inline">Voltar à plataforma</span>
          </Link>
          {primaryHref && primaryLabel && (
            <Link href={primaryHref} className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4" /> {primaryLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────────

function Overview({
  metrics,
  activity,
  dailyBars,
  onNavigate,
}: {
  metrics: PlatformMetrics
  activity: RecentActivity[]
  dailyBars: number[]
  onNavigate: (p: PageId) => void
}) {
  const pubRate = metrics.totalLessons > 0
    ? Math.round((metrics.publishedLessons / metrics.totalLessons) * 100) : 0

  const kpis = [
    { label: "Usuários",        value: metrics.totalUsers,                              icon: Users,      color: "bg-level-purple-light text-level-purple" },
    { label: "Conclusões",      value: metrics.totalCompletions,                        icon: Activity,   color: "bg-success/10 text-success" },
    { label: "Matrículas",      value: metrics.totalEnrollments,                        icon: Cap,        color: "bg-info/10 text-info" },
    { label: "XP Distribuído",  value: metrics.totalXpAwarded.toLocaleString("pt-BR"),  icon: TrendingUp, color: "bg-warning/10 text-warning" },
    { label: "Cursos Publicados", value: `${metrics.publishedCourses}/${metrics.totalCourses}`, icon: BookOpen, color: "bg-level-purple-light text-level-purple" },
    { label: "Lições Publicadas", value: `${metrics.publishedLessons}/${metrics.totalLessons}`, icon: CheckCircle2, color: "bg-success/10 text-success" },
  ]

  const roleData = [
    { name: "Alunos",      value: metrics.totalStudents,  color: "#7C3AED" },
    { name: "Professores", value: metrics.totalTeachers,  color: "#A78BFA" },
    { name: "Admins",      value: metrics.totalAdmins,    color: "#EF4444" },
  ]

  const tones: Record<string, string> = {
    success: "bg-success/10 text-success",
    purple:  "bg-level-purple-light text-level-purple",
    info:    "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
  }

  const peakDay = Math.max(...dailyBars, 1)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-level-purple-dark via-level-purple to-level-purple-medium p-6 text-white shadow-xl sm:p-8">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">Painel do administrador</p>
            <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
              Olá, Admin 👋 A plataforma tem {metrics.totalUsers} usuários ativos.
            </h2>
            <p className="mt-2 text-sm text-white/80">
              {metrics.publishedCourses} cursos · {metrics.publishedLessons} lições · {metrics.totalCompletions.toLocaleString("pt-BR")} conclusões · {metrics.totalEnrollments} matrículas
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {metrics.pendingApprovals > 0 && (
                <button onClick={() => onNavigate("approvals")}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-level-purple-dark shadow-sm transition-transform hover:-translate-y-0.5">
                  {metrics.pendingApprovals} aprovaç{metrics.pendingApprovals !== 1 ? "ões" : "ão"} pendente{metrics.pendingApprovals !== 1 ? "s" : ""}
                </button>
              )}
              <button onClick={() => onNavigate("analytics")}
                className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition-transform hover:-translate-y-0.5">
                Ver analytics
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Conclusões · 14 dias</p>
            <div className="mt-2"><SparkBar data={dailyBars} color="#FFFFFF" height={44} width={8} gap={3} /></div>
            <p className="mt-2 text-xs text-white/80">pico: {peakDay} conclusão{peakDay !== 1 ? "ões" : ""}/dia</p>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-level-purple-medium hover:shadow-lg">
              <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl", k.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-extrabold text-level-purple-dark">
                {typeof k.value === "number" ? k.value.toLocaleString("pt-BR") : k.value}
              </p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-level-purple-dark">Conclusões nos últimos 14 dias</h3>
              <p className="text-xs text-muted-foreground">Lições completadas por dia</p>
            </div>
            <button onClick={() => onNavigate("analytics")} className="text-xs font-bold text-level-purple hover:underline">
              Ver detalhes →
            </button>
          </div>
          <SparkBar data={dailyBars} color="#7C3AED" height={120} width={18} gap={6} />
        </div>
        <div className="rounded-2xl border border-border bg-white p-6">
          <h3 className="mb-3 text-sm font-extrabold text-level-purple-dark">Distribuição de usuários</h3>
          <div className="flex items-center justify-between gap-4">
            <Donut data={roleData} size={130} thickness={14} label="usuários" />
            <ul className="space-y-2 text-xs">
              {roleData.map((r) => (
                <li key={r.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="font-bold text-level-purple-dark">{r.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Activity feed — dados reais */}
      <div className="rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-level-purple-dark">Atividade recente</h3>
            <p className="text-xs text-muted-foreground">Últimos eventos registrados</p>
          </div>
          <button onClick={() => onNavigate("audit")}
            className="text-xs font-bold text-level-purple hover:underline">
            Ver todos os logs →
          </button>
        </div>
        {activity.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-6 py-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={cn("text-[11px] font-bold", tones[a.tone])}>
                    {getInitials(a.user)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-semibold text-level-purple-dark">{a.user}</span>{" "}
                    <span className="text-muted-foreground">{a.text}</span>
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{a.ago}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading } = useAuth()

  const [page, setPage] = useState<PageId>(() => {
    if (typeof window === "undefined") return "overview"
    return (localStorage.getItem("adminPage") as PageId) || "overview"
  })
  const [metrics,    setMetrics]    = useState<PlatformMetrics | null>(null)
  const [users,      setUsers]      = useState<Profile[]>([])
  const [lessons,    setLessons]    = useState<Lesson[]>([])
  const [activity,   setActivity]   = useState<RecentActivity[]>([])
  const [dailyBars,  setDailyBars]  = useState<number[]>(new Array(14).fill(0))
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState<string | null>(null)
  const [reloadKey,  setReloadKey]  = useState(0)
  const [toast,      setToast]      = useState<{ msg: string; kind: string } | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("adminPage", page)
  }, [page])

  const profileId = profile?.id
  const profileRole = profile?.role
  useEffect(() => {
    if (authLoading) return
    if (!profileId || profileRole !== "admin") {
      router.push("/dashboard")
      return
    }
    // Sem try/catch, uma única query com falha deixava o painel preso em
    // "Carregando..." para sempre, sem dizer o que houve.
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const [m, u, l, act, bars] = await Promise.all([
          fetchPlatformMetrics(),
          fetchAllUsers(),
          fetchAllLessons(),
          fetchRecentActivity(),
          fetchDailyActivity(),
        ])
        setMetrics(m)
        setUsers(u)
        setLessons(l)
        setActivity(act)
        setDailyBars(bars)
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Erro ao carregar os dados do painel.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, profileId, profileRole, router, reloadKey])

  if (!authLoading && !loading && loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-sm font-semibold text-level-purple-dark">Não foi possível carregar o painel</p>
        <p className="max-w-md text-sm text-muted-foreground">{loadError}</p>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="rounded-xl bg-level-purple px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (authLoading || loading || !metrics) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
        <p className="text-sm text-muted-foreground">Carregando painel admin...</p>
      </div>
    )
  }

  const titles: Record<PageId, string> = {
    overview:  "Visão geral",
    analytics: "Analytics",
    courses:   "Cursos",
    lessons:   "Lições",
    exams:     "Prova Final",
    modules:   "Módulos & trilhas",
    badges:    "Badges",
    users:     "Usuários",
    approvals: "Aprovações pendentes",
    audit:     "Logs · auditoria",
    libraries: "Bibliotecas Python",
    settings:  "Configurações",
  }

  const onToast = (msg: string, kind = "success") => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3200)
  }

  let main: React.ReactNode
  if      (page === "overview")  main = <Overview metrics={metrics} activity={activity} dailyBars={dailyBars} onNavigate={setPage} />
  else if (page === "users")     main = <UsersPageEnhanced users={users} setUsers={setUsers} onToast={onToast} currentUserId={profileId} />
  else if (page === "courses")   main = <CoursesAdminPage onToast={onToast} />
  else if (page === "lessons")   main = <LessonsPageEnhanced lessons={lessons} setLessons={setLessons} onToast={onToast} />
  else if (page === "analytics") main = <AnalyticsPage />
  else if (page === "modules")   main = <ModulesPage lessons={lessons} onToast={onToast} />
  else if (page === "badges")    main = <BadgesAdminPage onToast={onToast} />
  else if (page === "approvals") main = <ApprovalsPage onToast={onToast} />
  else if (page === "audit")     main = <AuditPage />
  else if (page === "libraries") main = <LibrariesAdminPage onToast={onToast} />
  else if (page === "exams") main = <ExamQuestionsAdminPage onToast={onToast} />
  else                           main = <SettingsPage onToast={onToast} />

  const primaryAction =
    page === "lessons" ? { href: "/teacher/edit/new",   label: "Nova Lição" } :
    page === "courses" ? { href: "/teacher/curso/new",  label: "Novo Curso" } :
    undefined

  const toastColors: Record<string, string> = {
    success: "bg-success text-white",
    danger:  "bg-destructive text-white",
    warning: "bg-warning text-white",
    info:    "bg-level-purple text-white",
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex">
        <Sidebar
          current={page}
          onChange={setPage}
          counts={{ courses: metrics.totalCourses, lessons: metrics.totalLessons, users: metrics.totalUsers, approvals: metrics.pendingApprovals }}
          profileName={profile?.full_name ?? "Admin"}
          profileEmail={profile?.email ?? ""}
        />
      </div>

      {/* Sidebar mobile (drawer) */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Menu de navegação do admin</SheetTitle>
          <Sidebar
            current={page}
            onChange={(p) => { setPage(p); setMobileNavOpen(false) }}
            counts={{ courses: metrics.totalCourses, lessons: metrics.totalLessons, users: metrics.totalUsers, approvals: metrics.pendingApprovals }}
            profileName={profile?.full_name ?? "Admin"}
            profileEmail={profile?.email ?? ""}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={titles[page]} primaryHref={primaryAction?.href} primaryLabel={primaryAction?.label} onMenuClick={() => setMobileNavOpen(true)} />
        <div className="flex-1 overflow-y-auto">{main}</div>
      </div>

      <CommandPalette users={users} lessons={lessons} courses={[]} onNavigate={(p) => setPage(p as PageId)} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-80">
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl ${toastColors[toast.kind] ?? toastColors.info}`}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">{toast.msg}</p>
          </div>
        </div>
      )}
    </div>
  )
}
