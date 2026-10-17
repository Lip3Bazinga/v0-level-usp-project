"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { BookOpen, Code2, Database, ExternalLink, Globe, Terminal, Zap } from "lucide-react"
import { BrandLogo, BrandMark } from "@/components/design-system/brand-logo"
import { CourseCard } from "@/components/design-system/course-card"
import { LevelButton, levelButtonClasses } from "@/components/design-system/level-button"
import { LevelProgress } from "@/components/design-system/level-progress"
import { StreakCounter } from "@/components/design-system/streak-counter"
import { XPBadge } from "@/components/design-system/xp-badge"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"

const INITIAL_PROGRESS_PERCENT = 65

/** Padrão de pontos roxos discretos ao fundo do herói. */
const DOT_PATTERN_CLASS =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3QzNBRUQiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')]"

const SHOWCASE_LINKS = [
  { href: ROUTES.ide, label: "Ver IDE", variant: "outline" },
  { href: ROUTES.profile(), label: "Ver Perfil", variant: "secondary" },
  { href: ROUTES.landing, label: "Landing Page", variant: "ghost" },
  { href: ROUTES.admin, label: "Painel Admin", variant: "ghost" },
] as const

const SAMPLE_STATS = [
  { value: "50K+", label: "Estudantes ativos" },
  { value: "200+", label: "Lições interativas" },
  { value: "15", label: "Trilhas de aprendizado" },
] as const

const SAMPLE_COURSES = [
  {
    title: "Python Básico",
    description: "Aprenda os fundamentos da linguagem Python do zero ao intermediário.",
    icon: Code2,
    progress: 75,
    totalLessons: 20,
    completedLessons: 15,
    status: "in-progress",
  },
  {
    title: "Banco de Dados",
    description: "Domine SQL e aprenda a modelar dados para suas aplicações.",
    icon: Database,
    progress: 100,
    totalLessons: 15,
    completedLessons: 15,
    status: "completed",
  },
  {
    title: "Desenvolvimento Web",
    description: "Construa sites modernos com HTML, CSS e JavaScript.",
    icon: Globe,
    progress: 0,
    totalLessons: 25,
    completedLessons: 0,
    status: "locked",
  },
] as const

const PALETTE_SWATCHES = [
  { name: "LevelPurple", hex: "#7C3AED", swatchClass: "bg-level-purple" },
  { name: "LevelPurpleDark", hex: "#4C1D95", swatchClass: "bg-level-purple-dark" },
  { name: "LevelPurpleMedium", hex: "#A78BFA", swatchClass: "bg-level-purple-medium" },
  {
    name: "LevelPurpleLight",
    hex: "#F3E8FF",
    swatchClass: "border border-border bg-level-purple-light",
  },
  { name: "Background", hex: "#FFFFFF", swatchClass: "border border-border bg-white" },
] as const

function ShowcaseHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <h1 className="text-xl font-bold text-level-purple-dark">LevelUSP</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Iniciativa USP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <XPBadge type="xp" value="2,450" />
          <StreakCounter days={7} />
          <XPBadge type="level" value={12} />
        </div>
      </div>
    </header>
  )
}

function ShowcaseHero() {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-level-purple-light to-white py-16 sm:py-24">
      <div className={cn("absolute inset-0", DOT_PATTERN_CLASS, "opacity-50")} />

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
          Uma iniciativa da Universidade de São Paulo para expandir o conhecimento de computação por
          todo o Brasil. Sem custos, sem barreiras.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <LevelButton size="lg" variant="primary">
            Começar Agora
          </LevelButton>
          {SHOWCASE_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={levelButtonClasses(link.variant, "lg")}>
              <span className="flex items-center gap-2">
                {link.label}
                <ExternalLink className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 border-t border-level-purple-subtle pt-10">
          {SAMPLE_STATS.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-level-purple-dark">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

interface ShowcaseSectionProps {
  title: string
  children: ReactNode
}

function ShowcaseSection({ title, children }: ShowcaseSectionProps) {
  return (
    <div>
      <h3 className="mb-6 text-lg font-semibold text-level-purple-dark">{title}</h3>
      {children}
    </div>
  )
}

function ProgressBarsDemo() {
  const [progressPercent, setProgressPercent] = useState(INITIAL_PROGRESS_PERCENT)
  return (
    <div className="rounded-2xl border border-border bg-white p-8 space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Pequena (slim)</p>
        <LevelProgress value={progressPercent} size="sm" />
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Média</p>
        <LevelProgress value={progressPercent} size="md" />
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Grande (grossa)</p>
        <LevelProgress value={progressPercent} size="lg" hasLabel />
      </div>
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <span className="text-sm text-muted-foreground">Ajustar progresso:</span>
        <input
          type="range"
          min="0"
          max="100"
          value={progressPercent}
          onChange={(event) => setProgressPercent(Number(event.target.value))}
          className="w-48 accent-level-purple"
        />
        <span className="text-sm font-semibold text-level-purple">{progressPercent}%</span>
      </div>
    </div>
  )
}

function DesignSystemSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-level-purple-dark">Design System</h2>
          <p className="mt-4 text-muted-foreground">
            Componentes modernos e gamificados para a plataforma LevelUSP
          </p>
        </div>

        <div className="space-y-16">
          <ShowcaseSection title="Botões com Efeito 3D">
            <div className="rounded-2xl border border-border bg-white p-8">
              <div className="flex flex-wrap items-center gap-4">
                <LevelButton variant="primary" size="sm">
                  Pequeno
                </LevelButton>
                <LevelButton variant="primary" size="md">
                  Médio
                </LevelButton>
                <LevelButton variant="primary" size="lg">
                  Grande
                </LevelButton>
                <LevelButton variant="secondary" size="md">
                  Secundário
                </LevelButton>
                <LevelButton variant="outline" size="md">
                  Outline
                </LevelButton>
                <LevelButton variant="ghost" size="md">
                  Ghost
                </LevelButton>
                <LevelButton variant="primary" size="md" disabled>
                  Desabilitado
                </LevelButton>
              </div>
            </div>
          </ShowcaseSection>

          <ShowcaseSection title="Barras de Progresso">
            <ProgressBarsDemo />
          </ShowcaseSection>

          <ShowcaseSection title="Badges de Gamificação">
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
          </ShowcaseSection>

          <ShowcaseSection title="Cards de Curso">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {SAMPLE_COURSES.map(({ icon: Icon, ...course }) => (
                <CourseCard key={course.title} {...course} icon={<Icon className="h-7 w-7" />} />
              ))}
            </div>
          </ShowcaseSection>

          <ShowcaseSection title="Tipografia">
            <div className="rounded-2xl border border-border bg-white p-8 space-y-6">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fonte: Inter
                </span>
              </div>
              <h1 className="text-4xl font-bold text-level-purple-dark">Heading 1 - LevelUSP</h1>
              <h2 className="text-3xl font-bold text-level-purple-dark">
                Heading 2 - Aprenda a programar
              </h2>
              <h3 className="text-2xl font-semibold text-level-purple-dark">
                Heading 3 - Python Básico
              </h3>
              <h4 className="text-xl font-semibold text-foreground">
                Heading 4 - Variáveis e Tipos
              </h4>
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
          </ShowcaseSection>

          <ShowcaseSection title="Paleta de Cores">
            <div className="rounded-2xl border border-border bg-white p-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {PALETTE_SWATCHES.map((swatch) => (
                  <div key={swatch.name} className="space-y-2">
                    <div className={cn("h-20 rounded-xl shadow-sm", swatch.swatchClass)} />
                    <p className="text-xs font-medium">{swatch.name}</p>
                    <p className="text-xs text-muted-foreground">{swatch.hex}</p>
                  </div>
                ))}
              </div>
            </div>
          </ShowcaseSection>
        </div>
      </div>
    </section>
  )
}

function ShowcaseCallToAction() {
  return (
    <section className="bg-level-purple py-16">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Pronto para começar sua jornada?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-level-purple-light">
          Junte-se a milhares de brasileiros que estão aprendendo programação gratuitamente.
        </p>
        <div className="mt-8">
          <Link
            href={ROUTES.ide}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-level-purple transition-all hover:bg-level-purple-light hover:shadow-lg"
          >
            <Terminal className="h-5 w-5" />
            Acessar IDE
          </Link>
        </div>
      </div>
    </section>
  )
}

function ShowcaseFooter() {
  return (
    <footer className="border-t border-border bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <BrandLogo size="sm" className="gap-3" markClassName="rounded-lg" wordmarkClassName="text-base" />
          <p className="text-sm text-muted-foreground">
            Uma iniciativa da Universidade de São Paulo para a democratização do ensino de
            programação.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            100% Gratuito
          </div>
        </div>
      </div>
    </footer>
  )
}

/** Vitrine do design system: todos os componentes base em uma página. */
export default function DesignSystemShowcasePage() {
  return (
    <div className="min-h-screen bg-background">
      <ShowcaseHeader />
      <ShowcaseHero />
      <DesignSystemSection />
      <ShowcaseCallToAction />
      <ShowcaseFooter />
    </div>
  )
}
