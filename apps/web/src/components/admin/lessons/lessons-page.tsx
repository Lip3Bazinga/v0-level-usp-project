"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  BookOpen, Clock, Columns, Copy, Edit3, EyeOff, FileText, Globe, Grid3X3, List, Loader2, Plus, Search, Trash2, Zap,
} from "lucide-react"
import { DIFFICULTIES, type Difficulty, type Lesson } from "@levelusp/contracts"
import { DiffBadge, PubBadge } from "@/components/ui/badges"
import { IconBtn } from "@/components/ui/icon-btn"
import { createLesson, deleteLesson, fetchLessonForAuthoring, getErrorMessage, setLessonPublished } from "@/lib/api"
import { DIFFICULTY_LABELS, ROUTES } from "@/lib/constants"
import type { OnToast } from "@/lib/types"
import { cn } from "@/lib/utils"
import { AdminModal, ModalCancelButton } from "../admin-modal"
import type { ListUpdate } from "../use-admin-dashboard"
import { duplicateLessonInput, filterLessons, type PublicationFilter } from "./lesson-list"

const VIEW_MODES = [
  { id: "list", icon: List, label: "Lista" },
  { id: "grid", icon: Grid3X3, label: "Grade" },
  { id: "kanban", icon: Columns, label: "Quadro" },
] as const

type ViewMode = (typeof VIEW_MODES)[number]["id"]

const PUBLICATION_FILTERS: { id: PublicationFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "published", label: "Publicadas" },
  { id: "draft", label: "Rascunhos" },
]

const KANBAN_COLUMNS = [
  { id: "draft", label: "Rascunho", toneClass: "text-muted-foreground bg-muted", matches: (lesson: Lesson) => !lesson.published },
  { id: "published", label: "Publicada", toneClass: "text-success bg-success/10", matches: (lesson: Lesson) => lesson.published },
  { id: "advanced", label: "Avançadas", toneClass: "text-destructive bg-destructive/10", matches: (lesson: Lesson) => lesson.difficulty === "avancado" },
]

const ALL_MODULES = "all"

/** Mesmo visual do `IconBtn` pequeno, para links (não aninhar `<button>` em `<a>`). */
const ICON_LINK_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors text-muted-foreground hover:bg-level-purple-light hover:text-level-purple"

const CHIP_BASE_CLASS = "rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
const CHIP_ACTIVE_CLASS = "bg-level-purple text-white shadow-sm"
const CHIP_IDLE_CLASS = "bg-muted text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple"

function formatOrder(lesson: Lesson): string {
  return lesson.order.toString().padStart(2, "0")
}

interface LessonsPageProps {
  lessons: Lesson[]
  updateLessons: ListUpdate<Lesson>
  onToast: OnToast
}

export function LessonsPage({ lessons, updateLessons, onToast }: LessonsPageProps) {
  const [search, setSearch] = useState("")
  const [publication, setPublication] = useState<PublicationFilter>("all")
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [moduleTitle, setModuleTitle] = useState(ALL_MODULES)
  const [view, setView] = useState<ViewMode>("list")
  const [pendingDelete, setPendingDelete] = useState<Lesson | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const moduleTitles = useMemo(() => Array.from(new Set(lessons.map((lesson) => lesson.module).filter(Boolean))), [lessons])
  const filtered = useMemo(
    () => filterLessons(lessons, { search, publication, difficulty, moduleTitle: moduleTitle === ALL_MODULES ? null : moduleTitle }),
    [lessons, search, publication, difficulty, moduleTitle],
  )
  const publishedCount = lessons.filter((lesson) => lesson.published).length

  const handleTogglePublished = async (lesson: Lesson) => {
    setTogglingId(lesson.id)
    try {
      const updated = await setLessonPublished(lesson.id, !lesson.published)
      updateLessons((current) => current.map((item) => (item.id === lesson.id ? { ...item, published: updated.published } : item)))
      onToast(lesson.published ? "Lição despublicada" : "Lição publicada", "success")
    } catch (error) {
      // Ex.: lição de código sem casos de teste não pode ser publicada.
      onToast(getErrorMessage(error, "Erro ao alterar status da lição"), "error")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (lesson: Lesson) => {
    setDeletingId(lesson.id)
    setPendingDelete(null)
    try {
      await deleteLesson(lesson.id)
      updateLessons((current) => current.filter((item) => item.id !== lesson.id))
      onToast("Lição excluída", "success")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao excluir lição"), "error")
    } finally {
      setDeletingId(null)
    }
  }

  /** Duplica de verdade (com gabarito e sem curso), sempre como rascunho. */
  const handleDuplicate = async (lesson: Lesson) => {
    setDuplicatingId(lesson.id)
    try {
      const source = await fetchLessonForAuthoring(lesson.id)
      if (!source) throw new Error("Lição não encontrada.")
      const created = await createLesson(duplicateLessonInput(source))
      updateLessons((current) => [...current, created])
      onToast(
        source.lesson_type === "quiz"
          ? "Lição duplicada como rascunho (as questões do questionário não são copiadas)"
          : "Lição duplicada como rascunho",
        "success",
      )
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao duplicar lição"), "error")
    } finally {
      setDuplicatingId(null)
    }
  }

  const rowActions = (lesson: Lesson, { withDuplicate, withPublishedTone }: { withDuplicate: boolean; withPublishedTone: boolean }) => (
    <LessonActions
      lesson={lesson}
      isToggling={togglingId === lesson.id}
      isDeleting={deletingId === lesson.id}
      isDuplicating={duplicatingId === lesson.id}
      withDuplicate={withDuplicate}
      withPublishedTone={withPublishedTone}
      onTogglePublished={() => handleTogglePublished(lesson)}
      onDuplicate={() => handleDuplicate(lesson)}
      onDelete={() => setPendingDelete(lesson)}
    />
  )

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-level-purple-dark">Lições</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {lessons.length} · {publishedCount} publicadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-white p-0.5">
            {VIEW_MODES.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                aria-label={`Visualizar em ${label.toLowerCase()}`}
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  view === id ? "bg-level-purple text-white" : "text-muted-foreground hover:text-level-purple",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <Link href={ROUTES.teacherNewLesson} className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> Nova Lição
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Buscar lição"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar lição..."
            className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-level-purple focus:outline-none"
          />
        </div>
        <select
          aria-label="Filtrar por módulo"
          value={moduleTitle}
          onChange={(event) => setModuleTitle(event.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold focus:border-level-purple focus:outline-none"
        >
          <option value={ALL_MODULES}>Todos módulos</option>
          {moduleTitles.map((title) => (
            <option key={title} value={title}>{title}</option>
          ))}
        </select>
        {PUBLICATION_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setPublication(filter.id)}
            className={cn(CHIP_BASE_CLASS, publication === filter.id ? CHIP_ACTIVE_CLASS : CHIP_IDLE_CLASS)}
          >
            {filter.label}
          </button>
        ))}
        <div className="h-5 w-px bg-border" />
        {DIFFICULTIES.map((level) => (
          <button
            key={level}
            onClick={() => setDifficulty(difficulty === level ? null : level)}
            className={cn(CHIP_BASE_CLASS, difficulty === level ? CHIP_ACTIVE_CLASS : CHIP_IDLE_CLASS)}
          >
            {DIFFICULTY_LABELS[level]}
          </button>
        ))}
      </div>

      {view === "list" && (
        <LessonTable lessons={filtered} renderActions={(lesson) => rowActions(lesson, { withDuplicate: true, withPublishedTone: true })} />
      )}

      {view === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lesson) => (
            <LessonGridCard key={lesson.id} lesson={lesson} actions={rowActions(lesson, { withDuplicate: false, withPublishedTone: false })} />
          ))}
        </div>
      )}

      {view === "kanban" && <LessonKanban lessons={filtered} />}

      {pendingDelete && (
        <AdminModal
          title="Excluir lição?"
          icon={<Trash2 className="h-5 w-5" />}
          iconTone="danger"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <ModalCancelButton onClick={() => setPendingDelete(null)} />
              <button onClick={() => handleDelete(pendingDelete)} className="rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white">
                Excluir permanentemente
              </button>
            </>
          }
        >
          <p className="text-sm text-foreground">
            A lição <b>&ldquo;{pendingDelete.title}&rdquo;</b> será excluída permanentemente.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
        </AdminModal>
      )}
    </div>
  )
}

interface LessonActionsProps {
  lesson: Lesson
  isToggling: boolean
  isDeleting: boolean
  isDuplicating: boolean
  withDuplicate: boolean
  /** Na lista, o ícone de publicada fica verde. */
  withPublishedTone: boolean
  onTogglePublished: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function LessonActions({
  lesson, isToggling, isDeleting, isDuplicating, withDuplicate, withPublishedTone, onTogglePublished, onDuplicate, onDelete,
}: LessonActionsProps) {
  return (
    <>
      <IconBtn
        title={lesson.published ? "Despublicar" : "Publicar"}
        size="sm"
        tone={withPublishedTone && lesson.published ? "success" : "neutral"}
        onClick={onTogglePublished}
      >
        {isToggling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : lesson.published ? (
          <Globe className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </IconBtn>
      <Link href={ROUTES.teacherLesson(lesson.id)} title="Editar" className={ICON_LINK_CLASS}>
        <Edit3 className="h-3.5 w-3.5" />
      </Link>
      {withDuplicate && (
        <IconBtn title="Duplicar" size="sm" onClick={onDuplicate}>
          {isDuplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
        </IconBtn>
      )}
      <IconBtn title="Excluir" size="sm" tone="danger" onClick={onDelete}>
        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </IconBtn>
    </>
  )
}

interface LessonTableProps {
  lessons: Lesson[]
  renderActions: (lesson: Lesson) => ReactNode
}

function LessonTable({ lessons, renderActions }: LessonTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <table className="w-full text-left">
        <thead className="bg-muted/30">
          <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <th className="w-10 px-4 py-2.5">#</th>
            <th className="px-2 py-2.5">Lição</th>
            <th className="hidden px-2 py-2.5 md:table-cell">Módulo</th>
            <th className="hidden px-2 py-2.5 lg:table-cell">Dificuldade</th>
            <th className="hidden px-2 py-2.5 text-right lg:table-cell">XP</th>
            <th className="px-2 py-2.5">Status</th>
            <th className="w-36 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lessons.map((lesson) => (
            <tr key={lesson.id} className="group hover:bg-level-purple-subtle/30">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatOrder(lesson)}</td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-light text-level-purple">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-level-purple-dark">{lesson.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {lesson.libraries?.length ? lesson.libraries.join(", ") : "Sem bibliotecas"} · ⏱ {lesson.time_limit}min
                    </p>
                  </div>
                </div>
              </td>
              <td className="hidden px-2 py-3 text-xs text-muted-foreground md:table-cell">{lesson.module}</td>
              <td className="hidden px-2 py-3 lg:table-cell"><DiffBadge d={lesson.difficulty} /></td>
              <td className="hidden px-2 py-3 text-right lg:table-cell">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-level-purple">
                  <Zap className="h-2.5 w-2.5" />+{lesson.xp_reward}
                </span>
              </td>
              <td className="px-2 py-3"><PubBadge published={lesson.published} /></td>
              <td className="px-2 py-3">
                <div className="flex items-center justify-end gap-0.5">{renderActions(lesson)}</div>
              </td>
            </tr>
          ))}
          {lessons.length === 0 && (
            <tr>
              <td colSpan={7} className="py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-semibold text-muted-foreground">Nenhuma lição encontrada</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

interface LessonGridCardProps {
  lesson: Lesson
  actions: ReactNode
}

function LessonGridCard({ lesson, actions }: LessonGridCardProps) {
  return (
    <div className="cursor-pointer rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-level-purple-medium hover:shadow-lg">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-level-purple-light text-level-purple">
          <BookOpen className="h-5 w-5" />
        </div>
        <PubBadge published={lesson.published} />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {lesson.module} · Lição {formatOrder(lesson)}
      </p>
      <h3 className="mt-1 text-base font-extrabold leading-snug text-level-purple-dark">{lesson.title}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DiffBadge d={lesson.difficulty} />
        <span className="inline-flex items-center gap-1 rounded-full bg-level-purple-subtle px-2 py-0.5 text-[11px] font-bold text-level-purple">
          <Zap className="h-2.5 w-2.5" />
          {lesson.xp_reward} XP
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {lesson.time_limit}min
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="text-[11px] text-muted-foreground" />
        <div className="flex items-center gap-0.5">{actions}</div>
      </div>
    </div>
  )
}

interface LessonKanbanProps {
  lessons: Lesson[]
}

function LessonKanban({ lessons }: LessonKanbanProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {KANBAN_COLUMNS.map((column) => {
        const items = lessons.filter(column.matches)
        return (
          <div key={column.id} className="rounded-2xl border border-border bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase", column.toneClass)}>{column.label}</span>
                <span className="text-xs font-bold text-muted-foreground">{items.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((lesson) => (
                <div key={lesson.id} className="cursor-pointer rounded-xl border border-border bg-white p-3 hover:border-level-purple-medium hover:shadow-sm">
                  <p className="text-xs font-bold text-muted-foreground">{lesson.module}</p>
                  <p className="mt-1 text-sm font-extrabold leading-snug text-level-purple-dark">{lesson.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DiffBadge d={lesson.difficulty} />
                    <span className="text-[10px] font-bold text-level-purple">+{lesson.xp_reward} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
