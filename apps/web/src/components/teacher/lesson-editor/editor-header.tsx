import Link from "next/link"
import { ArrowLeft, BookOpen, CheckCircle2, Eye, EyeOff, Globe, Loader2, Save } from "lucide-react"
import { LevelButton } from "@/components/design-system/level-button"
import { ROUTES } from "@/lib/constants"

interface EditorHeaderProps {
  isNew: boolean
  title: string
  isPublished: boolean
  isSaving: boolean
  isDirty: boolean
  hasJustSaved: boolean
  onSave: () => void
  onPublish: () => void
  onUnpublish: () => void
}

export function EditorHeader({
  isNew, title, isPublished, isSaving, isDirty, hasJustSaved, onSave, onPublish, onUnpublish,
}: EditorHeaderProps) {
  const canSave = !isSaving && title.trim().length > 0
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link href={ROUTES.teacher} aria-label="Voltar ao painel do professor" className="flex shrink-0 items-center gap-2 text-muted-foreground transition-colors hover:text-level-purple">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden text-sm sm:inline">Voltar</span>
          </Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-level-purple">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-level-purple-dark">Editor de Lição</h1>
              <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                <span className="truncate">{isNew ? "Nova lição" : title || "Sem título"}</span>
                {!isNew && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      isPublished ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isPublished ? "Publicada" : "Rascunho"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {hasJustSaved && !isDirty ? (
            <span className="hidden items-center gap-1.5 text-sm text-success sm:flex">
              <CheckCircle2 className="h-4 w-4" /> Salvo!
            </span>
          ) : isDirty && !isNew ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">Alterações não salvas</span>
          ) : null}

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple disabled:opacity-50 sm:px-4"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isPublished ? "Salvar" : <><span className="sm:hidden">Salvar</span><span className="hidden sm:inline">Salvar rascunho</span></>}
          </button>

          {isPublished ? (
            <button
              type="button"
              onClick={onUnpublish}
              disabled={!canSave}
              className="flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50 sm:px-4"
            >
              <EyeOff className="h-4 w-4" /> Despublicar
            </button>
          ) : (
            <LevelButton variant="primary" size="md" onClick={onPublish} disabled={!canSave} className="px-4 sm:px-6">
              <span className="flex items-center gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isNew ? <Eye className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                {isSaving ? "Salvando..." : <><span className="sm:hidden">Publicar</span><span className="hidden sm:inline">Publicar lição</span></>}
              </span>
            </LevelButton>
          )}
        </div>
      </div>
    </header>
  )
}
