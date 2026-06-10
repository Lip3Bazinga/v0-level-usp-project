"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Eye, Edit3, Trash2, Globe, EyeOff, Star, BookOpen, Zap, Clock, Loader2, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleCoursePublished, deleteCourse } from "@/lib/supabase/courses"
import type { Course } from "@/lib/supabase/types"

const LEVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
}

const LEVEL_COLOR: Record<string, string> = {
  iniciante:     "bg-green-100 text-green-700",
  intermediario: "bg-yellow-100 text-yellow-700",
  avancado:      "bg-red-100 text-red-700",
}

interface CoursesAdminPageProps {
  onToast: (msg: string, kind?: string) => void
}

export function CoursesAdminPage({ onToast }: CoursesAdminPageProps) {
  const [courses, setCourses]     = useState<Course[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const sb = createClient()
        const { data } = await sb
          .from("courses" as never)
          .select("*, lessons(count)")
          .order("created_at", { ascending: false })
        setCourses(
          (data ?? []).map((r: any) => ({ ...r, lesson_count: r.lessons?.[0]?.count ?? 0 })) as Course[]
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggle = async (course: Course) => {
    setTogglingId(course.id)
    try {
      await toggleCoursePublished(course.id, !course.published)
      setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, published: !course.published } : c))
      onToast(course.published ? "Curso despublicado" : "Curso publicado", "success")
    } catch {
      onToast("Erro ao alterar status", "danger")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (course: Course) => {
    if (!confirm(`Excluir "${course.title}" permanentemente?`)) return
    setDeletingId(course.id)
    try {
      await deleteCourse(course.id)
      setCourses((prev) => prev.filter((c) => c.id !== course.id))
      onToast("Curso excluído", "success")
    } catch {
      onToast("Erro ao excluir", "danger")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cursos..."
            className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2.5 text-sm focus:border-level-purple focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{courses.filter((c) => c.published).length} publicados</span>
          <span>·</span>
          <span>{courses.filter((c) => !c.published).length} rascunhos</span>
          <span>·</span>
          <span>{courses.length} total</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-level-purple-dark">Nenhum curso encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((course) => (
              <div key={course.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                <div className="shrink-0">
                  {course.cover_image_url ? (
                    <img src={course.cover_image_url} alt={course.title} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-subtle">
                      <GraduationCap className="h-6 w-6 text-level-purple/60" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-level-purple-dark truncate">{course.title}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", LEVEL_COLOR[course.level])}>
                      {LEVEL_LABEL[course.level]}
                    </span>
                    {course.published ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Publicado</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Rascunho</span>
                    )}
                    {course.final_project_title && (
                      <span className="flex items-center gap-0.5 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                        <Star className="h-2.5 w-2.5" /> Projeto final
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-md">{course.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.lesson_count ?? 0} lições</span>
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" />{course.total_xp} XP</span>
                    {course.estimated_hours > 0 && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.estimated_hours}h</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleToggle(course)}
                    disabled={togglingId === course.id}
                    title={course.published ? "Despublicar" : "Publicar"}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50",
                      course.published
                        ? "text-green-600 hover:bg-green-50"
                        : "text-muted-foreground hover:bg-level-purple-light hover:text-level-purple"
                    )}
                  >
                    {togglingId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                     course.published ? <Globe className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
                    onClick={() => handleDelete(course)}
                    disabled={deletingId === course.id}
                    title="Excluir"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {deletingId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
