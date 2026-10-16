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
import {
  fetchTeacherCourses,
  toggleCoursePublished,
  deleteCourse,
} from "@/lib/supabase/courses"
import type { Lesson, Course } from "@/lib/supabase/types"
import {
  Rocket, Plus, BookOpen, Users, BarChart3, Search,
  Eye, Edit3, Trash2, CheckCircle2, FileText, ChevronLeft,
  TrendingUp, Loader2, Globe, EyeOff, AlertTriangle,
  GraduationCap, Star,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { swalConfirm, swalError, swalToast } from "@/lib/swal"

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "iniciante":    return "bg-success/10 text-success"
    case "intermediario": return "bg-warning/10 text-warning"
    case "avancado":    return "bg-destructive/10 text-destructive"
    default:            return "bg-muted text-muted-foreground"
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TeacherPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading } = useAuth()

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [completions, setCompletions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null)
  const [togglingCourseId, setTogglingCourseId] = useState<string | null>(null)

  const profileId = profile?.id
  useEffect(() => {
    if (authLoading || !profileId) return
    async function load() {
      setLoading(true)
      const [fetched, fetchedCourses] = await Promise.all([
        fetchTeacherLessons(profileId!),
        fetchTeacherCourses(profileId!),
      ])
      setLessons(fetched)
      setCourses(fetchedCourses)
      const { completions: c } = await fetchTeacherMetrics(fetched.map((l) => l.id))
      setCompletions(c)
      setLoading(false)
    }
    load()
  }, [authLoading, profileId])

  const handleToggleCoursePublished = async (course: Course) => {
    // Curso publicado sem lição aparece na vitrine e aceita matrícula, mas não
    // tem o que entregar ao aluno. Despublicar segue sempre permitido.
    if (!course.published && (course.lesson_count ?? 0) === 0) {
      await swalError({
        text: "Este curso ainda não tem lições. Adicione ao menos uma lição antes de publicar.",
      })
      return
    }

    const action = course.published ? "despublicar" : "publicar"
    const confirmed = await swalConfirm({
      title: `Deseja ${action} este curso?`,
      text: course.published
        ? "O curso ficará invisível para os alunos."
        : "O curso ficará visível para todos os alunos matriculados.",
      confirmText: course.published ? "Despublicar" : "Publicar",
      icon: "question",
    })
    if (!confirmed) return

    setTogglingCourseId(course.id)
    try {
      await toggleCoursePublished(course.id, !course.published)
      setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, published: !course.published } : c))
      swalToast({ title: course.published ? "Curso despublicado." : "Curso publicado!", icon: "success" })
    } catch {
      await swalError({ text: "Erro ao alterar status do curso." })
    } finally {
      setTogglingCourseId(null)
    }
  }

  const handleDeleteCourse = async (course: Course) => {
    const confirmed = await swalConfirm({
      title: "Excluir curso?",
      text: `O curso "${course.title}" será excluído permanentemente. Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      danger: true,
    })
    if (!confirmed) return

    setDeletingCourseId(course.id)
    try {
      await deleteCourse(course.id)
      setCourses((prev) => prev.filter((c) => c.id !== course.id))
      swalToast({ title: "Curso excluído.", icon: "success" })
    } catch {
      await swalError({ text: "Erro ao excluir curso." })
    } finally {
      setDeletingCourseId(null)
    }
  }

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      filter === "all" ||
      (filter === "published" && lesson.published) ||
      (filter === "draft" && !lesson.published)
    return matchesSearch && matchesFilter
  })

  const handleDelete = async (lesson: Lesson) => {
    const confirmed = await swalConfirm({
      title: "Excluir lição?",
      text: `A lição "${lesson.title}" será excluída permanentemente. O progresso dos alunos também será removido.`,
      confirmText: "Excluir",
      danger: true,
    })
    if (!confirmed) return

    setDeletingId(lesson.id)
    try {
      await deleteLesson(lesson.id)
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id))
      swalToast({ title: "Lição excluída.", icon: "success" })
    } catch {
      await swalError({ text: "Erro ao excluir lição." })
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePublished = async (lesson: Lesson) => {
    const action = lesson.published ? "despublicar" : "publicar"
    const confirmed = await swalConfirm({
      title: `Deseja ${action} esta lição?`,
      text: lesson.published
        ? "A lição ficará invisível para os alunos."
        : "A lição ficará disponível para todos os alunos.",
      confirmText: lesson.published ? "Despublicar" : "Publicar",
      icon: "question",
    })
    if (!confirmed) return

    setTogglingId(lesson.id)
    try {
      await toggleLessonPublished(lesson.id, !lesson.published)
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, published: !lesson.published } : l))
      )
      swalToast({ title: lesson.published ? "Lição despublicada." : "Lição publicada!", icon: "success" })
    } catch {
      await swalError({ text: "Erro ao alterar status da lição." })
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
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-level-purple transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden text-sm sm:inline">Dashboard</span>
            </Link>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-level-purple">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-level-purple-dark">Painel do Professor</h1>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.full_name ?? "Carregando..."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/teacher/curso/new">
              <LevelButton variant="secondary" size="md">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo Curso</span>
                </span>
              </LevelButton>
            </Link>
            <Link href="/teacher/edit/new">
              <LevelButton variant="primary" size="md">
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova Lição</span>
                </span>
              </LevelButton>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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

        {/* Courses Section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-level-purple" />
              <h2 className="text-base font-semibold text-level-purple-dark">Meus Cursos</h2>
              <span className="text-xs text-muted-foreground">({courses.length})</span>
            </div>
            <Link href="/teacher/curso/new" className="flex items-center gap-1.5 rounded-lg bg-level-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-level-purple-dark transition-colors">
              <Plus className="h-3.5 w-3.5" /> Novo Curso
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-10 text-center">
              <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-level-purple-dark">Nenhum curso criado</p>
              <p className="mt-1 text-xs text-muted-foreground">Crie um curso para organizar suas lições</p>
              <Link href="/teacher/curso/new" className="mt-4 rounded-xl bg-level-purple px-5 py-2 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors">
                Criar primeiro curso
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <div key={course.id} className="group relative overflow-hidden rounded-2xl border border-border bg-white p-5 transition-shadow hover:shadow-md">
                  {course.cover_image_url ? (
                    <div className="mb-3 h-20 overflow-hidden rounded-xl">
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

                  {/* Ações */}
                  <div className="mt-3 flex items-center gap-1">
                    <button
                      onClick={() => handleToggleCoursePublished(course)}
                      disabled={togglingCourseId === course.id}
                      title={course.published ? "Despublicar" : "Publicar"}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        course.published ? "text-green-600 hover:bg-green-50" : "text-muted-foreground hover:bg-level-purple-light hover:text-level-purple"
                      }`}
                    >
                      {togglingCourseId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : course.published ? <Globe className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    {course.published && (
                      <Link href={`/cursos/${course.id}`} target="_blank">
                        <button title="Ver página" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                    )}
                    <Link href={`/teacher/curso/${course.id}`}>
                      <button title="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDeleteCourse(course)}
                      disabled={deletingCourseId === course.id}
                      title="Excluir"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      {deletingCourseId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

                    <Link href={`/teacher/edit/${lesson.id}`}>
                      <button
                        title="Editar"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </Link>

                    <button
                      onClick={() => handleDelete(lesson)}
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
