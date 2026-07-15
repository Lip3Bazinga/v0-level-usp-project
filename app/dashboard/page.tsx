"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { useProgress } from "@/contexts/progress-context"
import type { Lesson } from "@/lib/supabase/types"
import type { Course } from "@/lib/supabase/types"
import { fetchPublishedCourses } from "@/lib/supabase/courses"
import { CourseCard } from "@/components/dashboard/course-trail"
import {
  StatCards, DailyGoalRing, WeeklyActivity, NextBadge, useStudyDays,
} from "@/components/dashboard/widgets"
import {
  Rocket, Trophy, Zap, User, Settings, BookOpen,
  Flame, LogOut, Shield, GraduationCap, NotebookPen,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(fullName: string) {
  return fullName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading, signOut } = useAuth()
  const { lessons, progressMap, isLoading: dataLoading, error, gamification } = useProgress()

  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)

  useEffect(() => {
    fetchPublishedCourses()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setCoursesLoading(false))
  }, [])

  // Agrupar lições por curso
  const courseGroups = useMemo(() => {
    const lessonsByCourse = new Map<string, Lesson[]>()
    const standalone: Lesson[] = []

    for (const l of lessons) {
      if (l.course_id) {
        const arr = lessonsByCourse.get(l.course_id) ?? []
        arr.push(l)
        lessonsByCourse.set(l.course_id, arr)
      } else {
        standalone.push(l)
      }
    }

    const groups = courses
      .filter((c) => lessonsByCourse.has(c.id))
      .map((c) => ({
        course: c,
        lessons: (lessonsByCourse.get(c.id) ?? []).sort((a, b) => a.order - b.order),
      }))

    return groups
  }, [courses, lessons])

  const { level, totalXp, streak, xpInLevel, xpCeil, xpProgress } = gamification
  const studyDays = useStudyDays(progressMap)
  const lessonsCompleted = useMemo(() => {
    let n = 0
    progressMap.forEach((p) => { if (p.status === "completed") n++ })
    return n
  }, [progressMap])

  const firstName = profile?.full_name?.split(" ")[0] ?? "Estudante"
  const initials = profile?.full_name ? getInitials(profile.full_name) : "?"

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  const RING_R = 34
  const RING_C = 2 * Math.PI * RING_R

  const isLoading = dataLoading || coursesLoading

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
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
            <Link href="/cursos" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <GraduationCap className="h-4 w-4" /> Cursos
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <Trophy className="h-4 w-4" /> Ranking
            </Link>
            <Link href="/notas" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <NotebookPen className="h-4 w-4" /> Notas
            </Link>
            <Link href={`/perfil/${profile?.username || "me"}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <User className="h-4 w-4" /> Perfil
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-level-purple px-3 py-1.5 text-white">
              <Zap className="h-4 w-4 text-yellow-300" />
              <span className="text-xs font-bold">{totalXp.toLocaleString("pt-BR")} XP</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-linear-to-r from-orange-500 to-red-500 px-3 py-1.5 text-white">
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
                {profile?.role === "teacher" || profile?.role === "admin" ? (
                  <DropdownMenuItem onClick={() => router.push("/teacher")}>
                    <BookOpen className="mr-2 h-4 w-4" /> Painel Professor
                  </DropdownMenuItem>
                ) : null}
                {profile?.role === "admin" ? (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    <Shield className="mr-2 h-4 w-4" /> Painel Admin
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

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-level-purple via-level-purple to-level-purple-dark p-6 text-white shadow-xl shadow-purple-200 sm:p-8"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-fuchsia-400/20 blur-3xl" />

          <div className="relative flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-wider text-purple-200">
                {authLoading ? " " : "Bem-vindo de volta"}
              </p>
              <h1 className="mt-1 truncate text-2xl font-extrabold sm:text-3xl">
                {authLoading ? "Carregando..." : `Olá, ${firstName}!`}
              </h1>
              <p className="mt-1 text-sm text-purple-200">
                {xpInLevel.toLocaleString("pt-BR")} / {xpCeil.toLocaleString("pt-BR")} XP para o Nível {level + 1}
              </p>
              <div className="mt-4 h-3 max-w-md overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="relative h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, xpProgress)}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                >
                  <span className="absolute inset-0 animate-pulse rounded-full bg-white/20" />
                </motion.div>
              </div>
            </div>

            {/* Anel de nível */}
            <div className="relative hidden h-[92px] w-[92px] shrink-0 sm:block">
              <svg viewBox="0 0 92 92" className="h-full w-full -rotate-90">
                <circle cx="46" cy="46" r={RING_R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <motion.circle
                  cx="46" cy="46" r={RING_R} fill="none"
                  stroke="#FCD34D" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={RING_C}
                  initial={{ strokeDashoffset: RING_C }}
                  animate={{ strokeDashoffset: RING_C * (1 - xpProgress / 100) }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.4 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wide text-purple-200">Nível</span>
                <span className="text-2xl font-extrabold leading-none">{level}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        {/* Grade: cursos + sidebar */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Sidebar — widgets primeiro no mobile */}
          <aside className="order-1 space-y-4 lg:order-2">
            <StatCards streak={streak} totalXp={totalXp} lessonsCompleted={lessonsCompleted} level={level} />
            <DailyGoalRing studyDays={studyDays} />
            <WeeklyActivity studyDays={studyDays} />
            <NextBadge profile={profile} />
          </aside>

          {/* Trilha de cursos */}
          <div className="order-2 space-y-4 lg:order-1">
            {isLoading ? (
              /* Skeleton */
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted/60" />
                ))}
              </div>
            ) : courseGroups.length === 0 ? (
              <div className="py-16 text-center">
                <GraduationCap className="mx-auto h-16 w-16 text-muted-foreground/30" />
                <h2 className="mt-4 text-lg font-semibold text-level-purple-dark">Nenhum curso disponível</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Os cursos aparecerão aqui quando forem publicados.
                </p>
                <Link
                  href="/cursos"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-medium transition-colors"
                >
                  <BookOpen className="h-4 w-4" /> Explorar cursos
                </Link>
              </div>
            ) : (
              courseGroups.map((group, i) => (
                <motion.div
                  key={group.course.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 * i }}
                >
                  <CourseCard
                    course={group.course}
                    lessons={group.lessons}
                    progressMap={progressMap}
                    defaultOpen={i === 0}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden">
        <div className="flex items-center justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 px-3 py-2 text-level-purple">
            <BookOpen className="h-5 w-5" /><span className="text-xs font-medium">Aprender</span>
          </Link>
          <Link href="/cursos" className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground">
            <GraduationCap className="h-5 w-5" /><span className="text-xs">Cursos</span>
          </Link>
          <Link href="/leaderboard" className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground">
            <Trophy className="h-5 w-5" /><span className="text-xs">Ranking</span>
          </Link>
          <Link href="/notas" className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground">
            <NotebookPen className="h-5 w-5" /><span className="text-xs">Notas</span>
          </Link>
          <Link href={`/perfil/${profile?.username || "me"}`} className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground">
            <User className="h-5 w-5" /><span className="text-xs">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
