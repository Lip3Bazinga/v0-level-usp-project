"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, Edit3, Eye, EyeOff, FileText, Globe, Loader2, Search, Trash2 } from "lucide-react"
import type { Difficulty, Lesson, LessonMetrics } from "@levelusp/contracts"
import { Badge } from "@/components/ui/badge"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { LessonMetricsRow } from "../lesson-metrics"

type PublicationFilter = "all" | "published" | "draft"

const PUBLICATION_FILTERS: { id: PublicationFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "published", label: "Publicadas" },
  { id: "draft", label: "Rascunhos" },
]

const DIFFICULTY_CLASSES: Record<Difficulty, string> = {
  iniciante: "bg-success/10 text-success",
  intermediario: "bg-warning/10 text-warning",
  avancado: "bg-destructive/10 text-destructive",
}

const ICON_ACTION_CLASS =
  "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"

function matchesFilters(lesson: Lesson, search: string, publication: PublicationFilter): boolean {
  const matchesPublication = publication === "all" || (publication === "published") === lesson.published
  return matchesPublication && lesson.title.toLowerCase().includes(search.toLowerCase())
}

interface TeacherLessonsSectionProps {
  lessons: Lesson[]
  isLoading: boolean
  metricsByLesson: Map<string, LessonMetrics>
  togglingLessonId: string | null
  deletingLessonId: string | null
  onTogglePublished: (lesson: Lesson) => void
  onDelete: (lesson: Lesson) => void
}

export function TeacherLessonsSection({
  lessons, isLoading, metricsByLesson, togglingLessonId, deletingLessonId, onTogglePublished, onDelete,
}: TeacherLessonsSectionProps) {
  const [search, setSearch] = useState("")
  const [publication, setPublication] = useState<PublicationFilter>("all")
  const filtered = lessons.filter((lesson) => matchesFilters(lesson, search, publication))

  return (
    <div className="rounded-2xl border border-border bg-white">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            aria-label="Buscar lições"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar lições..."
            className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          {PUBLICATION_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setPublication(filter.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                publication === filter.id ? "bg-level-purple text-white" : "bg-muted text-muted-foreground hover:bg-level-purple-subtle",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((lesson) => (
            <TeacherLessonRow
              key={lesson.id}
              lesson={lesson}
              metrics={metricsByLesson.get(lesson.id)}
              isToggling={togglingLessonId === lesson.id}
              isDeleting={deletingLessonId === lesson.id}
              onTogglePublished={() => onTogglePublished(lesson)}
              onDelete={() => onDelete(lesson)}
            />
          ))}

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm font-medium text-level-purple-dark">
                {lessons.length === 0 ? "Nenhuma lição criada ainda" : "Nenhuma lição encontrada"}
              </p>
              {lessons.length === 0 && (
                <Link
                  href={ROUTES.teacherNewLesson}
                  className="mt-4 inline-block rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors"
                >
                  Criar primeira lição
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TeacherLessonRowProps {
  lesson: Lesson
  metrics: LessonMetrics | undefined
  isToggling: boolean
  isDeleting: boolean
  onTogglePublished: () => void
  onDelete: () => void
}

function TeacherLessonRow({ lesson, metrics, isToggling, isDeleting, onTogglePublished, onDelete }: TeacherLessonRowProps) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-light">
        <BookOpen className="h-5 w-5 text-level-purple" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-level-purple-dark truncate">{lesson.title}</p>
          {lesson.published ? (
            <Badge className="bg-success/10 text-success border-0 text-xs">Publicada</Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground border-0 text-xs">Rascunho</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {lesson.module && <span className="text-xs text-muted-foreground">{lesson.module}</span>}
          <Badge className={cn(DIFFICULTY_CLASSES[lesson.difficulty], "border-0 text-xs")}>{lesson.difficulty}</Badge>
          <span className="text-xs text-muted-foreground">+{lesson.xp_reward} XP</span>
        </div>
        <div className="mt-1.5">
          <LessonMetricsRow metrics={metrics} />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onTogglePublished}
          disabled={isToggling}
          title={lesson.published ? "Despublicar" : "Publicar"}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            lesson.published ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-level-purple-light hover:text-level-purple",
          )}
        >
          {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : lesson.published ? <Globe className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        {lesson.published && (
          <Link href={ROUTES.lesson(lesson.id)} target="_blank" title="Visualizar lição" className={ICON_ACTION_CLASS}>
            <Eye className="h-4 w-4" />
          </Link>
        )}

        <Link href={ROUTES.teacherLesson(lesson.id)} title="Editar" className={ICON_ACTION_CLASS}>
          <Edit3 className="h-4 w-4" />
        </Link>

        <button
          onClick={onDelete}
          disabled={isDeleting}
          title="Excluir"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
