import Link from "next/link"
import { ArrowLeft, BookOpen, CheckCircle2, Eye, EyeOff, Globe, Loader2, Save } from "lucide-react"
import { LevelButton } from "@/components/design-system/level-button"

export function EditorHeader({ isNew, title, published, saving, dirty, justSaved, onSave, onPublish, onUnpublish }: {
  isNew: boolean
  title: string
  published: boolean
  saving: boolean
  dirty: boolean
  justSaved: boolean
  onSave: () => void
  onPublish: () => void
  onUnpublish: () => void
}) {
  const canSave = !saving && title.trim().length > 0
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/teacher" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-level-purple">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar</span>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex min-w-0 items-center gap-2">
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
                      published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {published ? "Publicada" : "Rascunho"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {justSaved && !dirty ? (
            <span className="hidden items-center gap-1.5 text-sm text-success sm:flex">
              <CheckCircle2 className="h-4 w-4" /> Salvo!
            </span>
          ) : dirty && !isNew ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">Alterações não salvas</span>
          ) : null}

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="flex items-center gap-2 rounded-xl border-2 border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {published ? "Salvar" : "Salvar rascunho"}
          </button>

          {published ? (
            <button
              type="button"
              onClick={onUnpublish}
              disabled={!canSave}
              className="flex items-center gap-2 rounded-xl border-2 border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
            >
              <EyeOff className="h-4 w-4" /> Despublicar
            </button>
          ) : (
            <LevelButton variant="primary" size="md" onClick={onPublish} disabled={!canSave}>
              <span className="flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isNew ? <Eye className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                {saving ? "Salvando..." : "Publicar lição"}
              </span>
            </LevelButton>
          )}
        </div>
      </div>
    </header>
  )
}
