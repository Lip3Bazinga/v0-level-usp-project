"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { fetchCourseById, enrollInCourse, unenrollFromCourse } from "@/lib/supabase/courses"
import { fetchUserProgress, computeModuleStatuses } from "@/lib/supabase/lessons"
import type { Course, Lesson, LessonProgress } from "@/lib/supabase/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ArrowLeft, BookOpen, CheckCircle2, Play, Lock, Zap, Clock,
  Star, Trophy, ChevronRight, Loader2, Rocket, Code2, Database,
  Brain, User, Flame, FlaskConical, Award,
} from "lucide-react"
import { EnrollmentAnimation } from "@/components/gamification/enrollment-animation"
import { CourseCompleteModal } from "@/components/gamification/course-complete-modal"
import { swalConfirm, swalError, swalToast } from "@/lib/swal"

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const COURSE_GRADIENTS: Record<string, string> = {
  iniciante:     "from-violet-500 to-purple-700",
  intermediario: "from-amber-500 to-orange-600",
  avancado:      "from-rose-500 to-red-700",
}

const COURSE_ICONS: Record<string, typeof Code2> = {
  "Python Básico":        Code2,
  "Python Intermediário": Brain,
  "Ciência de Dados":     Database,
  "Estruturas de Dados":  BookOpen,
  "Algoritmos":           BookOpen,
  "POO":                  BookOpen,
}

const DIFF_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const courseId = params.id as string
  const { profile, isLoading: authLoading } = useAuth()

  const [course,    setCourse]    = useState<Course | null>(null)
  const [lessons,   setLessons]   = useState<Lesson[]>([])
  const [enrolled,  setEnrolled]  = useState(false)
  const [progress,  setProgress]  = useState<LessonProgress[]>([])
  const [loading,   setLoading]   = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Animation states
  const [showEnrollAnim,   setShowEnrollAnim]   = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const prevAllDone = useState(false)

  useEffect(() => {
    if (authLoading) return
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [result, prog] = await Promise.all([
          fetchCourseById(courseId, profile?.id),
          profile?.id ? fetchUserProgress(profile.id) : Promise.resolve([]),
        ])
        if (!result) { setError("Curso não encontrado."); return }
        setCourse(result.course)
        setLessons(result.lessons)
        setEnrolled(result.enrolled)
        setProgress(prog)
      } catch {
        setError("Não foi possível carregar o curso.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, courseId, profile?.id])

  const progressMap = new Map(progress.map((p) => [p.lesson_id, p]))
  const statuses    = computeModuleStatuses(lessons, progressMap)
  const completed   = statuses.filter((s) => s === "completed").length
  const allDone     = lessons.length > 0 && completed === lessons.length

  // Detect course completion transition
  useEffect(() => {
    if (allDone && enrolled && !prevAllDone[0] && !loading) {
      setShowCompleteModal(true)
    }
    prevAllDone[1](allDone)
  }, [allDone, enrolled, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnroll = useCallback(async () => {
    if (!profile) { router.push("/login"); return }
    setEnrolling(true)
    try {
      if (enrolled) {
        const confirmed = await swalConfirm({
          title: "Cancelar matrícula?",
          text: "Seu progresso será mantido, mas você perderá o acesso às lições bloqueadas.",
          confirmText: "Cancelar matrícula",
          cancelText: "Manter matrícula",
          danger: true,
        })
        if (!confirmed) return
        await unenrollFromCourse(profile.id, courseId)
        setEnrolled(false)
        swalToast({ title: "Matrícula cancelada.", icon: "info" })
      } else {
        await enrollInCourse(profile.id, courseId)
        setEnrolled(true)
        setShowEnrollAnim(true)
      }
    } catch {
      await swalError({ title: "Erro na matrícula", text: "Tente novamente em instantes." })
    } finally {
      setEnrolling(false)
    }
  }, [profile, courseId, enrolled, router])

  const handleStartLesson = useCallback(() => {
    const firstAvailable = lessons.find((_, i) => statuses[i] !== "completed")
    const target = firstAvailable ?? lessons[0]
    if (target) router.push(`/lesson/${target.id}`)
  }, [lessons, statuses, router])

  const handleDownloadCertificate = useCallback(() => {
    swalToast({ title: "Preparando certificado...", icon: "info" })
    // Certificate download logic handled via PDF generation endpoint
    window.open(`/api/certificate/${courseId}?name=${encodeURIComponent(profile?.full_name ?? "")}`, "_blank")
  }, [courseId, profile?.full_name])

  // ── Loading / erro ────────────────────────────────────────────────────────

  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <BookOpen className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-level-purple-dark">{error ?? "Curso não encontrado"}</h2>
        <button onClick={() => router.push("/cursos")} className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors">
          Ver todos os cursos
        </button>
      </div>
    )
  }

  const Icon        = COURSE_ICONS[course.title] ?? BookOpen
  const gradient    = COURSE_GRADIENTS[course.level] ?? "from-violet-500 to-purple-700"
  const progressPct = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0
  const hasFinalProject = !!(course.final_project_title?.trim())

  return (
    <>
      {/* Animations */}
      <EnrollmentAnimation
        show={showEnrollAnim}
        courseTitle={course.title}
        courseXp={course.total_xp}
        onClose={() => setShowEnrollAnim(false)}
      />
      <CourseCompleteModal
        show={showCompleteModal}
        courseTitle={course.title}
        courseXp={course.total_xp}
        hasCertificate
        onClose={() => setShowCompleteModal(false)}
        onDownloadCertificate={handleDownloadCertificate}
      />

      <div className="min-h-screen bg-background pb-24 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-level-purple-dark">LevelUSP</span>
            </Link>
            <Link href="/cursos" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <ArrowLeft className="h-4 w-4" /> Todos os cursos
            </Link>
          </div>
        </header>

        {/* Hero banner */}
        <div className={`relative bg-linear-to-br ${gradient} text-white`}>
          {course.cover_image_url && (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-40"
            />
          )}
          <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 md:py-16">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
              {/* Ícone */}
              <div className="hidden md:flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
                <Icon className="h-14 w-14 text-white" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_COLOR[course.level]} bg-white/90`}>
                    {LEVEL_LABEL[course.level]}
                  </span>
                  {course.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">{tag}</span>
                  ))}
                </div>
                <h1 className="text-3xl font-bold md:text-4xl">{course.title}</h1>
                <p className="mt-2 text-lg text-white/80">{course.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-white/80">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {lessons.length} lições{hasFinalProject ? " + projeto final" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-yellow-300" />
                    {course.total_xp} XP no total
                  </span>
                  {course.estimated_hours > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {course.estimated_hours}h estimadas
                    </span>
                  )}
                  {enrolled && (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-300" />
                      {completed}/{lessons.length} concluídas
                    </span>
                  )}
                </div>
              </div>

              {/* CTA card */}
              <div className="w-full shrink-0 rounded-2xl bg-white p-5 text-gray-900 shadow-xl md:w-64">
                {enrolled && lessons.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>Progresso</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-level-purple transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {enrolled ? (
                  <button
                    onClick={handleStartLesson}
                    disabled={lessons.length === 0}
                    className="mb-2 w-full rounded-xl bg-level-purple py-3 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {progressPct === 100 ? "Revisar curso" : progressPct > 0 ? "Continuar" : "Começar"}
                  </button>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="mb-2 w-full rounded-xl bg-level-purple py-3 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                    {enrolling ? "Matriculando..." : "Matricular-se — Grátis"}
                  </button>
                )}

                {allDone && enrolled && (
                  <button
                    onClick={handleDownloadCertificate}
                    className="mb-2 w-full rounded-xl bg-linear-to-r from-yellow-400 to-amber-500 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/30"
                  >
                    <Award className="h-4 w-4" />
                    Baixar Certificado
                  </button>
                )}

                {enrolled && (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-red-300 hover:text-red-500"
                  >
                    {enrolling ? "Aguarde..." : "Cancelar matrícula"}
                  </button>
                )}

                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  {[
                    "100% gratuito",
                    "Acesso vitalício",
                    "Certificado ao concluir",
                    hasFinalProject ? "Projeto final integrador" : null,
                  ].filter(Boolean).map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <main className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3">

            {/* Coluna principal */}
            <div className="md:col-span-2 space-y-8">

              {/* Sobre o curso */}
              {course.long_description && (
                <section>
                  <h2 className="mb-3 text-xl font-bold text-level-purple-dark">Sobre este curso</h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{course.long_description}</ReactMarkdown>
                  </div>
                </section>
              )}

              {/* Lista de lições */}
              <section>
                <h2 className="mb-4 text-xl font-bold text-level-purple-dark">
                  Conteúdo do curso
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({lessons.length} lições)</span>
                </h2>

                {lessons.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Nenhuma lição publicada ainda.
                  </div>
                ) : (
                  <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
                    {lessons.map((lesson, i) => {
                      const status    = statuses[i]
                      const canAccess = enrolled && status !== "locked"

                      return (
                        <div
                          key={lesson.id}
                          className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${
                            canAccess ? "hover:bg-level-purple-subtle cursor-pointer" : "opacity-60"
                          }`}
                          onClick={() => canAccess && router.push(`/lesson/${lesson.id}`)}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            status === "completed"   ? "bg-green-100" :
                            status === "in-progress" ? "bg-level-purple-light" : "bg-muted"
                          }`}>
                            {status === "completed"   ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                             status === "in-progress" ? <Play className="h-4 w-4 text-level-purple" /> :
                             <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              status === "locked" ? "text-muted-foreground" : "text-level-purple-dark"
                            }`}>
                              {i + 1}. {lesson.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {DIFF_LABEL[lesson.difficulty]} · +{lesson.xp_reward} XP
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {status === "completed" && (
                              <div className="flex items-center gap-0.5">
                                {[0,1,2].map((s) => <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                              </div>
                            )}
                            {canAccess && status !== "completed" && <ChevronRight className="h-4 w-4 text-level-purple" />}
                            {!enrolled && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Projeto Final */}
              {hasFinalProject && (
                <section>
                  <h2 className="mb-4 text-xl font-bold text-level-purple-dark">Projeto Final</h2>
                  <div className={`overflow-hidden rounded-2xl border-2 transition-all ${
                    allDone && enrolled
                      ? "border-yellow-400 shadow-lg shadow-yellow-100"
                      : "border-border opacity-75"
                  }`}>
                    <div className={`flex items-center gap-3 px-5 py-4 ${
                      allDone && enrolled
                        ? "bg-linear-to-r from-yellow-400 to-amber-500 text-white"
                        : "bg-muted/50"
                    }`}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        allDone && enrolled ? "bg-white/20" : "bg-muted"
                      }`}>
                        {allDone && enrolled
                          ? <Star className="h-5 w-5 text-white" />
                          : <Lock className="h-5 w-5 text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${allDone && enrolled ? "text-white" : "text-level-purple-dark"}`}>
                          {course.final_project_title}
                        </p>
                        <p className={`text-xs ${allDone && enrolled ? "text-white/80" : "text-muted-foreground"}`}>
                          {allDone && enrolled
                            ? "Você desbloqueou o projeto final!"
                            : `Complete todas as ${lessons.length} lições para desbloquear`}
                        </p>
                      </div>
                      {allDone && enrolled && (
                        <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                          Desbloqueado
                        </span>
                      )}
                    </div>

                    <div className="bg-white px-5 py-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {course.final_project_description}
                      </p>

                      {allDone && enrolled && course.final_project_starter_code && (
                        <div className="mt-4">
                          <div className="mb-1.5 flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-level-purple" />
                            <span className="text-xs font-semibold text-level-purple-dark">Código inicial</span>
                          </div>
                          <pre className="overflow-x-auto rounded-xl bg-[#1e1e1e] p-4 text-xs text-gray-300 leading-relaxed">
                            <code>{course.final_project_starter_code}</code>
                          </pre>
                        </div>
                      )}

                      {allDone && enrolled && (
                        <button
                          onClick={() => {
                            const lastLesson = lessons[lessons.length - 1]
                            if (lastLesson) router.push(`/lesson/${lastLesson.id}`)
                          }}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-level-purple py-3 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark"
                        >
                          <Play className="h-4 w-4" />
                          Iniciar Projeto Final
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-white p-5">
                <h3 className="mb-3 text-sm font-bold text-level-purple-dark">O que você vai aprender</h3>
                <ul className="space-y-2">
                  {lessons.slice(0, 6).map((l) => (
                    <li key={l.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-level-purple" />
                      {l.title}
                    </li>
                  ))}
                  {hasFinalProject && (
                    <li className="flex items-start gap-2 text-xs font-medium text-amber-600">
                      <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                      {course.final_project_title}
                    </li>
                  )}
                  {lessons.length > 6 && (
                    <li className="text-xs font-medium text-level-purple">+ {lessons.length - 6} mais...</li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-white p-5">
                <h3 className="mb-3 text-sm font-bold text-level-purple-dark">Estatísticas</h3>
                <div className="space-y-3">
                  {[
                    { icon: BookOpen, label: "Lições", value: lessons.length.toString(), color: "" },
                    { icon: Zap, label: "XP Total", value: course.total_xp.toString(), color: "text-yellow-500" },
                    { icon: Clock, label: "Duração est.", value: course.estimated_hours > 0 ? `${course.estimated_hours}h` : "—", color: "" },
                    { icon: Trophy, label: "Nível", value: LEVEL_LABEL[course.level], color: "", badge: LEVEL_COLOR[course.level] },
                    hasFinalProject ? { icon: Star, label: "Projeto Final", value: "Incluído", color: "text-yellow-500" } : null,
                  ].filter(Boolean).map((item: any) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <item.icon className={`h-4 w-4 ${item.color}`} /> {item.label}
                      </span>
                      {item.badge ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.badge}`}>{item.value}</span>
                      ) : (
                        <span className={`font-semibold text-level-purple-dark ${item.color}`}>{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!enrolled && (
                <div className="md:hidden">
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full rounded-xl bg-level-purple py-3.5 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                    {enrolling ? "Matriculando..." : "Matricular-se — Grátis"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
