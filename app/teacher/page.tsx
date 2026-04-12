"use client"

import { useState } from "react"
import Link from "next/link"
import { LevelButton } from "@/components/design-system/level-button"
import {
  Rocket,
  Plus,
  BookOpen,
  Users,
  BarChart3,
  Search,
  MoreHorizontal,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  ChevronLeft,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Mock lessons created by this teacher
const mockLessons = [
  {
    id: "1",
    title: "Introducao a Variaveis em Python",
    module: "Python Basico",
    difficulty: "iniciante",
    published: true,
    studentsCompleted: 342,
    avgScore: 87,
    createdAt: "2024-10-15",
  },
  {
    id: "2",
    title: "Operadores Aritmeticos",
    module: "Python Basico",
    difficulty: "iniciante",
    published: true,
    studentsCompleted: 298,
    avgScore: 92,
    createdAt: "2024-10-20",
  },
  {
    id: "3",
    title: "Condicionais if/elif/else",
    module: "Python Basico",
    difficulty: "intermediario",
    published: true,
    studentsCompleted: 215,
    avgScore: 78,
    createdAt: "2024-11-01",
  },
  {
    id: "4",
    title: "Loops For e While",
    module: "Python Basico",
    difficulty: "intermediario",
    published: false,
    studentsCompleted: 0,
    avgScore: 0,
    createdAt: "2024-11-10",
  },
  {
    id: "5",
    title: "Funcoes em Python",
    module: "Python Basico",
    difficulty: "intermediario",
    published: false,
    studentsCompleted: 0,
    avgScore: 0,
    createdAt: "2024-11-15",
  },
]

// Mock student metrics
const metrics = {
  totalStudents: 487,
  activeStudents: 342,
  avgCompletionRate: 73,
  totalLessons: 5,
  publishedLessons: 3,
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "iniciante": return "bg-success/10 text-success"
    case "intermediario": return "bg-warning/10 text-warning"
    case "avancado": return "bg-destructive/10 text-destructive"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function TeacherPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all")

  const filteredLessons = mockLessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      filter === "all" ||
      (filter === "published" && lesson.published) ||
      (filter === "draft" && !lesson.published)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
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
                <p className="text-xs text-muted-foreground">Gerencie suas licoes</p>
              </div>
            </div>
          </div>

          <Link href="/teacher/edit/new">
            <LevelButton variant="primary" size="md">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Licao
              </span>
            </LevelButton>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Metrics Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                <Users className="h-5 w-5 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{metrics.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Alunos Total</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{metrics.activeStudents}</p>
                <p className="text-xs text-muted-foreground">Ativos (30 dias)</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <BarChart3 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{metrics.avgCompletionRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Conclusao</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                <FileText className="h-5 w-5 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{metrics.publishedLessons}/{metrics.totalLessons}</p>
                <p className="text-xs text-muted-foreground">Licoes Publicadas</p>
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
                placeholder="Buscar licoes..."
                className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              {(["all", "published", "draft"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-level-purple text-white"
                      : "bg-muted text-muted-foreground hover:bg-level-purple-subtle"
                  }`}
                >
                  {f === "all" ? "Todas" : f === "published" ? "Publicadas" : "Rascunhos"}
                </button>
              ))}
            </div>
          </div>

          {/* Lesson Rows */}
          <div className="divide-y divide-border">
            {filteredLessons.map((lesson) => (
              <div key={lesson.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-level-purple-light">
                  <BookOpen className="h-5 w-5 text-level-purple" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-level-purple-dark">{lesson.title}</p>
                    {lesson.published ? (
                      <Badge className="bg-success/10 text-success border-0 text-xs">Publicada</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground border-0 text-xs">Rascunho</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-muted-foreground">{lesson.module}</span>
                    <Badge className={`${getDifficultyColor(lesson.difficulty)} border-0 text-xs`}>
                      {lesson.difficulty}
                    </Badge>
                  </div>
                </div>

                {lesson.published && (
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-level-purple-dark">{lesson.studentsCompleted}</p>
                      <p className="text-xs text-muted-foreground">Alunos</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-level-purple-dark">{lesson.avgScore}%</p>
                      <p className="text-xs text-muted-foreground">Media</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Link href={`/teacher/edit/${lesson.id}`}>
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </Link>
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredLessons.length === 0 && (
              <div className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">Nenhuma licao encontrada</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
