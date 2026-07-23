"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchCourseByIdRaw,
  createCourse,
  updateCourse,
  uploadCourseCover,
  fetchCourseLessons,
  reorderLessons,
  removeLessonFromCourse,
  type CourseFormData,
} from "@/lib/supabase/courses"
import { fetchTeacherLessons } from "@/lib/supabase/lessons"
import type { Course, Lesson } from "@/lib/supabase/types"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowLeft, Save, Eye, BookOpen, Code2, Database, Brain,
  CheckCircle2, AlertCircle, Loader2, Upload, X, ImageIcon,
  Star, Zap, Clock, Lock, Play, FlaskConical,
  Globe, FileText, Plus, Trash2, GripVertical, Link2, Link2Off,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { TeacherSuccessModal } from "@/components/gamification/teacher-success-modal"
import { swalConfirm, swalError, swalToast } from "@/lib/swal"

// ── Constantes ────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: "iniciante",     label: "Iniciante",    color: "bg-green-100 text-green-700" },
  { value: "intermediario", label: "Intermediário", color: "bg-yellow-100 text-yellow-700" },
  { value: "avancado",      label: "Avançado",      color: "bg-red-100 text-red-700" },
] as const

const GRADIENTS: Record<string, string> = {
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

const LEVEL_COLOR: Record<string, string> = {
  iniciante:     "bg-green-100 text-green-700",
  intermediario: "bg-yellow-100 text-yellow-700",
  avancado:      "bg-red-100 text-red-700",
}

const LEVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children }: {
  icon: typeof BookOpen; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border-2 border-border bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-light">
          <Icon className="h-5 w-5 text-level-purple" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-level-purple-dark">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Item arrastável de lição ──────────────────────────────────────────────────

function SortableLesson({
  lesson,
  index,
  onRemove,
  removing,
}: {
  lesson: Lesson
  index: number
  onRemove: (id: string) => void
  removing: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border-2 bg-white px-3 py-2.5 transition-colors ${
        isDragging ? "border-level-purple shadow-lg" : "border-border hover:border-level-purple/40"
      }`}
    >
      {/* Handle de drag */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-level-purple active:cursor-grabbing"
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Número */}
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-level-purple-subtle text-[11px] font-bold text-level-purple">
        {index + 1}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-level-purple-dark">{lesson.title}</p>
        <p className="text-[10px] text-muted-foreground">
          {lesson.difficulty} · +{lesson.xp_reward} XP
          {!lesson.published && <span className="ml-1 text-amber-500">· Rascunho</span>}
        </p>
      </div>

      {/* Ações */}
      <div className="flex shrink-0 items-center gap-1">
        <Link href={`/teacher/edit/${lesson.id}`} target="_blank">
          <button title="Editar lição" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
            <Eye className="h-3.5 w-3.5" />
          </button>
        </Link>
        <button
          onClick={() => onRemove(lesson.id)}
          disabled={removing}
          title="Remover do curso"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
        >
          {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ── Preview ao vivo ───────────────────────────────────────────────────────────

function CoursePreview({ form, coverPreview, lessons }: {
  form: CourseFormData; coverPreview: string | null; lessons: Lesson[]
}) {
  const Icon = COURSE_ICONS[form.title] ?? BookOpen
  const gradient = GRADIENTS[form.level] ?? "from-violet-500 to-purple-700"
  const hasFinalProject = !!(form.final_project_title?.trim())

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-level-purple/30 bg-background shadow-xl">
      <div className="flex items-center justify-between border-b border-level-purple/20 bg-level-purple-subtle px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-level-purple" />
          <span className="text-xs font-semibold text-level-purple">Preview ao vivo</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Atualiza em tempo real</span>
      </div>

      {/* Hero */}
      <div className={`relative flex flex-col items-start justify-end bg-linear-to-br ${gradient} p-5 text-white`} style={{ minHeight: 160 }}>
        {coverPreview && (
          <img src={coverPreview} alt="Capa" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div className="relative z-10 w-full">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEVEL_COLOR[form.level]} bg-white/90`}>
              {LEVEL_LABEL[form.level]}
            </span>
            {form.tags.slice(0, 2).map((t) => (
              <span key={t} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">{t}</span>
            ))}
          </div>
          <h1 className="text-lg font-bold leading-tight">{form.title || "Título do Curso"}</h1>
          <p className="mt-0.5 text-xs text-white/80 line-clamp-2">{form.description || "Descrição curta..."}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-white/70">
            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{lessons.length} lições</span>
            {form.estimated_hours > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{form.estimated_hours}h</span>}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-b border-border bg-white px-4 py-3">
        <button className="w-full rounded-lg bg-level-purple py-2 text-xs font-bold text-white opacity-80">
          Matricular-se — Grátis
        </button>
      </div>

      {/* Sobre */}
      {form.long_description && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="mb-1.5 text-xs font-bold text-level-purple-dark">Sobre este curso</h3>
          <div className="prose prose-xs max-w-none text-[11px] text-muted-foreground line-clamp-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.long_description}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Lições */}
      {lessons.length > 0 && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="mb-2 text-xs font-bold text-level-purple-dark">
            Conteúdo <span className="font-normal text-muted-foreground">({lessons.length} lições{hasFinalProject ? " + projeto" : ""})</span>
          </h3>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {lessons.slice(0, 4).map((l, i) => (
              <div key={l.id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate text-[11px] text-muted-foreground">{l.title}</span>
                <Lock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              </div>
            ))}
            {lessons.length > 4 && (
              <div className="px-3 py-1.5 text-center text-[10px] text-muted-foreground">+ {lessons.length - 4} mais</div>
            )}
          </div>
        </div>
      )}

      {/* Projeto Final */}
      {hasFinalProject && (
        <div className="px-4 py-3">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-xs font-bold text-level-purple-dark">Projeto Final</span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{form.final_project_title}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TeacherCourseEditPage() {
  const params  = useParams()
  const router  = useRouter()
  const { profile } = useAuth()
  const isNew   = params.id === "new"
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title,           setTitle]          = useState("")
  const [description,     setDescription]    = useState("")
  const [longDescription, setLongDescription]= useState("")
  const [level,           setLevel]          = useState<CourseFormData["level"]>("iniciante")
  const [tags,            setTags]           = useState<string[]>([])
  const [tagInput,        setTagInput]       = useState("")
  const [estimatedHours,  setEstimatedHours] = useState(0)
  const [finalTitle,      setFinalTitle]     = useState("")
  const [finalDesc,       setFinalDesc]      = useState("")
  const [finalStarter,    setFinalStarter]   = useState("")
  const [finalTests,      setFinalTests]     = useState("")
  const [coverUrl,        setCoverUrl]       = useState<string | null>(null)
  const [coverPreview,    setCoverPreview]   = useState<string | null>(null)
  const [published,       setPublished]      = useState(false)

  // Lições do curso (arrastáveis)
  const [courseLessons,   setCourseLessons]  = useState<Lesson[]>([])
  // Lições avulsas do professor (para adicionar ao curso)
  const [freeLessons,     setFreeLessons]    = useState<Lesson[]>([])
  const [reordering,      setReordering]     = useState(false)
  const [removingId,      setRemovingId]     = useState<string | null>(null)
  const [addingId,        setAddingId]       = useState<string | null>(null)
  const [showAddPanel,    setShowAddPanel]   = useState(false)

  // UI state
  const [loading,        setLoading]       = useState(!isNew)
  const [saving,         setSaving]        = useState(false)
  const [uploading,      setUploading]     = useState(false)
  const [saved,          setSaved]         = useState(false)
  const [error,          setError]         = useState<string | null>(null)
  const [courseId,       setCourseId]      = useState<string | null>(isNew ? null : params.id as string)
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)
  const [successTitle,   setSuccessTitle]  = useState("")

  // Sensors para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Carrega curso ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNew) return
    async function load() {
      setLoading(true)
      const course = await fetchCourseByIdRaw(params.id as string)
      if (!course) { setError("Curso não encontrado."); setLoading(false); return }
      setTitle(course.title)
      setDescription(course.description)
      setLongDescription(course.long_description)
      setLevel(course.level)
      setTags(course.tags ?? [])
      setEstimatedHours(course.estimated_hours ?? 0)
      setFinalTitle(course.final_project_title ?? "")
      setFinalDesc(course.final_project_description ?? "")
      setFinalStarter(course.final_project_starter_code ?? "")
      setFinalTests(course.final_project_tests ?? "")
      setCoverUrl(course.cover_image_url ?? null)
      setCoverPreview(course.cover_image_url ?? null)
      setPublished(course.published)
      setLoading(false)
    }
    load()
  }, [isNew, params.id])

  // ── Carrega lições do curso + lições avulsas ────────────────────────────────
  const loadLessons = useCallback(async (cid: string) => {
    if (!profile?.id) return
    const [inCourse, allMine] = await Promise.all([
      fetchCourseLessons(cid),
      fetchTeacherLessons(profile.id),
    ])
    setCourseLessons(inCourse)
    const inCourseIds = new Set(inCourse.map((l) => l.id))
    setFreeLessons(allMine.filter((l) => !inCourseIds.has(l.id) && l.course_id === null))
  }, [profile?.id])

  useEffect(() => {
    if (courseId) loadLessons(courseId)
  }, [courseId, loadLessons])

  // ── Drag end handler ────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !courseId) return

    const oldIndex = courseLessons.findIndex((l) => l.id === active.id)
    const newIndex = courseLessons.findIndex((l) => l.id === over.id)
    const reordered = arrayMove(courseLessons, oldIndex, newIndex)

    // Atualiza localmente de imediato (sem esperar a API)
    setCourseLessons(reordered)

    setReordering(true)
    try {
      await reorderLessons(courseId, reordered.map((l) => l.id))
    } catch {
      // Reverte se der erro
      setCourseLessons(courseLessons)
      setError("Erro ao salvar a nova ordem. Tente novamente.")
    } finally {
      setReordering(false)
    }
  }, [courseLessons, courseId])

  // ── Remover lição do curso ──────────────────────────────────────────────────
  const handleRemoveLesson = useCallback(async (lessonId: string) => {
    setRemovingId(lessonId)
    try {
      await removeLessonFromCourse(lessonId)
      const removed = courseLessons.find((l) => l.id === lessonId)
      setCourseLessons((prev) => prev.filter((l) => l.id !== lessonId))
      if (removed) setFreeLessons((prev) => [...prev, { ...removed, course_id: null }])
    } catch {
      setError("Erro ao remover lição.")
    } finally {
      setRemovingId(null)
    }
  }, [courseLessons])

  // ── Adicionar lição ao curso ────────────────────────────────────────────────
  const handleAddLesson = useCallback(async (lesson: Lesson) => {
    if (!courseId) return
    setAddingId(lesson.id)
    try {
      const nextOrder = courseLessons.length + 1
      // Importa addLessonToCourse inline para não carregar no topo
      const { addLessonToCourse } = await import("@/lib/supabase/courses")
      await addLessonToCourse(lesson.id, courseId, nextOrder)
      const updated = { ...lesson, course_id: courseId, order: nextOrder }
      setCourseLessons((prev) => [...prev, updated])
      setFreeLessons((prev) => prev.filter((l) => l.id !== lesson.id))
    } catch {
      setError("Erro ao adicionar lição.")
    } finally {
      setAddingId(null)
    }
  }, [courseId, courseLessons.length])

  // ── Save ────────────────────────────────────────────────────────────────────
  const buildForm = useCallback((pub: boolean): CourseFormData => ({
    title, description, long_description: longDescription, level, tags,
    estimated_hours: estimatedHours, published: pub,
    final_project_title: finalTitle, final_project_description: finalDesc,
    final_project_starter_code: finalStarter, final_project_tests: finalTests,
    cover_image_url: coverUrl,
  }), [title, description, longDescription, level, tags, estimatedHours,
      finalTitle, finalDesc, finalStarter, finalTests, coverUrl])

  const handleSave = useCallback(async (pub: boolean) => {
    if (!title.trim()) {
      await swalError({ title: "Campo obrigatório", text: "O título do curso é obrigatório." })
      return
    }
    if (!profile) return

    if (pub && !isNew) {
      const confirmed = await swalConfirm({
        title: "Publicar curso?",
        text: "O curso ficará visível para todos os alunos.",
        confirmText: "Publicar",
        icon: "question",
      })
      if (!confirmed) return
    }

    setSaving(true); setError(null)
    try {
      if (isNew) {
        const created = await createCourse(buildForm(pub), profile.id)
        setCourseId(created.id)
        setPublished(pub)
        setSaved(true)
        setSuccessTitle(title)
        setShowSuccessAnim(true)
        router.replace(`/teacher/curso/${created.id}`)
      } else {
        await updateCourse(courseId!, buildForm(pub))
        setPublished(pub)
        setSaved(true)
        setSuccessTitle(title)
        setShowSuccessAnim(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (error) {
      await swalError({ title: "Erro ao salvar", text: (error as Error)?.message ?? "Tente novamente." })
      setError((error as Error)?.message ?? "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }, [title, profile, isNew, courseId, buildForm, router])

  // ── Upload imagem ───────────────────────────────────────────────────────────
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverPreview(URL.createObjectURL(file))

    let cid = courseId
    if (!cid) {
      if (!title.trim()) { setError("Salve o curso antes de adicionar a imagem."); return }
      if (!profile) return
      setSaving(true)
      try {
        const created = await createCourse(buildForm(false), profile.id)
        cid = created.id
        setCourseId(cid)
        router.replace(`/teacher/curso/${cid}`)
      } catch (error) {
        setError((error as Error)?.message ?? "Erro ao salvar."); setSaving(false); return
      } finally { setSaving(false) }
    }

    setUploading(true)
    try {
      const url = await uploadCourseCover(cid!, file)
      setCoverUrl(url)
      await updateCourse(cid!, { cover_image_url: url })
    } catch (error) {
      setError((error as Error)?.message ?? "Erro no upload.")
    } finally { setUploading(false) }
  }, [courseId, title, profile, buildForm, router])

  const addTag = useCallback(() => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput("")
  }, [tagInput, tags])

  const removeTag = useCallback((t: string) => setTags((prev) => prev.filter((x) => x !== t)), [])

  const formForPreview: CourseFormData = {
    title, description, long_description: longDescription, level, tags,
    estimated_hours: estimatedHours, published, final_project_title: finalTitle,
    final_project_description: finalDesc, final_project_starter_code: finalStarter,
    final_project_tests: finalTests, cover_image_url: coverUrl,
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherSuccessModal
        show={showSuccessAnim}
        type="course"
        title={successTitle}
        onClose={() => setShowSuccessAnim(false)}
        onView={courseId ? () => router.push(`/cursos/${courseId}`) : undefined}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/teacher" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-level-purple transition-colors">
              <ArrowLeft className="h-4 w-4" /> Painel
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-level-purple-dark">{isNew ? "Novo Curso" : (title || "Editor de Curso")}</p>
                <p className="text-xs text-muted-foreground">{published ? "Publicado" : "Rascunho"}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Salvo
              </span>
            )}
            {reordering && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando ordem...
              </span>
            )}
            {courseId && (
              <Link href={`/cursos/${courseId}`} target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-level-purple hover:text-level-purple transition-colors">
                <Eye className="h-3.5 w-3.5" /> Ver página
              </Link>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !title}
              className="flex items-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-level-purple hover:text-level-purple transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Rascunho
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !title}
              className="flex items-center gap-1.5 rounded-lg bg-level-purple px-4 py-1.5 text-xs font-semibold text-white hover:bg-level-purple-dark transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
              Publicar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[1fr_420px]">

          {/* ── FORMULÁRIO ────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Informações Básicas */}
            <Section icon={FileText} title="Informações Básicas" subtitle="Dados exibidos no catálogo">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">
                    Título <span className="text-destructive">*</span>
                  </label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Python Básico"
                    className="w-full rounded-xl border-2 border-border px-4 py-2.5 text-sm outline-none focus:border-level-purple transition-colors" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">
                    Descrição curta
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(card do catálogo)</span>
                  </label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    rows={2} placeholder="Uma frase que resume o curso..."
                    className="w-full resize-none rounded-xl border-2 border-border px-4 py-2.5 text-sm outline-none focus:border-level-purple transition-colors" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">
                    Descrição longa
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(Markdown)</span>
                  </label>
                  <textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)}
                    rows={5} placeholder="Pré-requisitos, metodologia, o que o aluno vai aprender..."
                    className="w-full resize-none rounded-xl border-2 border-border px-4 py-2.5 font-mono text-sm outline-none focus:border-level-purple transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">Nível</label>
                    <div className="flex flex-col gap-2">
                      {LEVEL_OPTIONS.map((opt) => (
                        <button key={opt.value} onClick={() => setLevel(opt.value)}
                          className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all text-left ${
                            level === opt.value
                              ? "border-level-purple bg-level-purple text-white"
                              : "border-border hover:border-level-purple hover:bg-level-purple-subtle"
                          }`}>
                          <span className={`h-2 w-2 rounded-full shrink-0 ${opt.color.split(" ")[0]}`} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">Horas estimadas</label>
                    <input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(Number(e.target.value))}
                      min={0} className="w-full rounded-xl border-2 border-border px-4 py-2.5 text-sm outline-none focus:border-level-purple transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">Tags</label>
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
                      placeholder="Ex: python, iniciante..."
                      className="flex-1 rounded-xl border-2 border-border px-4 py-2 text-sm outline-none focus:border-level-purple transition-colors" />
                    <button onClick={addTag}
                      className="flex items-center gap-1 rounded-xl bg-level-purple px-4 py-2 text-sm font-medium text-white hover:bg-level-purple-dark transition-colors">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <span key={t} className="flex items-center gap-1 rounded-full bg-level-purple-light px-3 py-1 text-xs font-medium text-level-purple-dark">
                          {t}
                          <button onClick={() => removeTag(t)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* Imagem de Capa */}
            <Section icon={ImageIcon as any} title="Imagem de Capa" subtitle="Banner do curso e cards do catálogo">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageSelect} />
              {coverPreview ? (
                <div className="group relative overflow-hidden rounded-xl border-2 border-border">
                  <img src={coverPreview} alt="Capa" className="h-48 w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-900">
                      <Upload className="h-3.5 w-3.5" /> Trocar
                    </button>
                    <button onClick={() => { setCoverUrl(null); setCoverPreview(null) }}
                      className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white">
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  </div>
                  {uploading && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="flex h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-level-purple hover:bg-level-purple-subtle transition-colors">
                  {uploading ? <Loader2 className="h-8 w-8 animate-spin text-level-purple" /> : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
                        <Upload className="h-6 w-6 text-level-purple" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-level-purple-dark">Clique para fazer upload</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG ou WebP • máx. 5MB</p>
                      </div>
                    </>
                  )}
                </button>
              )}
            </Section>

            {/* Lições do Curso — Drag and Drop */}
            <Section icon={BookOpen} title="Lições do Curso" subtitle="Arraste para reordenar · a ordem é salva automaticamente">
              {!courseId ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Salve o curso primeiro para poder adicionar lições.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Lista arrastável */}
                  {courseLessons.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhuma lição vinculada ainda. Adicione abaixo.
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={courseLessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {courseLessons.map((lesson, i) => (
                            <SortableLesson
                              key={lesson.id}
                              lesson={lesson}
                              index={i}
                              onRemove={handleRemoveLesson}
                              removing={removingId === lesson.id}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Botão adicionar lição */}
                  <button
                    onClick={() => setShowAddPanel((v) => !v)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground hover:border-level-purple hover:text-level-purple transition-colors"
                  >
                    <Link2 className="h-4 w-4" />
                    {showAddPanel ? "Fechar painel" : "Adicionar lição ao curso"}
                  </button>

                  {/* Painel de lições disponíveis */}
                  {showAddPanel && (
                    <div className="rounded-xl border-2 border-level-purple/30 bg-level-purple-subtle/30 p-4">
                      <p className="mb-3 text-xs font-semibold text-level-purple-dark">
                        Suas lições avulsas — clique para adicionar ao curso
                      </p>
                      {freeLessons.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground py-4">
                          Nenhuma lição avulsa disponível.{" "}
                          <Link href="/teacher/edit/new" className="font-medium text-level-purple hover:underline">
                            Criar nova lição
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {freeLessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium text-level-purple-dark">{lesson.title}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {lesson.difficulty} · +{lesson.xp_reward} XP
                                  {!lesson.published && <span className="ml-1 text-amber-500">· Rascunho</span>}
                                </p>
                              </div>
                              <button
                                onClick={() => handleAddLesson(lesson)}
                                disabled={addingId === lesson.id}
                                className="flex items-center gap-1.5 rounded-lg bg-level-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-level-purple-dark transition-colors disabled:opacity-40"
                              >
                                {addingId === lesson.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                Adicionar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 border-t border-level-purple/20 pt-3">
                        <Link href="/teacher/edit/new"
                          className="flex items-center justify-center gap-2 rounded-lg border border-level-purple px-4 py-2 text-xs font-semibold text-level-purple hover:bg-level-purple hover:text-white transition-colors">
                          <Plus className="h-3.5 w-3.5" /> Criar nova lição e vincular depois
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Projeto Final */}
            <Section icon={Star} title="Projeto Final" subtitle="Desafio integrador — desbloqueado após todas as lições">
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    Aparece destacado na página do curso. O aluno só acessa após completar todas as lições.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">Título do Projeto</label>
                  <input value={finalTitle} onChange={(e) => setFinalTitle(e.target.value)}
                    placeholder="Ex: Sistema de Análise de Dados"
                    className="w-full rounded-xl border-2 border-border px-4 py-2.5 text-sm outline-none focus:border-level-purple transition-colors" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">Descrição</label>
                  <textarea value={finalDesc} onChange={(e) => setFinalDesc(e.target.value)}
                    rows={3} placeholder="O que o aluno deve construir..."
                    className="w-full resize-none rounded-xl border-2 border-border px-4 py-2.5 text-sm outline-none focus:border-level-purple transition-colors" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">
                    Código Inicial
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(starter code)</span>
                  </label>
                  <div className="overflow-hidden rounded-xl border-2 border-border">
                    <div className="bg-[#1E1E2E] px-4 py-2"><span className="text-xs font-medium text-gray-400">projeto_final.py</span></div>
                    <textarea value={finalStarter} onChange={(e) => setFinalStarter(e.target.value)}
                      rows={7} placeholder="# Código inicial do projeto final..."
                      className="w-full border-0 bg-[#1E1E2E] px-4 py-3 font-mono text-sm text-gray-300 outline-none resize-none" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-level-purple-dark">
                    Testes de Verificação
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(assert ou unittest)</span>
                  </label>
                  <div className="overflow-hidden rounded-xl border-2 border-border">
                    <div className="bg-[#1E1E2E] px-4 py-2"><span className="text-xs font-medium text-gray-400">tests_projeto_final.py</span></div>
                    <textarea value={finalTests} onChange={(e) => setFinalTests(e.target.value)}
                      rows={7} placeholder="assert _stdout contains ..."
                      className="w-full border-0 bg-[#1E1E2E] px-4 py-3 font-mono text-sm text-gray-300 outline-none resize-none" />
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* ── PREVIEW ───────────────────────────────────────────────────── */}
          <div className="xl:sticky xl:top-24 xl:self-start">
            <CoursePreview form={formForPreview} coverPreview={coverPreview} lessons={courseLessons} />
          </div>
        </div>
      </div>
    </div>
  )
}
