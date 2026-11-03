"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, Clock, Edit3, Eye, EyeOff, Globe, GraduationCap, Loader2, Search, Star, Trash2, Zap } from "lucide-react"
import type { Course } from "@levelusp/contracts"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { deleteCourse, fetchTeacherCourses, getErrorMessage, setCoursePublished } from "@/lib/api"
import { DIFFICULTY_BADGE_CLASSES, DIFFICULTY_LABELS, ROUTES } from "@/lib/constants"
import type { OnToast } from "@/lib/types"
import { cn } from "@/lib/utils"
import { swalConfirm } from "@/lib/swal"
import { PanelSpinner } from "./panel-spinner"

const ICON_ACTION_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"

/** Para o admin, `/teacher/courses` devolve todos os cursos (com `lesson_count`), do mais novo ao mais antigo. */
async function loadAllCourses(): Promise<Course[]> {
  const courses = await fetchTeacherCourses()
  return [...courses].sort((first, second) => second.created_at.localeCompare(first.created_at))
}

function matchesSearch(course: Course, search: string): boolean {
  const term = search.toLowerCase()
  return course.title.toLowerCase().includes(term) || course.description.toLowerCase().includes(term)
}

interface CoursesPageProps {
  onToast: OnToast
}

export function CoursesPage({ onToast }: CoursesPageProps): React.JSX.Element {
  const courses = useAsyncResource(loadAllCourses, [], { errorMessage: "Não foi possível carregar os cursos." })
  const [search, setSearch] = useState("")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const allCourses = courses.status === "success" ? courses.data : []
  const filtered = allCourses.filter((course) => matchesSearch(course, search))
  const publishedCount = allCourses.filter((course) => course.published).length

  const handleTogglePublished = async (course: Course): Promise<void> => {
    setTogglingId(course.id)
    try {
      const updated = await setCoursePublished(course.id, !course.published)
      courses.setData((current) => current.map((item) => (item.id === course.id ? { ...item, published: updated.published } : item)))
      onToast(course.published ? "Curso despublicado" : "Curso publicado", "success")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao alterar status"), "error")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (course: Course): Promise<void> => {
    const isConfirmed = await swalConfirm({ title: `Excluir "${course.title}" permanentemente?`, confirmText: "Excluir", danger: true })
    if (!isConfirmed) return
    setDeletingId(course.id)
    try {
      await deleteCourse(course.id)
      courses.setData((current) => current.filter((item) => item.id !== course.id))
      onToast("Curso excluído", "success")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao excluir"), "error")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Buscar cursos"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cursos..."
            className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2.5 text-sm focus:border-level-purple focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{publishedCount} publicados</span>
          <span>·</span>
          <span>{allCourses.length - publishedCount} rascunhos</span>
          <span>·</span>
          <span>{allCourses.length} total</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {courses.status === "error" ? (
          <p role="alert" className="px-4 py-6 text-center text-sm text-destructive">{courses.error}</p>
        ) : courses.status === "loading" ? (
          <PanelSpinner className="py-16" />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-level-purple-dark">Nenhum curso encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                isToggling={togglingId === course.id}
                isDeleting={deletingId === course.id}
                onTogglePublished={() => void handleTogglePublished(course)}
                onDelete={() => void handleDelete(course)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface CourseRowProps {
  course: Course
  isToggling: boolean
  isDeleting: boolean
  onTogglePublished: () => void
  onDelete: () => void
}

function CourseRow({ course, isToggling, isDeleting, onTogglePublished, onDelete }: CourseRowProps): React.JSX.Element {
  const toggleLabel = course.published ? "Despublicar" : "Publicar"
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
      <div className="shrink-0">
        {course.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa enviada pelo professor (upload ou URL externa), sem domínio fixo para o next/image
          <img src={course.cover_image_url} alt={course.title} className="h-12 w-12 rounded-xl object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-subtle">
            <GraduationCap className="h-6 w-6 text-level-purple/60" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-level-purple-dark truncate">{course.title}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", DIFFICULTY_BADGE_CLASSES[course.level])}>
            {DIFFICULTY_LABELS[course.level]}
          </span>
          {course.published ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Publicado</span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Rascunho</span>
          )}
          {course.final_project_title && (
            <span className="flex items-center gap-0.5 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
              <Star className="h-2.5 w-2.5" /> Projeto final
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-md">{course.description}</p>
        <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.lesson_count ?? 0} lições</span>
          <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" />{course.total_xp} XP</span>
          {course.estimated_hours > 0 && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.estimated_hours}h</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onTogglePublished}
          disabled={isToggling}
          title={toggleLabel}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50",
            course.published ? "text-green-600 hover:bg-green-50" : "text-muted-foreground hover:bg-level-purple-light hover:text-level-purple",
          )}
        >
          {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : course.published ? <Globe className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        {course.published && (
          <Link href={ROUTES.course(course.id)} target="_blank" title="Ver página" className={ICON_ACTION_CLASS}>
            <Eye className="h-4 w-4" />
          </Link>
        )}
        <Link href={ROUTES.teacherCourse(course.id)} title="Editar" className={ICON_ACTION_CLASS}>
          <Edit3 className="h-4 w-4" />
        </Link>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          title="Excluir"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
