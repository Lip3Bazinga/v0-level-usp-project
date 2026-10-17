"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Edit3, Eye, Layers, Loader2, Plus, Trash2 } from "lucide-react"
import type { Lesson, Module, ModuleInput } from "@levelusp/contracts"
import { LoadErrorAlert } from "@/components/design-system/load-error-alert"
import { PubBadge } from "@/components/ui/badges"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { createModule, deleteModule, fetchModules, getErrorMessage, updateModule } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import type { OnToast } from "@/lib/types"
import { cn } from "@/lib/utils"
import { AdminModal, ModalCancelButton, ModalSubmitButton } from "./admin-modal"
import { PanelSpinner } from "./panel-spinner"

const HEADER_GRADIENTS = [
  "from-level-purple to-level-purple-medium",
  "from-warning to-destructive",
  "from-success to-info",
  "from-info to-level-purple",
  "from-level-purple-dark to-level-purple",
  "from-warning to-success",
]

const DOTTED_BACKGROUND = {
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
}

const PREVIEW_LESSON_COUNT = 4

const EMPTY_MODULE: ModuleInput = { title: "", description: "", icon: "BookOpen", color: "bg-level-purple", sort_order: 0 }

const FIELD_CLASS = "w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
const LABEL_CLASS = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground"

type ModuleEditor = { form: ModuleInput; moduleId?: string }

interface LessonsByModule {
  byId: Map<string, Lesson[]>
  /** Lições antigas guardam só o título do módulo (sem `module_id`). */
  byTitle: Map<string, Lesson[]>
}

export function groupLessonsByModule(lessons: Lesson[]): LessonsByModule {
  const byId = new Map<string, Lesson[]>()
  const byTitle = new Map<string, Lesson[]>()
  const append = (groups: Map<string, Lesson[]>, key: string, lesson: Lesson) => groups.set(key, [...(groups.get(key) ?? []), lesson])
  for (const lesson of lessons) {
    if (lesson.module_id) append(byId, lesson.module_id, lesson)
    else if (lesson.module) append(byTitle, lesson.module, lesson)
  }
  return { byId, byTitle }
}

function lessonsOf(learningModule: Module, groups: LessonsByModule): Lesson[] {
  return groups.byId.get(learningModule.id) ?? groups.byTitle.get(learningModule.title) ?? []
}

function toModuleInput({ title, description, icon, color, sort_order }: Module): ModuleInput {
  return { title, description, icon, color, sort_order }
}

interface ModulesPageProps {
  lessons: Lesson[]
  onToast: OnToast
}

export function ModulesPage({ lessons, onToast }: ModulesPageProps) {
  const modules = useAsyncResource(() => fetchModules(), [], { errorMessage: "Erro ao carregar módulos" })
  const [editor, setEditor] = useState<ModuleEditor | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const lessonGroups = useMemo(() => groupLessonsByModule(lessons), [lessons])

  const handleSave = async () => {
    if (!editor) return
    if (!editor.form.title.trim()) {
      onToast("Título é obrigatório", "warning")
      return
    }
    setIsSaving(true)
    try {
      if (editor.moduleId) {
        await updateModule(editor.moduleId, editor.form)
        onToast("Módulo atualizado", "success")
      } else {
        const moduleCount = modules.status === "success" ? modules.data.length : 0
        await createModule({ ...editor.form, sort_order: moduleCount })
        onToast("Módulo criado", "success")
      }
      setEditor(null)
      await modules.reload()
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao salvar"), "danger")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (moduleId: string) => {
    if (!window.confirm("Excluir este módulo? As lições não serão apagadas, apenas desvinculadas.")) return
    setDeletingId(moduleId)
    try {
      await deleteModule(moduleId)
      onToast("Módulo excluído", "danger")
      await modules.reload()
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao excluir"), "danger")
    } finally {
      setDeletingId(null)
    }
  }

  if (modules.status === "loading") return <PanelSpinner />

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-level-purple-dark">Módulos &amp; trilhas</h2>
          <p className="text-sm text-muted-foreground">Agrupe lições em jornadas de aprendizado</p>
        </div>
        <button
          onClick={() => setEditor({ form: { ...EMPTY_MODULE } })}
          className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" /> Novo módulo
        </button>
      </div>

      {modules.status === "error" ? (
        <LoadErrorAlert message={modules.error} onRetry={() => void modules.reload()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {modules.data.map((learningModule, position) => (
            <ModuleCard
              key={learningModule.id}
              learningModule={learningModule}
              position={position}
              lessons={lessonsOf(learningModule, lessonGroups)}
              isDeleting={deletingId === learningModule.id}
              onEdit={() => setEditor({ moduleId: learningModule.id, form: toModuleInput(learningModule) })}
              onDelete={() => handleDelete(learningModule.id)}
            />
          ))}
          {modules.data.length === 0 && (
            <div className="col-span-full rounded-2xl border-2 border-dashed border-border py-12 text-center">
              <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum módulo. Crie o primeiro.</p>
            </div>
          )}
        </div>
      )}

      {editor && (
        <ModuleEditModal
          editor={editor}
          isSaving={isSaving}
          onChange={(form) => setEditor({ ...editor, form })}
          onClose={() => setEditor(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

interface ModuleCardProps {
  learningModule: Module
  position: number
  lessons: Lesson[]
  isDeleting: boolean
  onEdit: () => void
  onDelete: () => void
}

function ModuleCard({ learningModule, position, lessons, isDeleting, onEdit, onDelete }: ModuleCardProps) {
  const publishedCount = lessons.filter((lesson) => lesson.published).length
  const totalXp = lessons.reduce((sum, lesson) => sum + lesson.xp_reward, 0)
  const hiddenCount = lessons.length - PREVIEW_LESSON_COUNT

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className={cn("relative h-20 bg-linear-to-br px-5 py-4 text-white", HEADER_GRADIENTS[position % HEADER_GRADIENTS.length])}>
        <div className="absolute inset-0 opacity-30" style={DOTTED_BACKGROUND} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Módulo {position + 1}</p>
            <p className="text-lg font-extrabold">{learningModule.title}</p>
          </div>
          <Layers className="h-7 w-7 opacity-60" />
        </div>
      </div>
      <div className="p-5">
        {learningModule.description && <p className="mb-3 text-xs text-muted-foreground">{learningModule.description}</p>}
        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span><b className="text-foreground">{lessons.length}</b> lições</span>
          <span className="text-success"><b>{publishedCount}</b> publicadas</span>
          <span><b className="text-foreground">{totalXp}</b> XP total</span>
        </div>
        <div className="space-y-1">
          {lessons.slice(0, PREVIEW_LESSON_COUNT).map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-2 rounded-lg p-2 text-xs hover:bg-muted">
              <span className="w-6 font-mono text-muted-foreground">{lesson.order.toString().padStart(2, "0")}</span>
              <span className="flex-1 truncate font-semibold text-foreground">{lesson.title}</span>
              <PubBadge published={lesson.published} />
            </div>
          ))}
          {hiddenCount > 0 && <p className="pl-8 text-[11px] text-muted-foreground">+{hiddenCount} mais</p>}
          {lessons.length === 0 && <p className="py-2 text-[11px] italic text-muted-foreground">Sem lições vinculadas</p>}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
          <button
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            <Edit3 className="h-3 w-3" /> Editar
          </button>
          <Link
            href={ROUTES.dashboardModule(learningModule.title)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-level-purple-subtle px-3 py-1.5 text-xs font-bold text-level-purple hover:bg-level-purple-light"
          >
            <Eye className="h-3 w-3" /> Pré-visualizar
          </Link>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center justify-center rounded-lg border border-destructive/30 px-2.5 py-1.5 text-destructive hover:bg-destructive/10"
            title="Excluir módulo"
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ModuleEditModalProps {
  editor: ModuleEditor
  isSaving: boolean
  onChange: (form: ModuleInput) => void
  onClose: () => void
  onSave: () => void
}

function ModuleEditModal({ editor: { form, moduleId }, isSaving, onChange, onClose, onSave }: ModuleEditModalProps) {
  return (
    <AdminModal
      title={moduleId ? "Editar módulo" : "Novo módulo"}
      bodyClassName="space-y-3 p-6"
      onClose={onClose}
      footer={
        <>
          <ModalCancelButton onClick={onClose} />
          <ModalSubmitButton onClick={onSave} isBusy={isSaving}>
            {moduleId ? "Salvar" : "Criar"}
          </ModalSubmitButton>
        </>
      }
    >
      <div>
        <label htmlFor="module-title" className={LABEL_CLASS}>Título</label>
        <input
          id="module-title"
          data-autofocus
          value={form.title}
          onChange={(event) => onChange({ ...form, title: event.target.value })}
          className={FIELD_CLASS}
        />
      </div>
      <div>
        <label htmlFor="module-description" className={LABEL_CLASS}>Descrição</label>
        <textarea
          id="module-description"
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
          rows={3}
          className={cn(FIELD_CLASS, "resize-none")}
        />
      </div>
    </AdminModal>
  )
}
