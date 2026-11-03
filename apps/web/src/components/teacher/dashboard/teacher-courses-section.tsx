import Link from "next/link"
import { Edit3, Eye, EyeOff, Globe, GraduationCap, Loader2, Plus, Star, Trash2 } from "lucide-react"
import type { Course } from "@levelusp/contracts"
import { Badge } from "@/components/ui/badge"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"

const PLACEHOLDER_COUNT = 3
const ICON_ACTION_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"

interface TeacherCoursesSectionProps {
  courses: Course[]
  isLoading: boolean
  togglingCourseId: string | null
  deletingCourseId: string | null
  onTogglePublished: (course: Course) => void
  onDelete: (course: Course) => void
}

export function TeacherCoursesSection({
  courses, isLoading, togglingCourseId, deletingCourseId, onTogglePublished, onDelete,
}: TeacherCoursesSectionProps): React.JSX.Element {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-level-purple" />
          <h2 className="text-base font-semibold text-level-purple-dark">Meus Cursos</h2>
          <span className="text-xs text-muted-foreground">({courses.length})</span>
        </div>
        <Link
          href={ROUTES.teacherNewCourse}
          className="flex items-center gap-1.5 rounded-lg bg-level-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-level-purple-dark transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Novo Curso
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-10 text-center">
          <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-level-purple-dark">Nenhum curso criado</p>
          <p className="mt-1 text-xs text-muted-foreground">Crie um curso para organizar suas lições</p>
          <Link
            href={ROUTES.teacherNewCourse}
            className="mt-4 rounded-xl bg-level-purple px-5 py-2 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors"
          >
            Criar primeiro curso
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <TeacherCourseCard
              key={course.id}
              course={course}
              isToggling={togglingCourseId === course.id}
              isDeleting={deletingCourseId === course.id}
              onTogglePublished={() => onTogglePublished(course)}
              onDelete={() => onDelete(course)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TeacherCourseCardProps {
  course: Course
  isToggling: boolean
  isDeleting: boolean
  onTogglePublished: () => void
  onDelete: () => void
}

function TeacherCourseCard({ course, isToggling, isDeleting, onTogglePublished, onDelete }: TeacherCourseCardProps): React.JSX.Element {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-white p-5 transition-shadow hover:shadow-md">
      {course.cover_image_url ? (
        <div className="mb-3 h-20 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- capa enviada pelo professor (upload ou URL externa), sem domínio fixo para o next/image */}
          <img src={course.cover_image_url} alt={course.title} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mb-3 flex h-20 items-center justify-center rounded-xl bg-level-purple-subtle">
          <GraduationCap className="h-8 w-8 text-level-purple/50" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-level-purple-dark">{course.title}</p>
          <div className="mt-1 flex items-center gap-2">
            {course.published ? (
              <Badge className="border-0 bg-green-100 text-green-700 text-[10px]">Publicado</Badge>
            ) : (
              <Badge className="border-0 bg-muted text-muted-foreground text-[10px]">Rascunho</Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{course.lesson_count ?? 0} lições</span>
            {course.final_project_title && (
              <span title="Tem projeto final">
                <Star className="h-3 w-3 text-yellow-500" />
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1">
        <button
          onClick={onTogglePublished}
          disabled={isToggling}
          title={course.published ? "Despublicar" : "Publicar"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
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
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
