"use client"

import type { ReactNode } from "react"
import { ArrowLeft, ArrowRight, Home, type LucideIcon } from "lucide-react"
import type { Lesson } from "@levelusp/contracts"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LessonNavigation } from "@/hooks/use-lesson-navigation"

interface ReadingLessonShellProps {
  lesson: Pick<Lesson, "title" | "module">
  navigation: LessonNavigation
  /** Ícone ao lado do título no cabeçalho (livro na teoria, interrogação no questionário). */
  icon: LucideIcon
  /** Linha abaixo do título: dificuldade, XP, tipo da lição. */
  subtitle: ReactNode
  /** Ação principal acima de anterior/próxima (concluir, enviar respostas...). */
  primaryAction: ReactNode
  /** Modais renderizados por cima da página (ex.: feedback de sucesso). */
  overlay?: ReactNode
  children: ReactNode
}

/** Moldura das lições sem IDE (teoria e questionário): cabeçalho, artigo rolável e navegação. */
export function ReadingLessonShell({
  lesson,
  navigation,
  icon: Icon,
  subtitle,
  primaryAction,
  overlay,
  children,
}: ReadingLessonShellProps): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={navigation.goToExit}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple"
        >
          <Home className="h-3.5 w-3.5" />
          Curso
        </button>
        <span className="text-muted-foreground/40">/</span>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-level-purple" />
          <span className="max-w-xs truncate text-sm font-semibold text-level-purple-dark">{lesson.title}</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {navigation.positionInCourse + 1} / {navigation.courseLessonCount}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 justify-center">
        <ScrollArea className="h-full w-full max-w-3xl">
          <article className="px-6 py-8 md:px-12">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-level-purple">{lesson.module}</p>
            <h1 className="mb-2 text-2xl font-bold leading-tight text-level-purple-dark">{lesson.title}</h1>
            <p className="mb-8 text-xs text-gray-400">{subtitle}</p>

            {children}

            <div className="mt-10 flex flex-col gap-3 border-t border-gray-100 pt-8">
              {primaryAction}
              <LessonStepButtons navigation={navigation} />
            </div>
          </article>
        </ScrollArea>
      </div>

      {overlay}
    </div>
  )
}

function LessonStepButtons({ navigation }: { navigation: LessonNavigation }): React.JSX.Element {
  const { hasPreviousLesson, hasNextLesson, isCourseEnd, goToPrevious, goToNext } = navigation
  return (
    <div className="flex gap-3">
      {hasPreviousLesson && (
        <button
          onClick={goToPrevious}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" /> Anterior
        </button>
      )}
      {(hasNextLesson || isCourseEnd) && (
        <button
          onClick={goToNext}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-level-purple py-2.5 text-sm font-medium text-level-purple transition-colors hover:bg-level-purple-light"
        >
          {isCourseEnd ? "Ver certificado" : "Próxima"}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
