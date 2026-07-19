"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { fetchPublishedCourses, fetchUserEnrollments } from "@/lib/supabase/courses"
import type { Course } from "@/lib/supabase/types"
import {
  BookOpen, Code2, Database, Brain, Trophy, Zap, Flame, User,
  Settings, LogOut, Shield, Lock, CheckCircle2, ChevronRight,
  Rocket, Star, Clock, Loader2, Search,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// ── Helpers ───────────────────────────────────────────────────────────────────

function xpForLevel(level: number) { return level * 1000 }

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

const LEVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
}

const LEVEL_COLOR: Record<string, string> = {
  iniciante:     "bg-green-100 text-green-700",
  intermediario: "bg-yellow-100 text-yellow-700",
  avancado:      "bg-red-100 text-red-700",
}

const COURSE_ICONS: Record<string, typeof Code2> = {
  "Python Básico":        Code2,
  "Python Intermediário": Brain,
  "Ciência de Dados":     Database,
  "Estruturas de Dados":  BookOpen,
  "Algoritmos":           BookOpen,
  "POO":                  BookOpen,
}

const COURSE_GRADIENTS: Record<string, string> = {
  iniciante:     "from-violet-500 to-purple-600",
  intermediario: "from-amber-500 to-orange-600",
  avancado:      "from-rose-500 to-red-600",
}

function CourseCard({
  course,
  enrolled,
}: {
  course: Course
  enrolled: boolean
}) {
  const Icon = COURSE_ICONS[course.title] ?? BookOpen
  const gradient = COURSE_GRADIENTS[course.level] ?? "from-violet-500 to-purple-600"

  return (
    <Link
      href={`/cursos/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Thumbnail / banner */}
      <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${gradient}`}>
        <Icon className="h-16 w-16 text-white/80" />
        {enrolled && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            <span className="text-[11px] font-semibold text-white">Matriculado</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEVEL_COLOR[course.level]} bg-white/90`}>
            {LEVEL_LABEL[course.level]}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 text-base font-bold text-level-purple-dark group-hover:text-level-purple transition-colors">
          {course.title}
        </h3>
        <p className="mb-4 line-clamp-2 text-xs text-muted-foreground">
          {course.description}
        </p>

        {/* Tags */}
        {course.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {course.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-level-purple-subtle px-2 py-0.5 text-[10px] font-medium text-level-purple">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {course.lesson_count ?? 0} lições
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              {course.total_xp} XP
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-level-purple opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
      <div className="h-36 animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CoursesPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading, signOut } = useAuth()

  const [courses, setCourses]       = useState<Course[]>([])
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [filterLevel, setFilterLevel] = useState<string>("all")

  useEffect(() => {
    if (authLoading) return
    async function load() {
      setLoading(true)
      try {
        const [fetchedCourses, ids] = await Promise.all([
          fetchPublishedCourses(),
          profile?.id ? fetchUserEnrollments(profile.id) : Promise.resolve([]),
        ])
        setCourses(fetchedCourses)
        setEnrolledIds(new Set(ids))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, profile?.id])

  const level      = profile?.level ?? 1
  const totalXp    = profile?.total_xp ?? 0
  const streak     = profile?.current_streak ?? 0
  const xpFloor    = xpForLevel(level - 1)
  const xpInLevel  = totalXp - xpFloor
  const initials   = profile?.full_name ? getInitials(profile.full_name) : "?"

  const filtered = courses.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                        c.description.toLowerCase().includes(search.toLowerCase())
    const matchLevel  = filterLevel === "all" || c.level === filterLevel
    return matchSearch && matchLevel
  })

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-level-purple-dark">LevelUSP</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <BookOpen className="h-4 w-4" /> Aprender
            </Link>
            <Link href="/cursos" className="flex items-center gap-2 text-sm font-medium text-level-purple">
              <Star className="h-4 w-4" /> Cursos
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <Trophy className="h-4 w-4" /> Ranking
            </Link>
            <Link href={`/perfil/${profile?.username || "me"}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <User className="h-4 w-4" /> Perfil
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-level-purple px-3 py-1.5 text-white">
              <Zap className="h-4 w-4 text-yellow-300" />
              <span className="text-xs font-bold">{xpInLevel.toLocaleString("pt-BR")} XP</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-white">
              <Flame className="h-4 w-4 text-yellow-300" />
              <span className="text-xs font-bold">{streak}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-2 ring-level-purple ring-offset-2 transition-shadow hover:ring-offset-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-level-purple-light text-level-purple-dark text-xs font-bold">
                      {authLoading ? "…" : initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push(`/perfil/${profile?.username || "me"}`)}>
                  <User className="mr-2 h-4 w-4" /> Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="mr-2 h-4 w-4" /> Configurações
                </DropdownMenuItem>
                {(profile?.role === "teacher" || profile?.role === "admin") && (
                  <DropdownMenuItem onClick={() => router.push("/teacher")}>
                    <BookOpen className="mr-2 h-4 w-4" /> Painel Professor
                  </DropdownMenuItem>
                )}
                {profile?.role === "admin" && (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    <Shield className="mr-2 h-4 w-4" /> Painel Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-level-purple-dark">Catálogo de Cursos</h1>
          <p className="mt-1 text-muted-foreground">Escolha um curso e comece a aprender Python hoje mesmo.</p>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar curso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-level-purple focus:ring-2 focus:ring-level-purple/20"
            />
          </div>

          {/* Level filter */}
          <div className="flex items-center gap-2">
            {[
              { value: "all",           label: "Todos" },
              { value: "iniciante",     label: "Iniciante" },
              { value: "intermediario", label: "Intermediário" },
              { value: "avancado",      label: "Avançado" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterLevel(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterLevel === opt.value
                    ? "bg-level-purple text-white"
                    : "bg-white border border-border text-muted-foreground hover:border-level-purple hover:text-level-purple"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h2 className="mt-4 text-lg font-semibold text-level-purple-dark">Nenhum curso encontrado</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tente outro termo ou filtro.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                enrolled={enrolledIds.has(course.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden">
        <div className="flex items-center justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground">
            <BookOpen className="h-5 w-5" /><span className="text-xs">Aprender</span>
          </Link>
          <Link href="/cursos" className="flex flex-col items-center gap-1 px-3 py-2 text-level-purple">
            <Star className="h-5 w-5" /><span className="text-xs font-medium">Cursos</span>
          </Link>
          <Link href="/leaderboard" className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground">
            <Trophy className="h-5 w-5" /><span className="text-xs">Ranking</span>
          </Link>
          <Link href={`/perfil/${profile?.username || "me"}`} className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground">
            <User className="h-5 w-5" /><span className="text-xs">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
