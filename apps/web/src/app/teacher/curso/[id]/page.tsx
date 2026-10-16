"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Eye, FileText, Globe, ImageIcon, Loader2, Plus, Save, Star,
  Trash2, Upload, X, type LucideIcon,
} from "lucide-react"
import type { CourseInput, Lesson } from "@levelusp/contracts"
import { createCourse, errorMessage, fetchCourseByIdRaw, toggleCoursePublished, updateCourse, uploadImage } from "@/lib/api"
import { TeacherSuccessModal } from "@/components/gamification/teacher-success-modal"
import { swalConfirm, swalError, swalToast, swalWarning } from "@/lib/swal"
import { CoursePreview, LEVEL_COLOR } from "@/components/teacher/course-editor/course-preview"
import { CourseLessonsSection } from "@/components/teacher/course-editor/course-lessons-section"
import {
  EMPTY_COURSE_FORM, diffCourseInput, formFromCourse, toCourseInput, validateCourseForm, type CourseFormState,
} from "@/components/teacher/course-editor/course-form"

const LEVEL_OPTIONS = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
] as const

const fieldClass = "w-full rounded-xl border-2 border-border px-4 py-2.5 text-sm outline-none transition-colors focus:border-level-purple"
const labelClass = "mb-1.5 block text-sm font-medium text-level-purple-dark"

function Section({ icon: Icon, title, subtitle, children }: {
  icon: LucideIcon
  title: string
  subtitle?: string
  children: ReactNode
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

export default function TeacherCourseEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = params.id === "new"
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<CourseFormState>(EMPTY_COURSE_FORM)
  const [tagInput, setTagInput] = useState("")
  const [courseId, setCourseId] = useState<string | null>(isNew ? null : params.id)
  const [published, setPublished] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([])

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const baseline = useRef<CourseInput | null>(null)
  const createdId = useRef<string | null>(null)
  const patch = (p: Partial<CourseFormState>) => setForm((prev) => ({ ...prev, ...p }))

  // ── Carrega o curso ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNew || params.id === createdId.current) return
    let cancelled = false
    setLoading(true)
    fetchCourseByIdRaw(params.id)
      .then((course) => {
        if (cancelled) return
        if (!course) {
          setNotFound(true)
          return
        }
        const f = formFromCourse(course)
        setForm(f)
        setCoverPreview(course.cover_image_url)
        setPublished(course.published)
        baseline.current = toCourseInput(f)
      })
      .catch((err) => !cancelled && setError(errorMessage(err, "Não foi possível carregar o curso.")))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [isNew, params.id])

  /** Cria o curso (rascunho) ou envia só os campos alterados. Devolve o id. */
  const persist = useCallback(async (): Promise<string> => {
    const input = toCourseInput(form)
    if (!courseId) {
      const created = await createCourse(input)
      createdId.current = created.id
      setCourseId(created.id)
      setPublished(created.published)
      baseline.current = input
      window.history.replaceState(null, "", `/teacher/curso/${created.id}`)
      return created.id
    }
    const changes = baseline.current ? diffCourseInput(baseline.current, input) : input
    if (Object.keys(changes).length) await updateCourse(courseId, changes)
    baseline.current = input
    return courseId
  }, [form, courseId])

  // ── Salvar / publicar ───────────────────────────────────────────────────────
  const handleSave = async (publish?: boolean) => {
    const invalid = validateCourseForm(form)
    if (invalid) {
      await swalError({ title: "Verifique os dados do curso", text: invalid })
      return
    }
    if (publish === true) {
      const ok = await swalConfirm({
        title: "Publicar curso?",
        text: "O curso ficará visível para todos os alunos.",
        confirmText: "Publicar",
        icon: "question",
      })
      if (!ok) return
    }

    setSaving(true)
    setError(null)
    const wasNew = !courseId
    try {
      const id = await persist()
      if (publish !== undefined && publish !== published) {
        if (publish && courseLessons.length === 0) {
          await swalWarning({
            title: "Curso salvo como rascunho",
            text: "Adicione ao menos uma lição antes de publicar o curso.",
          })
        } else {
          const updated = await toggleCoursePublished(id, publish)
          setPublished(updated.published)
        }
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      if (wasNew || publish === true) setShowSuccess(true)
      else swalToast({ title: publish === false ? "Curso despublicado." : "Alterações salvas.", icon: "success" })
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      await swalError({ title: "Erro ao salvar", text: message })
    } finally {
      setSaving(false)
    }
  }

  // ── Capa ────────────────────────────────────────────────────────────────────
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.")
      return
    }
    if (!courseId && validateCourseForm(form)) {
      setError("Preencha o título (3+ caracteres) para salvar o curso antes de enviar a capa.")
      return
    }
    const previous = coverPreview
    setCoverPreview(URL.createObjectURL(file))
    setUploading(true)
    setError(null)
    try {
      const id = await persist()
      const url = await uploadImage(file)
      await updateCourse(id, { cover_image_url: url })
      patch({ cover_image_url: url })
      if (baseline.current) baseline.current = { ...baseline.current, cover_image_url: url }
      setCoverPreview(url)
    } catch (err) {
      setCoverPreview(previous)
      setError(`Erro no envio da capa: ${errorMessage(err)}`)
    } finally {
      setUploading(false)
    }
  }

  const removeCover = async () => {
    const previous = { url: form.cover_image_url, preview: coverPreview }
    patch({ cover_image_url: null })
    setCoverPreview(null)
    if (!courseId) return
    try {
      await updateCourse(courseId, { cover_image_url: null })
      if (baseline.current) baseline.current = { ...baseline.current, cover_image_url: null }
    } catch (err) {
      patch({ cover_image_url: previous.url })
      setCoverPreview(previous.preview)
      setError(`Erro ao remover a capa: ${errorMessage(err)}`)
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t) && form.tags.length < 20) patch({ tags: [...form.tags, t.slice(0, 40)] })
    setTagInput("")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive/60" />
        <p className="text-sm font-semibold text-level-purple-dark">Curso não encontrado.</p>
        <Link href="/teacher" className="rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark">
          Voltar ao painel
        </Link>
      </div>
    )
  }

  const canSave = !saving && form.title.trim().length > 0

  return (
    <div className="min-h-screen bg-background">
      <TeacherSuccessModal
        show={showSuccess}
        type="course"
        title={form.title}
        onClose={() => setShowSuccess(false)}
        onView={courseId ? () => router.push(`/cursos/${courseId}`) : undefined}
      />

      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/teacher" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-level-purple">
              <ArrowLeft className="h-4 w-4" /> Painel
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-level-purple-dark">{!courseId ? "Novo Curso" : form.title || "Editor de Curso"}</p>
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
              <Link
                href={`/cursos/${courseId}`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
              >
                <Eye className="h-3.5 w-3.5" /> Ver página
              </Link>
            )}
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={!canSave}
              className="flex items-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {published ? "Salvar" : "Rascunho"}
            </button>
            {published ? (
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={!canSave}
                className="flex items-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40"
              >
                Despublicar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={!canSave}
                className="flex items-center gap-1.5 rounded-lg bg-level-purple px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                Publicar
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {error && (
          <div role="alert" className="mb-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            <button type="button" aria-label="Fechar aviso" onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <Section icon={FileText} title="Informações Básicas" subtitle="Dados exibidos no catálogo">
              <div className="space-y-4">
                <div>
                  <label htmlFor="course-title" className={labelClass}>
                    Título <span className="text-destructive">*</span>
                  </label>
                  <input id="course-title" value={form.title} maxLength={160} onChange={(e) => patch({ title: e.target.value })} placeholder="Ex: Python Básico" className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="course-description" className={labelClass}>
                    Descrição curta <span className="ml-1 text-xs font-normal text-muted-foreground">(card do catálogo)</span>
                  </label>
                  <textarea
                    id="course-description"
                    value={form.description}
                    maxLength={500}
                    onChange={(e) => patch({ description: e.target.value })}
                    rows={2}
                    placeholder="Uma frase que resume o curso..."
                    className={`${fieldClass} resize-none`}
                  />
                </div>
                <div>
                  <label htmlFor="course-long" className={labelClass}>
                    Descrição longa <span className="ml-1 text-xs font-normal text-muted-foreground">(Markdown)</span>
                  </label>
                  <textarea
                    id="course-long"
                    value={form.long_description}
                    onChange={(e) => patch({ long_description: e.target.value })}
                    rows={5}
                    placeholder="Pré-requisitos, metodologia, o que o aluno vai aprender..."
                    className={`${fieldClass} resize-none font-mono`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className={labelClass}>Nível</span>
                    <div className="flex flex-col gap-2">
                      {LEVEL_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={form.level === opt.value}
                          onClick={() => patch({ level: opt.value })}
                          className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-all ${
                            form.level === opt.value
                              ? "border-level-purple bg-level-purple text-white"
                              : "border-border hover:border-level-purple hover:bg-level-purple-subtle"
                          }`}
                        >
                          <span className={`h-2 w-2 shrink-0 rounded-full ${LEVEL_COLOR[opt.value]!.split(" ")[0]}`} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="course-hours" className={labelClass}>Horas estimadas</label>
                    <input
                      id="course-hours"
                      type="number"
                      value={form.estimated_hours}
                      onChange={(e) => patch({ estimated_hours: Number(e.target.value) })}
                      min={0}
                      max={1000}
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="course-tag" className={labelClass}>Tags</label>
                  <div className="flex gap-2">
                    <input
                      id="course-tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                      placeholder="Ex: python, iniciante..."
                      className={`${fieldClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="flex items-center gap-1 rounded-xl bg-level-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-level-purple-dark"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {form.tags.map((t) => (
                        <span key={t} className="flex items-center gap-1 rounded-full bg-level-purple-light px-3 py-1 text-xs font-medium text-level-purple-dark">
                          {t}
                          <button type="button" aria-label={`Remover tag ${t}`} onClick={() => patch({ tags: form.tags.filter((x) => x !== t) })} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <Section icon={ImageIcon} title="Imagem de Capa" subtitle="Banner do curso e cards do catálogo">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageSelect} />
              {coverPreview ? (
                <div className="group relative overflow-hidden rounded-xl border-2 border-border">
                  <img src={coverPreview} alt="Capa" className="h-48 w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-900">
                      <Upload className="h-3.5 w-3.5" /> Trocar
                    </button>
                    <button type="button" onClick={removeCover} className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white">
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-level-purple hover:bg-level-purple-subtle"
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
                  ) : (
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

            <Section icon={BookOpen} title="Lições do Curso" subtitle="Arraste para reordenar · a ordem é salva automaticamente">
              {!courseId ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Salve o curso primeiro para poder adicionar lições.
                </div>
              ) : (
                <CourseLessonsSection
                  courseId={courseId}
                  onLessonsChange={setCourseLessons}
                  onError={setError}
                  onBusyChange={setReordering}
                />
              )}
            </Section>

            <Section icon={Star} title="Projeto Final" subtitle="Desafio integrador — desbloqueado após todas as lições">
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    Aparece destacado na página do curso. O aluno só acessa após completar todas as lições.
                  </p>
                </div>
                <div>
                  <label htmlFor="course-final-title" className={labelClass}>Título do Projeto</label>
                  <input
                    id="course-final-title"
                    value={form.final_project_title}
                    maxLength={160}
                    onChange={(e) => patch({ final_project_title: e.target.value })}
                    placeholder="Ex: Sistema de Análise de Dados"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="course-final-desc" className={labelClass}>Descrição</label>
                  <textarea
                    id="course-final-desc"
                    value={form.final_project_description}
                    onChange={(e) => patch({ final_project_description: e.target.value })}
                    rows={3}
                    placeholder="O que o aluno deve construir..."
                    className={`${fieldClass} resize-none`}
                  />
                </div>
                <div>
                  <label htmlFor="course-final-code" className={labelClass}>
                    Código Inicial <span className="ml-1 text-xs font-normal text-muted-foreground">(starter code)</span>
                  </label>
                  <div className="overflow-hidden rounded-xl border-2 border-border">
                    <div className="bg-[#1E1E2E] px-4 py-2"><span className="text-xs font-medium text-gray-400">projeto_final.py</span></div>
                    <textarea
                      id="course-final-code"
                      value={form.final_project_starter_code}
                      onChange={(e) => patch({ final_project_starter_code: e.target.value })}
                      rows={7}
                      spellCheck={false}
                      placeholder="# Código inicial do projeto final..."
                      className="w-full resize-none border-0 bg-[#1E1E2E] px-4 py-3 font-mono text-sm text-gray-300 outline-none"
                    />
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <CoursePreview form={form} coverPreview={coverPreview} lessons={courseLessons} />
          </div>
        </div>
      </div>
    </div>
  )
}
