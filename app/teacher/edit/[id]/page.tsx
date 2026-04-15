"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Save, Eye, Plus, BookOpen, Code2, FlaskConical,
  CheckCircle2, AlertCircle, X, FileText, Loader2,
} from "lucide-react"
import { LevelButton } from "@/components/design-system/level-button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchLessonById,
  createLesson,
  updateLesson,
  type LessonFormData,
} from "@/lib/supabase/lessons"

// ── Constantes ────────────────────────────────────────────────────────────────

const AVAILABLE_LIBRARIES = [
  { id: "pandas",         name: "Pandas",        description: "Manipulação de dados" },
  { id: "numpy",          name: "NumPy",         description: "Computação numérica" },
  { id: "matplotlib",     name: "Matplotlib",    description: "Visualização de dados" },
  { id: "seaborn",        name: "Seaborn",       description: "Visualização estatística" },
  { id: "scikit-learn",   name: "Scikit-learn",  description: "Machine Learning" },
  { id: "scipy",          name: "SciPy",         description: "Computação científica" },
  { id: "requests",       name: "Requests",      description: "HTTP requests" },
  { id: "beautifulsoup4", name: "BeautifulSoup", description: "Web scraping" },
]

const DEFAULT_STARTER = `# Escreva sua solução aqui

def soma(a, b):
    # Implemente a função
    pass

resultado = soma(2, 3)
print(f"Resultado: {resultado}")
`

const DEFAULT_TESTS = `# Testes ocultos — use assert statements
# O código do aluno é combinado com estes testes e executado juntos.
# AssertionError = resposta incorreta; qualquer outra exceção = erro no código.

assert soma(2, 3) == 5, "soma(2, 3) deve retornar 5"
assert soma(-1, -1) == -2, "soma(-1, -1) deve retornar -2"
assert soma(0, 0) == 0, "soma(0, 0) deve retornar 0"
`

const DEFAULT_CONTENT = `<h3 class="text-base font-semibold text-foreground mb-3">Introdução</h3>
<p class="text-muted-foreground mb-4">
  Descreva aqui o conceito principal da lição.
</p>
<h3 class="text-base font-semibold text-foreground mb-3">Seu Desafio</h3>
<p class="text-muted-foreground">
  Explique o que o aluno deve implementar.
</p>`

// ── Componente principal ──────────────────────────────────────────────────────

export default function TeacherEditPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const isNew = params.id === "new"

  // Campos do formulário
  const [title, setTitle]           = useState("")
  const [module, setModule]         = useState("Python Básico")
  const [order, setOrder]           = useState(1)
  const [difficulty, setDifficulty] = useState<LessonFormData["difficulty"]>("iniciante")
  const [content, setContent]       = useState(DEFAULT_CONTENT)
  const [starterCode, setStarterCode] = useState(DEFAULT_STARTER)
  const [hiddenTests, setHiddenTests] = useState(DEFAULT_TESTS)
  const [libraries, setLibraries]   = useState<string[]>([])
  const [xpReward, setXpReward]     = useState(50)
  const [timeLimit, setTimeLimit]   = useState(0)

  // Estado da UI
  const [loading, setLoading]     = useState(!isNew)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Carrega a lição existente
  useEffect(() => {
    if (isNew) return
    async function load() {
      setLoading(true)
      const lesson = await fetchLessonById(params.id as string)
      if (!lesson) {
        setError("Lição não encontrada.")
        setLoading(false)
        return
      }
      setTitle(lesson.title)
      setModule(lesson.module)
      setOrder(lesson.order)
      setDifficulty(lesson.difficulty)
      setContent(lesson.content_markdown)
      setStarterCode(lesson.starter_code)
      setHiddenTests(lesson.hidden_tests)
      setLibraries(lesson.libraries ?? [])
      setXpReward(lesson.xp_reward)
      setTimeLimit(lesson.time_limit)
      setLoading(false)
    }
    load()
  }, [isNew, params.id])

  const toggleLibrary = (libId: string) => {
    setLibraries((prev) =>
      prev.includes(libId) ? prev.filter((id) => id !== libId) : [...prev, libId]
    )
  }

  const buildFormData = (published: boolean): LessonFormData => ({
    title,
    module,
    order,
    difficulty,
    content_markdown: content,
    starter_code: starterCode,
    hidden_tests: hiddenTests,
    libraries,
    xp_reward: xpReward,
    time_limit: timeLimit,
    published,
  })

  const handleSave = useCallback(async (published: boolean) => {
    if (!title.trim()) {
      setError("O título da lição é obrigatório.")
      return
    }
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createLesson(buildFormData(published), profile.id)
        setSaved(true)
        router.replace(`/teacher/edit/${created.id}`)
      } else {
        await updateLesson(params.id as string, buildFormData(published))
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, module, order, difficulty, content, starterCode, hiddenTests, libraries, xpReward, timeLimit, profile, isNew, params.id])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Coluna esquerda — Conteúdo */}
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                  <FileText className="h-5 w-5 text-level-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-level-purple-dark">
                    {isNew ? "Nova Lição" : "Editar Lição"}
                  </h2>
                  <p className="text-sm text-muted-foreground">Conteúdo educativo</p>
                </div>
              </div>

              <div className="space-y-5">
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

                {/* Conteúdo HTML */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-level-purple-dark">Conteúdo (HTML)</label>
                    <Badge className="bg-level-purple-light text-level-purple-dark border-0 text-xs">HTML</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use tags como{" "}
                    <code className="bg-muted px-1 rounded text-xs">&lt;h3&gt;</code>,{" "}
                    <code className="bg-muted px-1 rounded text-xs">&lt;p&gt;</code>,{" "}
                    <code className="bg-muted px-1 rounded text-xs">&lt;ul&gt;&lt;li&gt;</code>,{" "}
                    <code className="bg-muted px-1 rounded text-xs">&lt;strong&gt;</code>
                    {" "}com as classes do design system.
                  </p>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={14}
                    className="w-full rounded-xl border-2 border-border bg-level-purple-subtle/30 px-4 py-3 font-mono text-sm text-foreground focus:border-level-purple focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coluna direita — Desafio */}
          <div className="space-y-6">
            {/* Starter Code */}
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                  <Code2 className="h-5 w-5 text-level-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-level-purple-dark">Código Inicial</h2>
                  <p className="text-sm text-muted-foreground">Código que o aluno recebe ao abrir a lição</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border-2 border-border">
                  <div className="flex items-center justify-between bg-[#1E1E2E] px-4 py-2">
                    <span className="text-xs font-medium text-gray-400">main.py</span>
                    <Badge className="bg-level-purple/20 text-level-purple border-0 text-xs">Python</Badge>
                  </div>
                  <textarea
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    rows={10}
                    className="w-full border-0 bg-[#1E1E2E] px-4 py-3 font-mono text-sm text-gray-300 focus:outline-none resize-none"
                  />
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
            </div>

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
                    <p className="font-medium">Use <code className="bg-level-purple/10 px-1 rounded">assert</code> statements, não unittest.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      O código do aluno e os testes são executados juntos. <code>AssertionError</code> com mensagem = resposta errada.
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border-2 border-border">
                  <div className="flex items-center justify-between bg-[#1E1E2E] px-4 py-2">
                    <span className="text-xs font-medium text-gray-400">hidden_tests.py</span>
                    <Badge className="bg-success/20 text-success border-0 text-xs">assert</Badge>
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

            {/* Bibliotecas */}
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                  <Plus className="h-5 w-5 text-level-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-level-purple-dark">Bibliotecas</h2>
                  <p className="text-sm text-muted-foreground">Pré-instaladas via micropip</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_LIBRARIES.map((lib) => {
                  const selected = libraries.includes(lib.id)
                  return (
                    <button
                      key={lib.id}
                      onClick={() => toggleLibrary(lib.id)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                        selected
                          ? "border-level-purple bg-level-purple-light"
                          : "border-border bg-white hover:border-level-purple-medium hover:bg-level-purple-subtle"
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${selected ? "bg-level-purple" : "bg-level-purple-subtle"}`}>
                        {selected
                          ? <CheckCircle2 className="h-4 w-4 text-white" />
                          : <Plus className="h-4 w-4 text-level-purple" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${selected ? "text-level-purple-dark" : "text-foreground"}`}>
                          {lib.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{lib.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {libraries.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {libraries.map((libId) => {
                    const lib = AVAILABLE_LIBRARIES.find((l) => l.id === libId)
                    return (
                      <Badge key={libId} className="bg-level-purple text-white border-0 px-3 py-1 flex items-center gap-1">
                        {lib?.name}
                        <button onClick={() => toggleLibrary(libId)} className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex items-center justify-between rounded-2xl border-2 border-level-purple-light bg-level-purple-subtle/50 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium text-level-purple-dark">
                {title ? `"${title}"` : "Adicione um título"}
              </p>
              <p className="text-xs text-muted-foreground">
                {libraries.length} biblioteca(s) · {xpReward} XP · {difficulty}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !title}
              className="flex items-center gap-2 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-level-purple hover:text-level-purple transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Salvar Rascunho
            </button>
            <LevelButton variant="primary" size="sm" onClick={() => handleSave(true)} disabled={saving || !title}>
              <Eye className="h-4 w-4" /> Publicar
            </LevelButton>
          </div>
        </div>
      </main>
    </div>
  )
}
