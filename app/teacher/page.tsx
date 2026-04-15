"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LevelButton } from "@/components/design-system/level-button"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchTeacherLessons,
  fetchTeacherMetrics,
  deleteLesson,
  toggleLessonPublished,
} from "@/lib/supabase/lessons"
import type { Lesson } from "@/lib/supabase/types"
import {
  Rocket, Plus, BookOpen, Users, BarChart3, Search,
  Eye, Edit3, Trash2, CheckCircle2, FileText, ChevronLeft,
  TrendingUp, Loader2, Globe, EyeOff, AlertTriangle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "iniciante":    return "bg-success/10 text-success"
    case "intermediario": return "bg-warning/10 text-warning"
    case "avancado":    return "bg-destructive/10 text-destructive"
    default:            return "bg-muted text-muted-foreground"
  }
}

// ── Dialog de confirmação de exclusão ────────────────────────────────────────

function DeleteDialog({
  lesson,
  onConfirm,
  onCancel,
}: {
  lesson: Lesson
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-level-purple-dark">Excluir lição?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A lição <span className="font-semibold text-foreground">&quot;{lesson.title}&quot;</span> será excluída permanentemente.
          O progresso dos alunos nesta lição também será removido.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border-2 border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TeacherPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading } = useAuth()

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [completions, setCompletions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Lesson | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !profile) return
    async function load() {
      setLoading(true)
      const fetched = await fetchTeacherLessons(profile!.id)
      setLessons(fetched)
      const { completions: c } = await fetchTeacherMetrics(fetched.map((l) => l.id))
      setCompletions(c)
      setLoading(false)
    }
    load()
  }, [authLoading, profile])

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      filter === "all" ||
      (filter === "published" && lesson.published) ||
      (filter === "draft" && !lesson.published)
    return matchesSearch && matchesFilter
  })

  const handleDelete = async () => {
    if (!toDelete) return
    setDeletingId(toDelete.id)
    setToDelete(null)
    try {
      await deleteLesson(toDelete.id)
      setLessons((prev) => prev.filter((l) => l.id !== toDelete.id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePublished = async (lesson: Lesson) => {
    setTogglingId(lesson.id)
    try {
      await toggleLessonPublished(lesson.id, !lesson.published)
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, published: !lesson.published } : l))
      )
    } finally {
      setTogglingId(null)
    }
  }

  const metrics = {
    total: lessons.length,
    published: lessons.filter((l) => l.published).length,
    completions,
  }

  return (
    <div className="min-h-screen bg-background">
      {toDelete && (
        <DeleteDialog
          lesson={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-level-purple transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-level-purple-dark">Painel do Professor</h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.full_name ?? "Carregando..."}
                </p>
              </div>
            </div>
          </div>

          <Link href="/teacher/edit/new">
            <LevelButton variant="primary" size="md">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Lição
              </span>
            </LevelButton>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Metrics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                <FileText className="h-5 w-5 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{metrics.published}/{metrics.total}</p>
                <p className="text-xs text-muted-foreground">Lições Publicadas</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{metrics.completions}</p>
                <p className="text-xs text-muted-foreground">Conclusões de Alunos</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                <BarChart3 className="h-5 w-5 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">
                  {metrics.total > 0 ? Math.round((metrics.published / metrics.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Taxa de Publicação</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lessons List */}
        <div className="rounded-2xl border border-border bg-white">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar lições..."
                className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              {(["all", "published", "draft"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filter === f ? "bg-level-purple text-white" : "bg-muted text-muted-foreground hover:bg-level-purple-subtle"
                  }`}
                >
                  {f === "all" ? "Todas" : f === "published" ? "Publicadas" : "Rascunhos"}
                </button>
              ))}
            </div>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
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
                      <span className="text-xs text-muted-foreground">{lesson.module}</span>
                      <Badge className={`${getDifficultyColor(lesson.difficulty)} border-0 text-xs`}>
                        {lesson.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground">+{lesson.xp_reward} XP</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle publicado */}
                    <button
                      onClick={() => handleTogglePublished(lesson)}
                      disabled={togglingId === lesson.id}
                      title={lesson.published ? "Despublicar" : "Publicar"}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                        lesson.published
                          ? "text-success hover:bg-success/10"
                          : "text-muted-foreground hover:bg-level-purple-light hover:text-level-purple"
                      }`}
                    >
                      {togglingId === lesson.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : lesson.published ? (
                        <Globe className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>

                    {/* Visualizar */}
                    {lesson.published && (
                      <Link href={`/lesson/${lesson.id}`} target="_blank">
                        <button
                          title="Visualizar lição"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                    )}

                    {/* Editar */}
                    <Link href={`/teacher/edit/${lesson.id}`}>
                      <button
                        title="Editar"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </Link>

                    {/* Excluir */}
                    <button
                      onClick={() => setToDelete(lesson)}
                      disabled={deletingId === lesson.id}
                      title="Excluir"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      {deletingId === lesson.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {!loading && filteredLessons.length === 0 && (
                <div className="py-16 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm font-medium text-level-purple-dark">
                    {lessons.length === 0 ? "Nenhuma lição criada ainda" : "Nenhuma lição encontrada"}
                  </p>
                  {lessons.length === 0 && (
                    <Link href="/teacher/edit/new">
                      <button className="mt-4 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors">
                        Criar primeira lição
                      </button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
