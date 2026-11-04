import Link from "next/link"
import { BookOpen, ChevronLeft, GraduationCap, Plus } from "lucide-react"
import { ROUTES } from "@/lib/constants"

interface TeacherHeaderProps {
  /** `null` enquanto o perfil carrega. */
  teacherName: string | null
}

export function TeacherHeader({ teacherName }: TeacherHeaderProps): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href={ROUTES.dashboard}
            aria-label="Voltar ao painel do aluno"
            className="flex items-center gap-2 text-muted-foreground hover:text-level-purple transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden text-sm sm:inline">Painel</span>
          </Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-level-purple">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-level-purple-dark">Painel do Professor</h1>
              <p className="truncate text-xs text-muted-foreground">{teacherName ?? "Carregando..."}</p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={ROUTES.teacherNewCourse}
            aria-label="Novo curso"
            className="flex items-center gap-2 rounded-xl bg-level-purple-light px-4 py-3 text-base font-semibold text-level-purple-dark transition-colors hover:bg-level-purple-subtle focus:outline-none focus:ring-2 focus:ring-level-purple focus:ring-offset-2 sm:px-6"
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Curso</span>
          </Link>
          <Link
            href={ROUTES.teacherNewLesson}
            aria-label="Nova lição"
            className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-level-purple-dark focus:outline-none focus:ring-2 focus:ring-level-purple focus:ring-offset-2 sm:px-6"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Lição</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
