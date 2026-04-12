"use client"

import { useState } from "react"
import Link from "next/link"
import { LevelButton } from "@/components/design-system/level-button"
import { LevelProgress } from "@/components/design-system/level-progress"
import { XPBadge } from "@/components/design-system/xp-badge"
import { StreakCounter } from "@/components/design-system/streak-counter"
import {
  Rocket,
  Lock,
  CheckCircle2,
  Play,
  Star,
  Trophy,
  Zap,
  User,
  BarChart3,
  Settings,
  BookOpen,
  Code2,
  Database,
  Globe,
  Brain,
  ChevronRight,
  Flame,
} from "lucide-react"

// Mock lesson map data - Duolingo style path
const modules = [
  {
    id: "python-basico",
    title: "Python Basico",
    icon: Code2,
    color: "bg-level-purple",
    lessons: [
      { id: "1", title: "Variaveis e Tipos", status: "completed" as const, xp: 50 },
      { id: "2", title: "Operadores", status: "completed" as const, xp: 50 },
      { id: "3", title: "Condicionais", status: "completed" as const, xp: 75 },
      { id: "4", title: "Loops", status: "in-progress" as const, xp: 75 },
      { id: "5", title: "Funcoes", status: "locked" as const, xp: 100 },
      { id: "6", title: "Listas e Tuplas", status: "locked" as const, xp: 100 },
    ],
  },
  {
    id: "python-intermediario",
    title: "Python Intermediario",
    icon: Brain,
    color: "bg-warning",
    lessons: [
      { id: "7", title: "Dicionarios", status: "locked" as const, xp: 100 },
      { id: "8", title: "Manipulacao de Strings", status: "locked" as const, xp: 100 },
      { id: "9", title: "Arquivos", status: "locked" as const, xp: 125 },
      { id: "10", title: "Classes e Objetos", status: "locked" as const, xp: 150 },
      { id: "11", title: "Heranca", status: "locked" as const, xp: 150 },
      { id: "12", title: "Modulos e Pacotes", status: "locked" as const, xp: 125 },
    ],
  },
  {
    id: "ciencia-dados",
    title: "Ciencia de Dados",
    icon: Database,
    color: "bg-success",
    lessons: [
      { id: "13", title: "Intro ao Pandas", status: "locked" as const, xp: 150 },
      { id: "14", title: "DataFrames", status: "locked" as const, xp: 150 },
      { id: "15", title: "Visualizacao", status: "locked" as const, xp: 175 },
      { id: "16", title: "Analise Exploratoria", status: "locked" as const, xp: 200 },
    ],
  },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-level-purple-dark">LevelUSP</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-level-purple">
              <BookOpen className="h-4 w-4" />
              Aprender
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <Trophy className="h-4 w-4" />
              Ranking
            </Link>
            <Link href="/perfil/me" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <User className="h-4 w-4" />
              Perfil
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <XPBadge type="xp" value="2,450" size="sm" />
            <StreakCounter days={7} />
            <XPBadge type="level" value={12} size="sm" />
            <Link href="/settings">
              <button className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-level-purple to-level-purple-dark p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Ola! Continue aprendendo</h1>
              <p className="mt-1 text-purple-200">Voce esta no nivel 12. Continue assim!</p>
              <div className="mt-4">
                <LevelProgress value={65} size="md" />
                <p className="mt-2 text-sm text-purple-200">2,450 / 3,000 XP para o Nivel 13</p>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-center gap-2">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Flame className="h-10 w-10 text-orange-300" />
              </div>
              <span className="text-sm font-bold">7 dias</span>
            </div>
          </div>
        </div>

        {/* Lesson Map - Duolingo Style */}
        <div className="space-y-12">
          {modules.map((module, moduleIndex) => (
            <div key={module.id}>
              {/* Module Header */}
              <div className="mb-6 flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${module.color}`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-level-purple-dark">{module.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {module.lessons.filter((l) => l.status === "completed").length}/{module.lessons.length} licoes completas
                  </p>
                </div>
              </div>

              {/* Lesson Path - Zigzag Pattern */}
              <div className="relative flex flex-col items-center gap-4">
                {module.lessons.map((lesson, index) => {
                  const isLeft = index % 2 === 0
                  const isCompleted = lesson.status === "completed"
                  const isInProgress = lesson.status === "in-progress"
                  const isLocked = lesson.status === "locked"

                  return (
                    <div
                      key={lesson.id}
                      className={`flex w-full max-w-sm items-center gap-4 ${
                        isLeft ? "self-start ml-4 md:ml-16" : "self-end mr-4 md:mr-16"
                      }`}
                    >
                      {/* Connector line */}
                      {index > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: `${index * 76 - 16}px` }}>
                          <div className={`h-4 w-0.5 ${isCompleted || isInProgress ? "bg-level-purple" : "bg-border"}`} />
                        </div>
                      )}

                      {/* Lesson Node */}
                      <Link
                        href={isLocked ? "#" : `/lesson/${lesson.id}`}
                        className={`group flex w-full items-center gap-4 rounded-2xl border-2 p-4 transition-all ${
                          isCompleted
                            ? "border-success bg-success/5 hover:bg-success/10"
                            : isInProgress
                            ? "border-level-purple bg-level-purple-light hover:bg-level-purple-subtle animate-pulse-slow"
                            : "border-border bg-muted/30 cursor-not-allowed opacity-60"
                        }`}
                      >
                        {/* Status Icon */}
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                            isCompleted
                              ? "bg-success"
                              : isInProgress
                              ? "bg-level-purple"
                              : "bg-muted"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-6 w-6 text-white" />
                          ) : isInProgress ? (
                            <Play className="h-6 w-6 text-white" />
                          ) : (
                            <Lock className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        {/* Lesson Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${
                            isLocked ? "text-muted-foreground" : "text-level-purple-dark"
                          }`}>
                            {lesson.title}
                          </p>
                          <p className="text-xs text-muted-foreground">+{lesson.xp} XP</p>
                        </div>

                        {/* Action */}
                        {isInProgress && (
                          <ChevronRight className="h-5 w-5 text-level-purple transition-transform group-hover:translate-x-1" />
                        )}
                        {isCompleted && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          </div>
                        )}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden">
        <div className="flex items-center justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 px-4 py-2 text-level-purple">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-medium">Aprender</span>
          </Link>
          <Link href="/leaderboard" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <Trophy className="h-5 w-5" />
            <span className="text-xs font-medium">Ranking</span>
          </Link>
          <Link href="/perfil/me" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <User className="h-5 w-5" />
            <span className="text-xs font-medium">Perfil</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <Settings className="h-5 w-5" />
            <span className="text-xs font-medium">Config</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
