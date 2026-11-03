import Link from "next/link"
import { ArrowLeft, BookOpen, CheckCircle2, Eye, Globe, Loader2, Save } from "lucide-react"
import { ROUTES } from "@/lib/constants"

interface CourseEditorHeaderProps {
  courseId: string | null
  title: string
  isPublished: boolean
  isSaving: boolean
  isReordering: boolean
  hasJustSaved: boolean
  onSave: () => void
  onPublish: () => void
  onUnpublish: () => void
}

export function CourseEditorHeader({
  courseId, title, isPublished, isSaving, isReordering, hasJustSaved, onSave, onPublish, onUnpublish,
}: CourseEditorHeaderProps): React.JSX.Element {
  const canSave = !isSaving && title.trim().length > 0
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href={ROUTES.teacher}
            aria-label="Voltar ao painel do professor"
            className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-level-purple"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Painel</span>
          </Link>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-level-purple-dark">{!courseId ? "Novo Curso" : title || "Editor de Curso"}</p>
              <p className="text-xs text-muted-foreground">{isPublished ? "Publicado" : "Rascunho"}</p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasJustSaved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Salvo
            </span>
          )}
          {isReordering && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando ordem...
            </span>
          )}
          {courseId && (
            <Link
              href={ROUTES.course(courseId)}
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
            >
              <Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Ver página</span>
              <span className="sr-only sm:hidden">Ver página do curso</span>
            </Link>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple disabled:opacity-40"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isPublished ? "Salvar" : "Rascunho"}
          </button>
          {isPublished ? (
            <button
              type="button"
              onClick={onUnpublish}
              disabled={!canSave}
              className="flex items-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40"
            >
              Despublicar
            </button>
          ) : (
            <button
              type="button"
              onClick={onPublish}
              disabled={!canSave}
              className="flex items-center gap-1.5 rounded-lg bg-level-purple px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
              Publicar
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
