"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Save, Eye, EyeOff, Plus, BookOpen, Code2, FlaskConical,
  CheckCircle2, AlertCircle, X, FileText, Loader2, GraduationCap,
  ListChecks, Trash2, ChevronUp, ChevronDown, Settings, Package,
} from "lucide-react"
import { LevelButton } from "@/components/design-system/level-button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchLessonByIdFull,
  createLesson,
  updateLesson,
  type LessonFormData,
} from "@/lib/supabase/lessons"
import { fetchTeacherCourses } from "@/lib/supabase/courses"
import type { Course, Checkpoint, ProjectFile, LibraryCatalog } from "@/lib/supabase/types"
import { parseProjectFiles } from "@/lib/supabase/lessons"
import { fetchLibraryCatalog, createLibraryRequest, fetchMyLibraryRequests } from "@/lib/supabase/libraries"
import type { LibraryRequest } from "@/lib/supabase/types"
import { TeacherSuccessModal } from "@/components/gamification/teacher-success-modal"
import { swalConfirm, swalError } from "@/lib/swal"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { LessonContentPreview } from "@/components/editor/lesson-content-preview"

// ── Labels de categoria ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  "data-science":  "Ciência de Dados",
  "ml":            "Machine Learning",
  "deep-learning": "Deep Learning",
  "visualization": "Visualização",
  "math":          "Matemática",
  "general":       "Geral",
}

const CATEGORY_ORDER = ["data-science", "ml", "deep-learning", "visualization", "math", "general"]

const DEFAULT_STARTER = `# Escreva sua solução aqui

def soma(a, b):
    # Implemente a função
    pass

resultado = soma(2, 3)
print(f"Resultado: {resultado}")
`

const DEFAULT_TESTS = `import unittest

class TestSoma(unittest.TestCase):
    def test_soma_positivos(self):
        self.assertEqual(soma(2, 3), 5, "soma(2, 3) deve retornar 5")

    def test_soma_negativos(self):
        self.assertEqual(soma(-1, -1), -2, "soma(-1, -1) deve retornar -2")

    def test_soma_zeros(self):
        self.assertEqual(soma(0, 0), 0, "soma(0, 0) deve retornar 0")
`

const DEFAULT_CONTENT = `<h3 class="text-base font-semibold text-foreground mb-3">Introdução</h3>
<p class="text-muted-foreground mb-4">
  Descreva aqui o conceito principal da lição.
</p>
<h3 class="text-base font-semibold text-foreground mb-3">Seu Desafio</h3>
<p class="text-muted-foreground">
  Explique o que o aluno deve implementar.
</p>`

// ── Abas de navegação do editor ────────────────────────────────────────────────

const EDITOR_TABS = [
  { id: "config",      label: "Configurações", icon: Settings,     codingOnly: false },
  { id: "conteudo",    label: "Conteúdo",      icon: FileText,     codingOnly: false },
  { id: "exercicio",   label: "Exercício",     icon: Code2,        codingOnly: true },
  { id: "testes",      label: "Testes",        icon: FlaskConical, codingOnly: true },
  { id: "checkpoints", label: "Checkpoints",   icon: ListChecks,   codingOnly: true },
  { id: "libs",        label: "Bibliotecas",   icon: Package,      codingOnly: true },
] as const

type EditorTab = (typeof EDITOR_TABS)[number]["id"]

// ── Componente principal ──────────────────────────────────────────────────────

export default function TeacherEditPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const isNew = params.id === "new"

  // Campos do formulário
  const [title, setTitle]           = useState("")
  const [description, setDescription] = useState("")
  const [module, setModule]         = useState("Python Básico")
  const [order, setOrder]           = useState(1)
  const [difficulty, setDifficulty] = useState<LessonFormData["difficulty"]>("iniciante")
  const [content, setContent]       = useState(DEFAULT_CONTENT)
  const [starterCode, setStarterCode] = useState(DEFAULT_STARTER)
  const [hiddenTests, setHiddenTests] = useState(DEFAULT_TESTS)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [starterFiles, setStarterFiles] = useState<ProjectFile[]>([])
  const [libraries, setLibraries]   = useState<string[]>([])
  const [xpReward, setXpReward]     = useState(50)
  const [timeLimit, setTimeLimit]   = useState(0)
  const [lessonType, setLessonType] = useState<"coding" | "theory">("coding")
  const [courseId, setCourseId]     = useState<string | null>(null)
  const [editorTab, setEditorTab]   = useState<EditorTab>("config")
  const [showPreview, setShowPreview] = useState(true)

  // Se a lição virar teórica numa aba só de código, volta para uma aba válida
  useEffect(() => {
    if (lessonType === "theory" && editorTab !== "config" && editorTab !== "conteudo") {
      setEditorTab("conteudo")
    }
  }, [lessonType, editorTab])

  // Cursos do professor para o seletor
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([])

  // Catálogo de bibliotecas
  const [catalogLibraries, setCatalogLibraries] = useState<LibraryCatalog[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  // Modal de requisição de nova biblioteca
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [reqName, setReqName] = useState("")
  const [reqDisplayName, setReqDisplayName] = useState("")
  const [reqDescription, setReqDescription] = useState("")
  const [reqUseCase, setReqUseCase] = useState("")
  const [reqSending, setReqSending] = useState(false)
  const [myRequests, setMyRequests] = useState<LibraryRequest[]>([])

  // Estado da UI
  const [loading,        setLoading]       = useState(!isNew)
  const [saving,         setSaving]        = useState(false)
  const [saved,          setSaved]         = useState(false)
  const [error,          setError]         = useState<string | null>(null)
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)
  const [lessonIdForView, setLessonIdForView] = useState<string | null>(isNew ? null : params.id as string)

  // Carrega cursos do professor + catálogo de bibliotecas + minhas requisições
  useEffect(() => {
    if (!profile?.id) return
    fetchTeacherCourses(profile.id).then(setTeacherCourses)
    fetchLibraryCatalog()
      .then(setCatalogLibraries)
      .finally(() => setCatalogLoading(false))
    fetchMyLibraryRequests(profile.id).then(setMyRequests).catch(() => {})
  }, [profile?.id])

  // Carrega a lição existente
  useEffect(() => {
    if (isNew) return
    async function load() {
      setLoading(true)
      const lesson = await fetchLessonByIdFull(params.id as string)
      if (!lesson) {
        setError("Lição não encontrada.")
        setLoading(false)
        return
      }
      setTitle(lesson.title)
      setDescription(lesson.description ?? "")
      setModule(lesson.module)
      setOrder(lesson.order)
      setDifficulty(lesson.difficulty)
      setContent(lesson.content_markdown)
      setStarterCode(lesson.starter_code)
      setHiddenTests(lesson.hidden_tests ?? "")
      setCheckpoints(lesson.checkpoints ?? [])
      setStarterFiles(parseProjectFiles(lesson.starter_files, [{ path: "main.py", content: lesson.starter_code ?? "" }]))
      setLibraries(lesson.libraries ?? [])
      setXpReward(lesson.xp_reward)
      setTimeLimit(lesson.time_limit)
      setLessonType(lesson.lesson_type ?? "coding")
      setCourseId((lesson as any).course_id ?? null)
      setLoading(false)
    }
    load()
  }, [isNew, params.id])

  const toggleLibrary = (libId: string) => {
    setLibraries((prev) =>
      prev.includes(libId) ? prev.filter((id) => id !== libId) : [...prev, libId]
    )
  }

  const sendLibraryRequest = async () => {
    if (!reqName.trim() || !profile?.id) return
    setReqSending(true)
    try {
      const created = await createLibraryRequest(profile.id, {
        library_name: reqName.trim(),
        display_name: reqDisplayName.trim() || undefined,
        description: reqDescription.trim() || undefined,
        use_case: reqUseCase.trim() || undefined,
      })
      setMyRequests((prev) => [created, ...prev])
      setReqName(""); setReqDisplayName(""); setReqDescription(""); setReqUseCase("")
      setShowRequestModal(false)
    } catch {
      swalError("Erro ao enviar requisição. Tente novamente.")
    } finally {
      setReqSending(false)
    }
  }

  // Bibliotecas agrupadas por categoria (mantendo ordem pedagógica)
  const libsByCategory = CATEGORY_ORDER.reduce<Record<string, LibraryCatalog[]>>((acc, cat) => {
    const libs = catalogLibraries.filter((l) => l.category === cat)
    if (libs.length) acc[cat] = libs
    return acc
  }, {})

  // ── Arquivos-semente (starter_files) ────────────────────────────────────────
  const [activeStarterPath, setActiveStarterPath] = useState("main.py")

  const starterFilesOrDefault = starterFiles.length
    ? starterFiles
    : [{ path: "main.py", content: starterCode }]
  const activeStarter = starterFilesOrDefault.find((f) => f.path === activeStarterPath)
    ?? starterFilesOrDefault[0]

  const updateStarterContent = (path: string, content: string) => {
    setStarterFiles((prev) => {
      const base = prev.length ? prev : [{ path: "main.py", content: starterCode }]
      const next = base.map((f) => (f.path === path ? { ...f, content } : f))
      // Mantém starter_code sincronizado com o main.py (retrocompat)
      if (path === "main.py") setStarterCode(content)
      return next
    })
  }

  const addStarterFile = () => {
    const name = window.prompt("Nome do arquivo (ex: utils.py ou pasta/mod.py):")
    if (!name) return
    const path = name.trim().replace(/^\/+/, "")
    if (!/^[\w\-./]+\.py$/.test(path) || path.includes("..")) {
      setError("Nome de arquivo inválido. Use letras, números e termine com .py")
      return
    }
    setStarterFiles((prev) => {
      const base = prev.length ? prev : [{ path: "main.py", content: starterCode }]
      if (base.some((f) => f.path === path)) {
        setError("Já existe um arquivo com esse nome.")
        return base
      }
      return [...base, { path, content: "" }]
    })
    setActiveStarterPath(path)
  }

  const removeStarterFile = (path: string) => {
    if (path === "main.py") return
    setStarterFiles((prev) => {
      const base = prev.length ? prev : [{ path: "main.py", content: starterCode }]
      return base.filter((f) => f.path !== path)
    })
    setActiveStarterPath("main.py")
  }

  // ── Checkpoints (instruções por passo) ──────────────────────────────────────
  const addCheckpoint = () =>
    setCheckpoints((prev) => [
      ...prev,
      { id: prev.length ? Math.max(...prev.map((c) => c.id)) + 1 : 1, instruction: "", hint: "" },
    ])

  const updateCheckpoint = (id: number, patch: Partial<Checkpoint>) =>
    setCheckpoints((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const removeCheckpoint = (id: number) =>
    setCheckpoints((prev) => prev.filter((c) => c.id !== id))

  const moveCheckpoint = (id: number, dir: -1 | 1) =>
    setCheckpoints((prev) => {
      const idx = prev.findIndex((c) => c.id === id)
      const next = idx + dir
      if (idx < 0 || next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
      return copy
    })

  const buildFormData = (published: boolean): LessonFormData => ({
    title,
    description,
    module,
    order,
    difficulty,
    lesson_type: lessonType,
    content_markdown: content,
    starter_code: starterCode,
    starter_files: starterFiles.length ? starterFiles : [{ path: "main.py", content: starterCode }],
    hidden_tests: hiddenTests,
    checkpoints,
    libraries,
    xp_reward: xpReward,
    time_limit: timeLimit,
    published,
    course_id: courseId || null,
  })

  const handleSave = useCallback(async (published: boolean) => {
    if (!title.trim()) {
      await swalError({ title: "Campo obrigatório", text: "O título da lição é obrigatório." })
      return
    }
    if (!profile) return

    if (published && !isNew) {
      const confirmed = await swalConfirm({
        title: "Publicar lição?",
        text: "A lição ficará disponível para todos os alunos.",
        confirmText: "Publicar",
        icon: "question",
      })
      if (!confirmed) return
    }

    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createLesson(buildFormData(published), profile.id)
        setSaved(true)
        setLessonIdForView(created.id)
        setShowSuccessAnim(true)
        router.replace(`/teacher/edit/${created.id}`)
      } else {
        await updateLesson(params.id as string, buildFormData(published))
        setSaved(true)
        setShowSuccessAnim(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (e: unknown) {
      await swalError({ title: "Erro ao salvar", text: e instanceof Error ? e.message : "Tente novamente." })
      setError(e instanceof Error ? e.message : "Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, module, order, difficulty, content, starterCode, starterFiles, hiddenTests, checkpoints, libraries, xpReward, timeLimit, profile, isNew, params.id])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <TeacherSuccessModal
        show={showSuccessAnim}
        type="lesson"
        title={title}
        onClose={() => setShowSuccessAnim(false)}
        onView={lessonIdForView ? () => router.push(`/lesson/${lessonIdForView}`) : undefined}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/teacher" className="flex items-center gap-2 text-muted-foreground hover:text-level-purple transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Voltar</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-level-purple-dark">Editor de Lição</h1>
                <p className="text-xs text-muted-foreground">
                  {isNew ? "Nova Lição" : title || `Lição #${params.id}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Salvo!
              </span>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !title}
              className="flex items-center gap-2 rounded-xl border-2 border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-level-purple hover:text-level-purple transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Rascunho
            </button>
            <LevelButton variant="primary" size="md" onClick={() => handleSave(true)} disabled={saving || !title}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Publicando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Publicar Lição
                </span>
              )}
            </LevelButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Navegação horizontal por abas */}
        <div className="sticky top-16 z-40 -mx-6 mb-8 border-b border-border bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-1 overflow-x-auto">
            {EDITOR_TABS.filter((t) => !t.codingOnly || lessonType === "coding").map((tab) => {
              const active = editorTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEditorTab(tab.id)}
                  className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                    active ? "text-level-purple" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-level-purple" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Aba: Configurações ── */}
        {editorTab === "config" && (
          <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border-2 border-border bg-white p-6">
                {/* Título */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-level-purple-dark">
                    Título <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Introdução a Variáveis em Python"
                    className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-level-purple-dark">
                    Descrição curta <span className="text-xs font-normal text-muted-foreground">(resumo da lição)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Aprenda a declarar variáveis e os tipos básicos do Python"
                    className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                  />
                </div>
                {/* Curso */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-level-purple-dark flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-level-purple" />
                    Curso
                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                  </label>
                  {teacherCourses.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                      <GraduationCap className="h-4 w-4 shrink-0" />
                      Nenhum curso criado ainda.{" "}
                      <a href="/teacher/curso/new" className="font-medium text-level-purple hover:underline">
                        Criar um curso
                      </a>
                    </div>
                  ) : (
                    <Select
                      value={courseId ?? "none"}
                      onValueChange={(v) => setCourseId(v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2 border-border focus:border-level-purple focus:ring-0">
                        <SelectValue placeholder="Selecionar curso..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">Sem curso (lição avulsa)</span>
                        </SelectItem>
                        {teacherCourses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <span>{c.title}</span>
                              {!c.published && (
                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  Rascunho
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {courseId && (
                    <p className="text-xs text-muted-foreground">
                      Esta lição aparecerá na página do curso selecionado.
                    </p>
                  )}
                </div>

                {/* Ordem + Módulo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-level-purple-dark">Ordem</label>
                    <input
                      type="number"
                      value={order}
                      onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-foreground focus:border-level-purple focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-level-purple-dark">Módulo</label>
                    <Select value={module} onValueChange={setModule}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-border focus:border-level-purple focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Python Básico">Python Básico</SelectItem>
                        <SelectItem value="Python Intermediário">Python Intermediário</SelectItem>
                        <SelectItem value="Ciência de Dados">Ciência de Dados</SelectItem>
                        <SelectItem value="Machine Learning">Machine Learning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dificuldade */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-level-purple-dark">Dificuldade</label>
                  <div className="flex gap-2">
                    {([
                      { value: "iniciante",    label: "Iniciante",    color: "bg-success" },
                      { value: "intermediario", label: "Intermediário", color: "bg-warning" },
                      { value: "avancado",     label: "Avançado",     color: "bg-destructive" },
                    ] as const).map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDifficulty(d.value)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                          difficulty === d.value
                            ? "bg-level-purple text-white"
                            : "bg-level-purple-subtle text-level-purple-dark hover:bg-level-purple-light"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${d.color}`} />
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo de aula */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-level-purple-dark">Tipo de aula</label>
                  <div className="flex gap-2">
                    {([
                      { value: "coding", label: "💻 Com IDE", desc: "Aluno escreve código" },
                      { value: "theory", label: "📖 Teórica", desc: "Só leitura, sem IDE" },
                    ] as const).map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setLessonType(t.value)}
                        className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-left text-sm transition-all ${
                          lessonType === t.value
                            ? "border-level-purple bg-level-purple text-white"
                            : "border-border bg-white text-level-purple-dark hover:border-level-purple"
                        }`}
                      >
                        <span className="font-medium">{t.label}</span>
                        <p className={`text-xs mt-0.5 ${lessonType === t.value ? "text-white/80" : "text-muted-foreground"}`}>{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-level-purple-dark">Recompensa XP</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={xpReward}
                        onChange={(e) => setXpReward(parseInt(e.target.value) || 0)}
                        min={0} step={10}
                        className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 pr-12 text-foreground focus:border-level-purple focus:outline-none transition-colors"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-level-purple">XP</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-level-purple-dark">Tempo Limite</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                        min={0} step={30}
                        className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 pr-12 text-foreground focus:border-level-purple focus:outline-none transition-colors"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">seg</span>
                    </div>
                  </div>
                </div>
          </div>
        )}

        {/* ── Aba: Conteúdo (editor + pré-visualização ao vivo) ── */}
        {editorTab === "conteudo" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-level-purple-dark">Conteúdo da aula</h2>
                <p className="text-sm text-muted-foreground">
                  Escreva à esquerda; a pré-visualização mostra exatamente como o aluno verá.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? "Ocultar pré-visualização" : "Mostrar pré-visualização"}
              </button>
            </div>

            <div className={showPreview ? "grid gap-6 lg:grid-cols-2" : ""}>
              <div className="min-w-0">
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Escreva o conteúdo da aula aqui. Use a barra de ferramentas para formatar texto, inserir imagens, emojis e blocos de código…"
                  minHeight={420}
                />
              </div>

              {showPreview && (
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Eye className="h-3.5 w-3.5 text-level-purple" />
                    Pré-visualização — como o aluno vê
                  </div>
                  <div className="min-h-[420px] rounded-2xl border-2 border-dashed border-level-purple/30 bg-[#FCFBFF] p-5">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-level-purple">
                      {module}
                    </p>
                    <h2 className="mb-4 text-xl font-bold leading-tight text-level-purple-dark">
                      {title || "Título da lição"}
                    </h2>
                    <LessonContentPreview content={content} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Aba: Exercício (arquivos-semente) ── */}
        {editorTab === "exercicio" && lessonType === "coding" && (
          <div className="mx-auto max-w-3xl">
            {/* Starter Code */}
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                  <Code2 className="h-5 w-5 text-level-purple" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-level-purple-dark">Arquivos do Exercício</h2>
                  <p className="text-sm text-muted-foreground">Arquivos que o aluno recebe ao abrir a lição (main.py é obrigatório)</p>
                </div>
                <button
                  type="button"
                  onClick={addStarterFile}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-level-purple bg-level-purple-subtle px-3 py-2 text-sm font-semibold text-level-purple transition-colors hover:bg-level-purple-light"
                >
                  <Plus className="h-4 w-4" /> Arquivo
                </button>
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border-2 border-border">
                  {/* Abas dos arquivos-semente */}
                  <div className="flex items-center overflow-x-auto bg-[#1E1E2E] px-2 pt-2">
                    {starterFilesOrDefault.map((f) => (
                      <div
                        key={f.path}
                        onClick={() => setActiveStarterPath(f.path)}
                        className={`group flex cursor-pointer items-center gap-2 rounded-t-lg px-3 py-1.5 text-xs transition-colors ${
                          f.path === activeStarter.path
                            ? "bg-[#2d2d3d] text-white"
                            : "text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        <span>🐍</span>
                        <span>{f.path}</span>
                        {f.path !== "main.py" && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeStarterFile(f.path) }}
                            className="rounded p-0.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            title="Remover arquivo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={activeStarter.content}
                    onChange={(e) => updateStarterContent(activeStarter.path, e.target.value)}
                    rows={10}
                    className="w-full border-0 bg-[#1E1E2E] px-4 py-3 font-mono text-sm text-gray-300 focus:outline-none resize-none"
                  />
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── Aba: Testes ── */}
        {editorTab === "testes" && lessonType === "coding" && (
          <div className="mx-auto max-w-3xl">
            {/* Testes Ocultos */}
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                  <FlaskConical className="h-5 w-5 text-level-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-level-purple-dark">Testes Ocultos</h2>
                  <p className="text-sm text-muted-foreground">Validação automática com assert</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-xl bg-level-purple-subtle px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-level-purple mt-0.5 shrink-0" />
                  <div className="text-sm text-level-purple-dark">
                    <p className="font-medium">Use <code className="bg-level-purple/10 px-1 rounded">unittest.TestCase</code> ou <code className="bg-level-purple/10 px-1 rounded">assert</code> simples.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      O código do aluno é executado antes dos testes. Com <code>unittest</code>, cada método <code>test_*</code> é contado separadamente — resultados mais detalhados.
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border-2 border-border">
                  <div className="flex items-center justify-between bg-[#1E1E2E] px-4 py-2">
                    <span className="text-xs font-medium text-gray-400">hidden_tests.py</span>
                    <Badge className="bg-success/20 text-success border-0 text-xs">unittest / assert</Badge>
                  </div>
                  <textarea
                    value={hiddenTests}
                    onChange={(e) => setHiddenTests(e.target.value)}
                    rows={12}
                    className="w-full border-0 bg-[#1E1E2E] px-4 py-3 font-mono text-sm text-gray-300 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Aba: Checkpoints ── */}
        {editorTab === "checkpoints" && lessonType === "coding" && (
          <div className="mx-auto max-w-3xl">
            {/* Checkpoints / Instruções */}
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                    <ListChecks className="h-5 w-5 text-level-purple" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-level-purple-dark">Instruções (Checkpoints)</h2>
                    <p className="text-sm text-muted-foreground">Passos guiados que o aluno vê no painel da lição</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addCheckpoint}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-level-purple bg-level-purple-subtle px-3 py-2 text-sm font-semibold text-level-purple transition-colors hover:bg-level-purple-light"
                >
                  <Plus className="h-4 w-4" /> Adicionar passo
                </button>
              </div>

              {checkpoints.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border py-8 text-center">
                  <ListChecks className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum passo ainda. Adicione instruções para guiar o aluno.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checkpoints.map((cp, idx) => (
                    <div key={cp.id} className="rounded-xl border-2 border-border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-level-purple">Passo {idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveCheckpoint(cp.id, -1)} disabled={idx === 0}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30">
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => moveCheckpoint(cp.id, 1)} disabled={idx === checkpoints.length - 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30">
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => removeCheckpoint(cp.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instrução</label>
                          <textarea
                            value={cp.instruction}
                            onChange={(e) => updateCheckpoint(cp.id, { instruction: e.target.value })}
                            rows={2}
                            placeholder="Ex: Defina a função soma(a, b) que retorna a + b"
                            className="w-full rounded-xl border-2 border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none resize-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dica (opcional)</label>
                          <input
                            value={cp.hint ?? ""}
                            onChange={(e) => updateCheckpoint(cp.id, { hint: e.target.value })}
                            placeholder="Ex: Use return a + b"
                            className="w-full rounded-xl border-2 border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Aba: Bibliotecas ── */}
        {editorTab === "libs" && lessonType === "coding" && (
          <div className="mx-auto max-w-3xl">
            {/* Bibliotecas */}
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                    <Plus className="h-5 w-5 text-level-purple" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-level-purple-dark">Bibliotecas Python</h2>
                    <p className="text-sm text-muted-foreground">
                      {catalogLoading ? "Carregando catálogo..." : `${catalogLibraries.length} disponíveis`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(true)}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-level-purple bg-level-purple-subtle px-3 py-2 text-xs font-semibold text-level-purple transition-colors hover:bg-level-purple-light"
                >
                  <Plus className="h-3.5 w-3.5" /> Solicitar nova
                </button>
              </div>

              {catalogLoading ? (
                <div className="space-y-2">
                  {[0,1,2].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/50" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(libsByCategory).map(([cat, libs]) => (
                    <div key={cat}>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {libs.map((lib) => {
                          const selected = libraries.includes(lib.name)
                          return (
                            <button
                              key={lib.id}
                              type="button"
                              onClick={() => toggleLibrary(lib.name)}
                              className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all ${
                                selected
                                  ? "border-level-purple bg-level-purple-light"
                                  : "border-border bg-white hover:border-level-purple-medium hover:bg-level-purple-subtle"
                              }`}
                            >
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-level-purple" : "bg-level-purple-subtle"}`}>
                                {selected
                                  ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                  : <Plus className="h-3.5 w-3.5 text-level-purple" />
                                }
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-semibold truncate ${selected ? "text-level-purple-dark" : "text-foreground"}`}>
                                  {lib.display_name}
                                </p>
                                {lib.pyodide_native && (
                                  <p className="text-[10px] text-emerald-600 font-medium">nativo</p>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {libraries.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {libraries.map((libName) => {
                    const lib = catalogLibraries.find((l) => l.name === libName)
                    return (
                      <Badge key={libName} className="bg-level-purple text-white border-0 px-3 py-1 flex items-center gap-1">
                        {lib?.display_name ?? libName}
                        <button type="button" onClick={() => toggleLibrary(libName)} className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}

              {/* Minhas requisições pendentes */}
              {myRequests.filter((r) => r.status === "pending").length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1.5 text-xs font-bold text-amber-700">Requisições pendentes</p>
                  {myRequests.filter((r) => r.status === "pending").map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span className="font-medium">{r.library_name}</span>
                      <span className="text-amber-500">· aguardando aprovação</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de requisição de nova biblioteca */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-level-purple-dark">Solicitar nova biblioteca</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  O admin receberá sua solicitação e avaliará a inclusão no catálogo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nome do pacote pip <span className="text-destructive">*</span>
                </label>
                <input
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  placeholder="Ex: xgboost, torchvision, cv2"
                  className="w-full rounded-xl border-2 border-border px-3 py-2.5 text-sm focus:border-level-purple focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nome amigável
                </label>
                <input
                  value={reqDisplayName}
                  onChange={(e) => setReqDisplayName(e.target.value)}
                  placeholder="Ex: XGBoost, TorchVision, OpenCV"
                  className="w-full rounded-xl border-2 border-border px-3 py-2.5 text-sm focus:border-level-purple focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Justificativa pedagógica
                </label>
                <textarea
                  value={reqUseCase}
                  onChange={(e) => setReqUseCase(e.target.value)}
                  rows={3}
                  placeholder="Para qual tópico/módulo precisa desta biblioteca? O que os alunos farão com ela?"
                  className="w-full rounded-xl border-2 border-border px-3 py-2.5 text-sm focus:border-level-purple focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="flex-1 rounded-xl border-2 border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={sendLibraryRequest}
                disabled={reqSending || !reqName.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-level-purple py-2.5 text-sm font-semibold text-white hover:bg-level-purple-medium transition-colors disabled:opacity-50"
              >
                {reqSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Enviar solicitação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
