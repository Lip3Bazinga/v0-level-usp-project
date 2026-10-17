"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, CheckCircle2, ChevronRight, Search, Zap } from "lucide-react"
import type { Course, Difficulty } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchMyEnrollments, fetchPublishedCourses } from "@/lib/api"
import { DIFFICULTY_BADGE_CLASSES, DIFFICULTY_LABELS, ROUTES } from "@/lib/constants"
import { LoadErrorAlert } from "@/components/design-system/load-error-alert"
import { StudentShell } from "@/components/dashboard/student-shell"
import { CourseIcon } from "./course-icon"
import { filterCourses, LEVEL_FILTERS, type LevelFilter } from "./course-filters"

const COURSE_GRADIENTS: Record<Difficulty, string> = {
  iniciante: "from-violet-500 to-purple-600",
  intermediario: "from-amber-500 to-orange-600",
  avancado: "from-rose-500 to-red-600",
}

const SKELETON_CARDS = [1, 2, 3, 4, 5, 6]
const NO_COURSES: Course[] = []
const NO_ENROLLMENTS: string[] = []

export default function CoursesPage() {
  const { profile, isLoading: isAuthLoading } = useAuth()
  const profileId = profile?.id
  const [searchText, setSearchText] = useState("")
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all")

  const coursesResource = useAsyncResource(() => fetchPublishedCourses(), [])
  // Sem matrícula carregada, o catálogo continua utilizável (só sem o selo "Matriculado").
  const enrollmentsResource = useAsyncResource(
    () => (profileId ? fetchMyEnrollments().catch(() => NO_ENROLLMENTS) : Promise.resolve(NO_ENROLLMENTS)),
    [profileId],
  )

  const isLoading = isAuthLoading || coursesResource.status === "loading" || enrollmentsResource.status === "loading"
  const courses = coursesResource.status === "success" ? coursesResource.data : NO_COURSES
  const enrolledIds = new Set(enrollmentsResource.status === "success" ? enrollmentsResource.data : NO_ENROLLMENTS)
  const visibleCourses = filterCourses(courses, searchText, levelFilter)

  const handleRetry = () => {
    void coursesResource.reload()
    void enrollmentsResource.reload()
  }

  return (
    <StudentShell screen="courses">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-level-purple-dark">Catálogo de Cursos</h1>
          <p className="mt-1 text-muted-foreground">Escolha um curso e comece a aprender Python hoje mesmo.</p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar curso..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-level-purple focus:ring-2 focus:ring-level-purple/20"
            />
          </div>

          <div className="flex items-center gap-2">
            {LEVEL_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setLevelFilter(filter.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  levelFilter === filter.value
                    ? "bg-level-purple text-white"
                    : "border border-border bg-white text-muted-foreground hover:border-level-purple hover:text-level-purple"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SKELETON_CARDS.map((key) => (
              <SkeletonCard key={key} />
            ))}
          </div>
        ) : coursesResource.status === "error" ? (
          <div className="py-16">
            <LoadErrorAlert message="Não foi possível carregar os cursos." onRetry={handleRetry} />
          </div>
        ) : visibleCourses.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h2 className="mt-4 text-lg font-semibold text-level-purple-dark">Nenhum curso encontrado</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tente outro termo ou filtro.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((course) => (
              <CourseCard key={course.id} course={course} isEnrolled={enrolledIds.has(course.id)} />
            ))}
          </div>
        )}
      </main>
    </StudentShell>
  )
}

interface CourseCardProps {
  course: Course
  isEnrolled: boolean
}

function CourseCard({ course, isEnrolled }: CourseCardProps) {
  return (
    <Link
      href={ROUTES.course(course.id)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${COURSE_GRADIENTS[course.level]}`}>
        <CourseIcon courseTitle={course.title} className="h-16 w-16 text-white/80" />
        {isEnrolled && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            <span className="text-[11px] font-semibold text-white">Matriculado</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${DIFFICULTY_BADGE_CLASSES[course.level]} bg-white/90`}>
            {DIFFICULTY_LABELS[course.level]}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 text-base font-bold text-level-purple-dark transition-colors group-hover:text-level-purple">
          {course.title}
        </h3>
        <p className="mb-4 line-clamp-2 text-xs text-muted-foreground">{course.description}</p>

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
