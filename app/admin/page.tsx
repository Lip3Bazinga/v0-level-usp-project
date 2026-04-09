"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  GripVertical,
  BookOpen,
  Code2,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  X,
  FileText,
  Play
} from "lucide-react"
import { LevelButton } from "@/components/design-system/level-button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Available libraries for Python lessons
const AVAILABLE_LIBRARIES = [
  { id: "pandas", name: "Pandas", description: "Manipulacao de dados" },
  { id: "numpy", name: "NumPy", description: "Computacao numerica" },
  { id: "matplotlib", name: "Matplotlib", description: "Visualizacao de dados" },
  { id: "seaborn", name: "Seaborn", description: "Visualizacao estatistica" },
  { id: "scikit-learn", name: "Scikit-learn", description: "Machine Learning" },
  { id: "scipy", name: "SciPy", description: "Computacao cientifica" },
  { id: "requests", name: "Requests", description: "HTTP requests" },
  { id: "beautifulsoup4", name: "BeautifulSoup", description: "Web scraping" },
]

export default function AdminPage() {
  // Lesson form state
  const [lessonTitle, setLessonTitle] = useState("")
  const [lessonOrder, setLessonOrder] = useState(1)
  const [lessonContent, setLessonContent] = useState(`## Introducao

Escreva aqui o conteudo da licao em **Markdown**.

### Objetivos
- Objetivo 1
- Objetivo 2

### Conceitos
Explique os conceitos principais...

\`\`\`python
# Exemplo de codigo
print("Hello, World!")
\`\`\`
`)
  const [lessonModule, setLessonModule] = useState("python-basico")
  const [lessonDifficulty, setLessonDifficulty] = useState("iniciante")

  // Challenge form state
  const [starterCode, setStarterCode] = useState(`# Escreva sua solucao aqui
def soma(a, b):
    # Implemente a funcao
    pass

# Teste sua funcao
resultado = soma(2, 3)
print(f"Resultado: {resultado}")
`)
  const [hiddenTests, setHiddenTests] = useState(`import unittest

class TestSoma(unittest.TestCase):
    def test_soma_positivos(self):
        self.assertEqual(soma(2, 3), 5)
    
    def test_soma_negativos(self):
        self.assertEqual(soma(-1, -1), -2)
    
    def test_soma_zero(self):
        self.assertEqual(soma(0, 0), 0)

if __name__ == '__main__':
    unittest.main()
`)
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>(["numpy"])
  const [xpReward, setXpReward] = useState(50)
  const [timeLimit, setTimeLimit] = useState(300)

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const toggleLibrary = (libId: string) => {
    setSelectedLibraries(prev => 
      prev.includes(libId) 
        ? prev.filter(id => id !== libId)
        : [...prev, libId]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSaving(false)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-level-purple transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Voltar</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-level-purple-dark">Painel do Professor</h1>
                <p className="text-xs text-muted-foreground">Criar Nova Licao</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 rounded-xl border-2 border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-level-purple hover:text-level-purple transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Visualizar licao</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <LevelButton 
              variant="primary" 
              size="md"
              onClick={handleSave}
              disabled={isSaving || !lessonTitle}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Salvando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Licao
                </span>
              )}
            </LevelButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          
          {/* Left Column - Lesson Form */}
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                  <FileText className="h-5 w-5 text-level-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-level-purple-dark">Criar Nova Licao</h2>
                  <p className="text-sm text-muted-foreground">Defina o conteudo educativo</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-level-purple-dark">
                    Titulo da Licao <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="Ex: Introducao a Variaveis em Python"
                    className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                  />
                </div>

                {/* Order and Module Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-level-purple-dark">
                      Ordem
                    </label>
                    <input
                      type="number"
                      value={lessonOrder}
                      onChange={(e) => setLessonOrder(parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-foreground focus:border-level-purple focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-level-purple-dark">
                      Modulo
                    </label>
                    <Select value={lessonModule} onValueChange={setLessonModule}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-border focus:border-level-purple focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python-basico">Python Basico</SelectItem>
                        <SelectItem value="python-intermediario">Python Intermediario</SelectItem>
                        <SelectItem value="ciencia-dados">Ciencia de Dados</SelectItem>
                        <SelectItem value="machine-learning">Machine Learning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-level-purple-dark">
                    Dificuldade
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "iniciante", label: "Iniciante", color: "bg-success" },
                      { value: "intermediario", label: "Intermediario", color: "bg-warning" },
                      { value: "avancado", label: "Avancado", color: "bg-destructive" },
                    ].map((diff) => (
                      <button
                        key={diff.value}
                        onClick={() => setLessonDifficulty(diff.value)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                          lessonDifficulty === diff.value
                            ? "bg-level-purple text-white"
                            : "bg-level-purple-subtle text-level-purple-dark hover:bg-level-purple-light"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${diff.color}`} />
                        {diff.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Markdown Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-level-purple-dark">
                      Conteudo em Markdown
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-level-purple-light text-level-purple-dark border-0 text-xs">
                        Markdown
                      </Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Use Markdown para formatar: **negrito**, *italico*, # titulos, ```codigo```</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <textarea
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                    rows={16}
                    className="w-full rounded-xl border-2 border-border bg-level-purple-subtle/30 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Challenge Configuration */}
          <div className="space-y-6">
            {/* Starter Code */}
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                    <Code2 className="h-5 w-5 text-level-purple" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-level-purple-dark">Desafio Pratico</h2>
                    <p className="text-sm text-muted-foreground">Codigo inicial para o aluno</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 rounded-xl bg-level-purple-subtle px-3 py-2 text-sm font-medium text-level-purple hover:bg-level-purple-light transition-colors">
                  <Play className="h-4 w-4" />
                  Testar
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-level-purple-dark">
                    Codigo Inicial (Starter Code)
                  </label>
                  <div className="overflow-hidden rounded-xl border-2 border-border">
                    <div className="flex items-center justify-between bg-editor-bg px-4 py-2">
                      <span className="text-xs font-medium text-gray-400">main.py</span>
                      <Badge className="bg-level-purple/20 text-level-purple-medium border-0 text-xs">
                        Python
                      </Badge>
                    </div>
                    <textarea
                      value={starterCode}
                      onChange={(e) => setStarterCode(e.target.value)}
                      rows={10}
                      className="w-full border-0 bg-editor-bg px-4 py-3 font-mono text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* XP and Time Limit Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-level-purple-dark">
                      Recompensa XP
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={xpReward}
                        onChange={(e) => setXpReward(parseInt(e.target.value) || 0)}
                        min={0}
                        step={10}
                        className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 pr-12 text-foreground focus:border-level-purple focus:outline-none transition-colors"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-level-purple">
                        XP
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-level-purple-dark">
                      Tempo Limite
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                        min={0}
                        step={30}
                        className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 pr-12 text-foreground focus:border-level-purple focus:outline-none transition-colors"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                        seg
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden Tests */}
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                  <FlaskConical className="h-5 w-5 text-level-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-level-purple-dark">Testes Unitarios</h2>
                  <p className="text-sm text-muted-foreground">Script de validacao oculto</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="text-sm text-warning">Os testes sao ocultos para o aluno</span>
                </div>

                <div className="overflow-hidden rounded-xl border-2 border-border">
                  <div className="flex items-center justify-between bg-editor-bg px-4 py-2">
                    <span className="text-xs font-medium text-gray-400">test_solution.py</span>
                    <Badge className="bg-success/20 text-success border-0 text-xs">
                      unittest
                    </Badge>
                  </div>
                  <textarea
                    value={hiddenTests}
                    onChange={(e) => setHiddenTests(e.target.value)}
                    rows={12}
                    className="w-full border-0 bg-editor-bg px-4 py-3 font-mono text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Libraries Selection */}
            <div className="rounded-2xl border-2 border-border bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                  <Plus className="h-5 w-5 text-level-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-level-purple-dark">Bibliotecas</h2>
                  <p className="text-sm text-muted-foreground">Selecione as bibliotecas disponiveis</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_LIBRARIES.map((lib) => {
                  const isSelected = selectedLibraries.includes(lib.id)
                  return (
                    <button
                      key={lib.id}
                      onClick={() => toggleLibrary(lib.id)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                        isSelected
                          ? "border-level-purple bg-level-purple-light"
                          : "border-border bg-white hover:border-level-purple-medium hover:bg-level-purple-subtle"
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isSelected ? "bg-level-purple" : "bg-level-purple-subtle"
                      }`}>
                        {isSelected ? (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        ) : (
                          <Plus className="h-4 w-4 text-level-purple" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isSelected ? "text-level-purple-dark" : "text-foreground"
                        }`}>
                          {lib.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lib.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {selectedLibraries.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedLibraries.map((libId) => {
                    const lib = AVAILABLE_LIBRARIES.find(l => l.id === libId)
                    return (
                      <Badge 
                        key={libId}
                        className="bg-level-purple text-white border-0 px-3 py-1 flex items-center gap-1"
                      >
                        {lib?.name}
                        <button 
                          onClick={() => toggleLibrary(libId)}
                          className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        >
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
              <p className="text-sm font-medium text-level-purple-dark">Pronto para salvar</p>
              <p className="text-xs text-muted-foreground">
                {lessonTitle ? `"${lessonTitle}"` : "Adicione um titulo"} - {selectedLibraries.length} bibliotecas selecionadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LevelButton variant="outline" size="sm">
              Salvar Rascunho
            </LevelButton>
            <LevelButton 
              variant="primary" 
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !lessonTitle}
            >
              Publicar Licao
            </LevelButton>
          </div>
        </div>
      </main>
    </div>
  )
}
