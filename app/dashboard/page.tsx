"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { LevelProgress } from "@/components/design-system/level-progress"
import {
  fetchPublishedLessons,
  fetchUserProgress,
  computeModuleStatuses,
  type LessonStatus,
} from "@/lib/supabase/lessons"
import type { Lesson, LessonProgress } from "@/lib/supabase/types"
import {
  Rocket, Lock, CheckCircle2, Play, Star, Trophy, Zap, User,
  Settings, BookOpen, Code2, Database, Brain, ChevronRight,
  Flame, LogOut, Loader2,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// ── Helpers ───────────────────────────────────────────────────────────────────

function xpForLevel(level: number) { return level * 1000 }

function getInitials(fullName: string) {
  return fullName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

const MODULE_META: Record<string, { icon: typeof Code2; color: string; order: number }> = {
  "Python Básico":        { icon: Code2,     color: "bg-level-purple", order: 0 },
  "Python Intermediário": { icon: Brain,     color: "bg-warning",      order: 1 },
  "Ciência de Dados":     { icon: Database,  color: "bg-success",      order: 2 },
}
const DEFAULT_MODULE_META = { icon: BookOpen, color: "bg-muted-foreground", order: 99 }

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex w-full max-w-sm items-center gap-4 rounded-2xl border-2 border-border p-4">
      <div className="h-12 w-12 shrink-0 rounded-xl bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading, signOut } = useAuth()

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progressList, setProgressList] = useState<LessonProgress[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carrega lições e progresso do usuário
  useEffect(() => {
    if (authLoading) return
    async function load() {
      setDataLoading(true)
      setError(null)
      try {
        const [fetchedLessons, fetchedProgress] = await Promise.all([
          fetchPublishedLessons(),
          profile ? fetchUserProgress(profile.id) : Promise.resolve([]),
        ])
        setLessons(fetchedLessons)
        setProgressList(fetchedProgress)
      } catch {
        setError("Não foi possível carregar as lições. Tente novamente.")
      } finally {
        setDataLoading(false)
      }
    }
    load()
  }, [authLoading, profile])

  // Mapa de progresso por lesson_id
  const progressMap = useMemo(
    () => new Map(progressList.map((p) => [p.lesson_id, p])),
    [progressList]
  )

  // Agrupa lições por módulo, ordenadas por order
  const modules = useMemo(() => {
    const grouped = new Map<string, Lesson[]>()
    for (const lesson of lessons) {
      const arr = grouped.get(lesson.module) ?? []
      arr.push(lesson)
      grouped.set(lesson.module, arr)
    }
    return Array.from(grouped.entries())
      .map(([name, moduleLessons]) => ({
        name,
        lessons: moduleLessons.sort((a, b) => a.order - b.order),
        meta: MODULE_META[name] ?? DEFAULT_MODULE_META,
      }))
      .sort((a, b) => a.meta.order - b.meta.order)
  }, [lessons])

  // Gamificação
  const level = profile?.level ?? 1
  const totalXp = profile?.total_xp ?? 0
  const streak = profile?.current_streak ?? 0
  const xpFloor = xpForLevel(level - 1)
  const xpCeil = xpForLevel(level)
  const xpInLevel = totalXp - xpFloor
  const xpProgress = xpCeil > 0 ? Math.min(100, Math.round((xpInLevel / xpCeil) * 100)) : 0
  const firstName = profile?.full_name?.split(" ")[0] ?? "Estudante"
  const initials = profile?.full_name ? getInitials(profile.full_name) : "?"

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
    router.push("/login")
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
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-level-purple">
              <BookOpen className="h-4 w-4" /> Aprender
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <Trophy className="h-4 w-4" /> Ranking
            </Link>
            <Link href={`/perfil/${profile?.username ?? "me"}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <User className="h-4 w-4" /> Perfil
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-level-purple px-3 py-1.5 text-white">
              <Zap className="h-4 w-4 text-yellow-300" />
              <span className="text-xs font-bold">{xpInLevel.toLocaleString("pt-BR")} XP</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-linear-to-r from-orange-500 to-red-500 px-3 py-1.5 text-white">
              <Flame className="h-4 w-4 text-yellow-300" />
              <span className="text-xs font-bold">{streak}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-level-purple-light px-3 py-1.5">
              <Trophy className="h-4 w-4 text-level-purple" />
              <span className="text-xs font-semibold text-level-purple-dark">Nível {level}</span>
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
                <DropdownMenuItem onClick={() => router.push(`/perfil/${profile?.username ?? "me"}`)}>
                  <User className="mr-2 h-4 w-4" /> Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="mr-2 h-4 w-4" /> Configurações
                </DropdownMenuItem>
                {profile?.role === "teacher" || profile?.role === "admin" ? (
                  <DropdownMenuItem onClick={() => router.push("/teacher")}>
                    <BookOpen className="mr-2 h-4 w-4" /> Painel Professor
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 rounded-2xl bg-linear-to-r from-level-purple to-level-purple-dark p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">
                {authLoading ? "Carregando..." : `Olá, ${firstName}! Continue aprendendo`}
              </h1>
              <p className="mt-1 text-purple-200">
                {authLoading ? "Buscando seu progresso..." : `Você está no nível ${level}. Continue assim!`}
              </p>
              <div className="mt-4">
                <LevelProgress value={xpProgress} size="md" />
                <p className="mt-2 text-sm text-purple-200">
                  {xpInLevel.toLocaleString("pt-BR")} / {xpCeil.toLocaleString("pt-BR")} XP para o Nível {level + 1}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-center gap-2 ml-6 shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Flame className="h-10 w-10 text-orange-300" />
              </div>
              <span className="text-sm font-bold">{streak} dias</span>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Lesson Map */}
        {dataLoading ? (
          <div className="space-y-12">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="mb-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-muted animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className={`w-full max-w-sm ${j % 2 === 0 ? "self-end mr-4 md:mr-16" : "self-start ml-4 md:ml-16"}`}>
                      <SkeletonCard />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h2 className="mt-4 text-lg font-semibold text-level-purple-dark">Nenhuma lição disponível</h2>
            <p className="mt-2 text-sm text-muted-foreground">As lições aparecerão aqui quando forem publicadas.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {modules.map((module) => {
              const statuses = computeModuleStatuses(module.lessons, progressMap)
              const completedCount = statuses.filter((s) => s === "completed").length
              const Icon = module.meta.icon

              return (
                <div key={module.name}>
                  {/* Module Header */}
                  <div className="mb-6 flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${module.meta.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-level-purple-dark">{module.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {completedCount}/{module.lessons.length} lições completas
                      </p>
                    </div>
                  </div>

                  {/* Lesson Path - Zigzag */}
                  <div className="relative flex flex-col items-center gap-4">
                    {module.lessons.map((lesson, index) => {
                      const status: LessonStatus = statuses[index]
                      const isLeft = index % 2 === 0

                      return (
                        <div
                          key={lesson.id}
                          className={`flex w-full max-w-sm items-center gap-4 ${
                            isLeft ? "self-start ml-4 md:ml-16" : "self-end mr-4 md:mr-16"
                          }`}
                        >
                          {index > 0 && (
                            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: `${index * 76 - 16}px` }}>
                              <div className={`h-4 w-0.5 ${status !== "locked" ? "bg-level-purple" : "bg-border"}`} />
                            </div>
                          )}

                          <Link
                            href={status === "locked" ? "#" : `/lesson/${lesson.id}`}
                            className={`group flex w-full items-center gap-4 rounded-2xl border-2 p-4 transition-all ${
                              status === "completed"
                                ? "border-success bg-success/5 hover:bg-success/10"
                                : status === "in-progress"
                                ? "border-level-purple bg-level-purple-light hover:bg-level-purple-subtle"
                                : "border-border bg-muted/30 cursor-not-allowed opacity-60"
                            }`}
                          >
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                              status === "completed" ? "bg-success" : status === "in-progress" ? "bg-level-purple" : "bg-muted"
                            }`}>
                              {status === "completed" ? (
                                <CheckCircle2 className="h-6 w-6 text-white" />
                              ) : status === "in-progress" ? (
                                <Play className="h-6 w-6 text-white" />
                              ) : (
                                <Lock className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${
                                status === "locked" ? "text-muted-foreground" : "text-level-purple-dark"
                              }`}>
                                {lesson.title}
                              </p>
                              <p className="text-xs text-muted-foreground">+{lesson.xp_reward} XP</p>
                            </div>

                            {status === "in-progress" && (
                              <ChevronRight className="h-5 w-5 text-level-purple transition-transform group-hover:translate-x-1 shrink-0" />
                            )}
                            {status === "completed" && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              </div>
                            )}
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden">
        <div className="flex items-center justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 px-4 py-2 text-level-purple">
            <BookOpen className="h-5 w-5" /><span className="text-xs font-medium">Aprender</span>
          </Link>
          <Link href="/leaderboard" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <Trophy className="h-5 w-5" /><span className="text-xs font-medium">Ranking</span>
          </Link>
          <Link href={`/perfil/${profile?.username ?? "me"}`} className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <User className="h-5 w-5" /><span className="text-xs font-medium">Perfil</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <Settings className="h-5 w-5" /><span className="text-xs font-medium">Config</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
