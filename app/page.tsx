"use client"

import { useState } from "react"
import Link from "next/link"
import { LevelButton } from "@/components/design-system/level-button"
import { LevelProgress } from "@/components/design-system/level-progress"
import { CourseCard } from "@/components/design-system/course-card"
import { XPBadge } from "@/components/design-system/xp-badge"
import { StreakCounter } from "@/components/design-system/streak-counter"
import { Code2, Database, Globe, Rocket, Terminal, BookOpen, ExternalLink, Zap, Trophy, Flame } from "lucide-react"

export default function DesignSystemShowcase() {
  const [progress, setProgress] = useState(65)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-level-purple-dark">LevelUSP</h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Iniciativa USP
              </p>
            </div>
          </div>

          {/* Gamification Stats */}
          <div className="flex items-center gap-3">
            <XPBadge type="xp" value="2,450" />
            <StreakCounter days={7} />
            <XPBadge type="level" value={12} />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-level-purple-light to-white py-16 sm:py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3QzNBRUQiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-level-purple-subtle px-4 py-2 text-sm font-medium text-level-purple-dark mb-6">
            <Zap className="h-4 w-4 text-level-purple" />
            100% Gratuito
          </div>
          
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-level-purple-dark sm:text-5xl lg:text-6xl text-balance">
            Aprenda programação de forma
            <span className="text-level-purple"> gamificada</span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
            Uma iniciativa da Universidade de São Paulo para expandir o conhecimento 
            de computação por todo o Brasil. Sem custos, sem barreiras.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <LevelButton size="lg" variant="primary">
              Começar Agora
            </LevelButton>
            <Link href="/ide">
              <LevelButton size="lg" variant="outline">
                <span className="flex items-center gap-2">
                  Ver IDE
                  <ExternalLink className="h-4 w-4" />
                </span>
              </LevelButton>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-level-purple-subtle pt-10">
            <div>
              <div className="text-3xl font-bold text-level-purple-dark">50K+</div>
              <div className="text-sm text-muted-foreground">Estudantes ativos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-level-purple-dark">200+</div>
              <div className="text-sm text-muted-foreground">Lições interativas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-level-purple-dark">15</div>
              <div className="text-sm text-muted-foreground">Trilhas de aprendizado</div>
            </div>
          </div>
        </div>
      </section>

      {/* Design System Showcase */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-level-purple-dark">Design System</h2>
            <p className="mt-4 text-muted-foreground">
              Componentes modernos e gamificados para a plataforma LevelUSP
            </p>
          </div>

          {/* Buttons Section */}
          <div className="mb-16">
            <h3 className="mb-6 text-lg font-semibold text-level-purple-dark">
              Botões com Efeito 3D
            </h3>
            <div className="rounded-2xl border border-border bg-white p-8">
              <div className="flex flex-wrap items-center gap-4">
                <LevelButton variant="primary" size="sm">Pequeno</LevelButton>
                <LevelButton variant="primary" size="md">Médio</LevelButton>
                <LevelButton variant="primary" size="lg">Grande</LevelButton>
                <LevelButton variant="secondary" size="md">Secundário</LevelButton>
                <LevelButton variant="outline" size="md">Outline</LevelButton>
                <LevelButton variant="ghost" size="md">Ghost</LevelButton>
                <LevelButton variant="primary" size="md" disabled>Desabilitado</LevelButton>
              </div>
            </div>
          </div>

          {/* Progress Bars Section */}
          <div className="mb-16">
            <h3 className="mb-6 text-lg font-semibold text-level-purple-dark">
              Barras de Progresso
            </h3>
            <div className="rounded-2xl border border-border bg-white p-8 space-y-8">
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">Pequena (slim)</p>
                <LevelProgress value={progress} size="sm" />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">Média</p>
                <LevelProgress value={progress} size="md" />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">Grande (grossa)</p>
                <LevelProgress value={progress} size="lg" showLabel />
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">Ajustar progresso:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-48 accent-level-purple"
                />
                <span className="text-sm font-semibold text-level-purple">{progress}%</span>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          <div className="mb-16">
            <h3 className="mb-6 text-lg font-semibold text-level-purple-dark">
              Badges de Gamificação
            </h3>
            <div className="rounded-2xl border border-border bg-white p-8">
              <div className="flex flex-wrap items-center gap-4">
                <XPBadge type="xp" value="1,250" size="sm" />
                <XPBadge type="xp" value="2,450" size="md" />
                <XPBadge type="xp" value="5,000" size="lg" />
                <XPBadge type="streak" value={7} label="dias" size="md" />
                <XPBadge type="level" value={12} size="md" />
                <XPBadge type="achievement" value="!" size="md" />
                <StreakCounter days={7} />
              </div>
            </div>
          </div>

          {/* Course Cards Section */}
          <div className="mb-16">
            <h3 className="mb-6 text-lg font-semibold text-level-purple-dark">
              Cards de Curso
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <CourseCard
                title="Python Básico"
                description="Aprenda os fundamentos da linguagem Python do zero ao intermediário."
                icon={<Code2 className="h-7 w-7" />}
                progress={75}
                totalLessons={20}
                completedLessons={15}
                status="in-progress"
              />
              <CourseCard
                title="Banco de Dados"
                description="Domine SQL e aprenda a modelar dados para suas aplicações."
                icon={<Database className="h-7 w-7" />}
                progress={100}
                totalLessons={15}
                completedLessons={15}
                status="completed"
              />
              <CourseCard
                title="Desenvolvimento Web"
                description="Construa sites modernos com HTML, CSS e JavaScript."
                icon={<Globe className="h-7 w-7" />}
                progress={0}
                totalLessons={25}
                completedLessons={0}
                status="locked"
              />
            </div>
          </div>

          {/* Typography Section */}
          <div className="mb-16">
            <h3 className="mb-6 text-lg font-semibold text-level-purple-dark">
              Tipografia
            </h3>
            <div className="rounded-2xl border border-border bg-white p-8 space-y-6">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fonte: Inter</span>
              </div>
              <h1 className="text-4xl font-bold text-level-purple-dark">Heading 1 - LevelUSP</h1>
              <h2 className="text-3xl font-bold text-level-purple-dark">Heading 2 - Aprenda a programar</h2>
              <h3 className="text-2xl font-semibold text-level-purple-dark">Heading 3 - Python Básico</h3>
              <h4 className="text-xl font-semibold text-foreground">Heading 4 - Variáveis e Tipos</h4>
              <p className="text-base text-foreground">
                Parágrafo normal - Esta é uma plataforma gratuita de ensino de programação, 
                desenvolvida pela Universidade de São Paulo.
              </p>
              <p className="text-sm text-muted-foreground">
                Texto secundário - Aprenda no seu ritmo, com exercícios práticos e gamificação.
              </p>
              <code className="inline-block rounded-lg bg-level-purple-subtle px-3 py-1 font-mono text-sm text-level-purple-dark">
                print(&quot;Hello, World!&quot;)
              </code>
            </div>
          </div>

          {/* Colors Section */}
          <div>
            <h3 className="mb-6 text-lg font-semibold text-level-purple-dark">
              Paleta de Cores
            </h3>
            <div className="rounded-2xl border border-border bg-white p-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                <div className="space-y-2">
                  <div className="h-20 rounded-xl bg-level-purple shadow-sm" />
                  <p className="text-xs font-medium">LevelPurple</p>
                  <p className="text-xs text-muted-foreground">#7C3AED</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-xl bg-level-purple-dark shadow-sm" />
                  <p className="text-xs font-medium">LevelPurpleDark</p>
                  <p className="text-xs text-muted-foreground">#4C1D95</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-xl bg-level-purple-medium shadow-sm" />
                  <p className="text-xs font-medium">LevelPurpleMedium</p>
                  <p className="text-xs text-muted-foreground">#A78BFA</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-xl border border-border bg-level-purple-light shadow-sm" />
                  <p className="text-xs font-medium">LevelPurpleLight</p>
                  <p className="text-xs text-muted-foreground">#F3E8FF</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-xl border border-border bg-white shadow-sm" />
                  <p className="text-xs font-medium">Background</p>
                  <p className="text-xs text-muted-foreground">#FFFFFF</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-level-purple py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Pronto para começar sua jornada?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-level-purple-light">
            Junte-se a milhares de brasileiros que estão aprendendo programação gratuitamente.
          </p>
          <div className="mt-8">
            <Link href="/ide">
              <button className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-level-purple transition-all hover:bg-level-purple-light hover:shadow-lg">
                <Terminal className="h-5 w-5" />
                Acessar IDE
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-level-purple">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-level-purple-dark">LevelUSP</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Uma iniciativa da Universidade de São Paulo para a democratização do ensino de programação.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              100% Gratuito
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
