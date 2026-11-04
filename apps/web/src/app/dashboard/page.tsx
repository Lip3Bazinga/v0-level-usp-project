"use client"

import { useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BookOpen, GraduationCap } from "lucide-react"
import type { Course } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useProgress } from "@/contexts/progress-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchPublishedCourses } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { formatNumber, formatXp, type GamificationSummary } from "@/lib/utils"
import { CourseCard } from "@/components/dashboard/course-trail"
import { countCompletedLessons, groupLessonsByCourse } from "@/components/dashboard/course-groups"
import { StudentShell } from "@/components/dashboard/student-shell"
import { StatCards, DailyGoalRing, WeeklyActivity, NextBadge, useStudyDays } from "@/components/dashboard/widgets"

const NO_COURSES: Course[] = []
const LEVEL_RING_RADIUS = 34
const LEVEL_RING_CIRCUMFERENCE = 2 * Math.PI * LEVEL_RING_RADIUS
/** A barra nunca some por completo: um traço mostra que o nível começou. */
const MIN_VISIBLE_PROGRESS_PERCENT = 2
const SKELETON_CARDS = [0, 1]

export default function DashboardPage(): React.JSX.Element {
  const { profile, isLoading: isAuthLoading } = useAuth()
  const { lessons, progressMap, isLoading: isProgressLoading, error, gamification } = useProgress()
  // Falha no catálogo mostra o estado vazio aqui; o erro com nova tentativa fica em /cursos.
  const coursesResource = useAsyncResource(() => fetchPublishedCourses(), [])
  const courses = coursesResource.status === "success" ? coursesResource.data : NO_COURSES

  const courseGroups = useMemo(() => groupLessonsByCourse(courses, lessons), [courses, lessons])
  const studyDays = useStudyDays(progressMap)
  const lessonsCompleted = useMemo(() => countCompletedLessons(progressMap), [progressMap])
  const isLoading = isProgressLoading || coursesResource.status === "loading"
  const firstName = profile?.full_name.split(" ")[0] ?? "Estudante"

  return (
    <StudentShell screen="dashboard">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <DashboardHero firstName={firstName} isAuthLoading={isAuthLoading} gamification={gamification} />

        {error && <div className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* No celular os widgets vêm antes da trilha. */}
          <aside className="order-1 space-y-4 lg:order-2">
            <StatCards
              streak={gamification.streak}
              totalXp={gamification.totalXp}
              lessonsCompleted={lessonsCompleted}
              level={gamification.level}
            />
            <DailyGoalRing studyDays={studyDays} />
            <WeeklyActivity studyDays={studyDays} />
            <NextBadge profile={profile} />
          </aside>

          <div className="order-2 space-y-4 lg:order-1">
            {isLoading ? (
              <div className="space-y-4">
                {SKELETON_CARDS.map((key) => (
                  <div key={key} className="h-32 animate-pulse rounded-3xl bg-muted/60" />
                ))}
              </div>
            ) : courseGroups.length === 0 ? (
              <NoCoursesYet />
            ) : (
              courseGroups.map((group, index) => (
                <motion.div
                  key={group.course.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 * index }}
                >
                  <CourseCard
                    course={group.course}
                    lessons={group.lessons}
                    progressMap={progressMap}
                    defaultOpen={index === 0}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </StudentShell>
  )
}

interface DashboardHeroProps {
  firstName: string
  isAuthLoading: boolean
  gamification: GamificationSummary
}

function DashboardHero({ firstName, isAuthLoading, gamification }: DashboardHeroProps): React.JSX.Element {
  const { level, xpInLevel, xpLevelRange, xpProgress } = gamification
  return (
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
            {isAuthLoading ? " " : "Bem-vindo de volta"}
          </p>
          <h1 className="mt-1 truncate text-2xl font-extrabold sm:text-3xl">
            {isAuthLoading ? "Carregando..." : `Olá, ${firstName}!`}
          </h1>
          <p className="mt-1 text-sm text-purple-200">
            {formatNumber(xpInLevel)} / {formatXp(xpLevelRange)} para o Nível {level + 1}
          </p>
          <div className="mt-4 h-3 max-w-md overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="relative h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(MIN_VISIBLE_PROGRESS_PERCENT, xpProgress)}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            >
              <span className="absolute inset-0 animate-pulse rounded-full bg-white/20" />
            </motion.div>
          </div>
        </div>

        <LevelRing level={level} progressPercent={xpProgress} />
      </div>
    </motion.div>
  )
}

function LevelRing({ level, progressPercent }: { level: number; progressPercent: number }): React.JSX.Element {
  return (
    <div className="relative hidden h-[92px] w-[92px] shrink-0 sm:block">
      <svg viewBox="0 0 92 92" className="h-full w-full -rotate-90">
        <circle cx="46" cy="46" r={LEVEL_RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
        <motion.circle
          cx="46"
          cy="46"
          r={LEVEL_RING_RADIUS}
          fill="none"
          stroke="#FCD34D"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={LEVEL_RING_CIRCUMFERENCE}
          initial={{ strokeDashoffset: LEVEL_RING_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: LEVEL_RING_CIRCUMFERENCE * (1 - progressPercent / 100) }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.4 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold uppercase tracking-wide text-purple-200">Nível</span>
        <span className="text-2xl font-extrabold leading-none">{level}</span>
      </div>
    </div>
  )
}

function NoCoursesYet(): React.JSX.Element {
  return (
    <div className="py-16 text-center">
      <GraduationCap className="mx-auto h-16 w-16 text-muted-foreground/30" />
      <h2 className="mt-4 text-lg font-semibold text-level-purple-dark">Nenhum curso disponível</h2>
      <p className="mt-2 text-sm text-muted-foreground">Os cursos aparecerão aqui quando forem publicados.</p>
      <Link
        href={ROUTES.courses}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
      >
        <BookOpen className="h-4 w-4" /> Explorar cursos
      </Link>
    </div>
  )
}
