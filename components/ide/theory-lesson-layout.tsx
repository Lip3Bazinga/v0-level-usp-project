"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen, CheckCircle2, Circle, ChevronDown, ChevronUp,
  ArrowLeft, ArrowRight, Home,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Lesson } from "@/lib/supabase/types"
import { SuccessFeedback } from "@/components/ide/success-feedback"

function isHtmlContent(text: string): boolean {
  return /^\s*<[a-zA-Z]/.test(text.trim())
}

interface TheoryLessonLayoutProps {
  lesson: Lesson
  allLessons: Lesson[]
  currentIndex: number
  onComplete?: () => void
}

export function TheoryLessonLayout({ lesson, allLessons, currentIndex, onComplete }: TheoryLessonLayoutProps) {
  const router = useRouter()
  const [read, setRead] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const courseLessons = allLessons.filter((l) => l.course_id === lesson.course_id)
  const courseIndex = courseLessons.findIndex((l) => l.id === lesson.id)
  const courseTotal = courseLessons.length || 1

  const nextLesson = allLessons[currentIndex + 1]
  const hasNextLesson = !!nextLesson && nextLesson.course_id === lesson.course_id
  const isCourseEnd = !hasNextLesson && !!lesson.course_id

  const handleNext = useCallback(() => {
    setShowSuccess(false)
    const next = allLessons[currentIndex + 1]
    if (next && next.course_id === lesson.course_id) {
      router.push(`/lesson/${next.id}`)
    } else if (lesson.course_id) {
      router.push(`/cursos/${lesson.course_id}`)
    } else {
      router.push("/dashboard")
    }
  }, [allLessons, currentIndex, lesson.course_id, router])

  const handlePrev = useCallback(() => {
    const prev = allLessons[currentIndex - 1]
    if (prev && prev.course_id === lesson.course_id) router.push(`/lesson/${prev.id}`)
  }, [allLessons, currentIndex, lesson.course_id, router])

  const handleMarkDone = () => {
    setRead(true)
    onComplete?.()
    setShowSuccess(true)
  }

  const htmlContent = isHtmlContent(lesson.content_markdown)

  const prevInCourse = currentIndex > 0 && allLessons[currentIndex - 1]?.course_id === lesson.course_id

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
        <button
          onClick={() => lesson.course_id ? router.push(`/cursos/${lesson.course_id}`) : router.push("/dashboard")}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          Curso
        </button>
        <span className="text-muted-foreground/40">/</span>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-level-purple" />
          <span className="text-sm font-semibold text-level-purple-dark truncate max-w-xs">{lesson.title}</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {courseIndex >= 0 ? courseIndex + 1 : currentIndex + 1} / {courseTotal}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 min-h-0 justify-center">
        <ScrollArea className="h-full w-full max-w-3xl">
          <article className="px-6 py-8 md:px-12">
            {/* Breadcrumb */}
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-level-purple">
              {lesson.module}
            </p>
            <h1 className="mb-2 text-2xl font-bold text-level-purple-dark leading-tight">{lesson.title}</h1>
            <p className="mb-8 text-xs text-gray-400">
              Dificuldade: {lesson.difficulty} · +{lesson.xp_reward} XP · Leitura
            </p>

            {/* Teoria */}
            {htmlContent ? (
              <div
                className="prose-lesson"
                dangerouslySetInnerHTML={{ __html: lesson.content_markdown }}
              />
            ) : (
              <div className="prose-lesson">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ children, className }) {
                      const isBlock = className?.startsWith("language-")
                      if (isBlock) {
                        return (
                          <div className="relative my-3 overflow-hidden rounded-lg">
                            <pre className="overflow-x-auto bg-[#1e1e1e] p-4 text-xs text-gray-200 leading-relaxed">
                              <code>{children}</code>
                            </pre>
                          </div>
                        )
                      }
                      return (
                        <code className="rounded bg-level-purple-subtle px-1.5 py-0.5 font-mono text-[11px] text-level-purple-dark">
                          {children}
                        </code>
                      )
                    },
                  }}
                >
                  {lesson.content_markdown}
                </ReactMarkdown>
              </div>
            )}

            {/* Checkpoints (somente leitura, sem IDE) */}
            {lesson.checkpoints?.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-sm font-bold text-level-purple-dark">Pontos-chave</h3>
                <div className="space-y-2">
                  {lesson.checkpoints.map((cp) => (
                    <div key={cp.id} className="flex items-start gap-3 rounded-xl border-2 border-gray-200 bg-gray-50 p-3">
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div className="prose-lesson text-sm flex-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cp.instruction}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-10 flex flex-col gap-3 border-t border-gray-100 pt-8">
              {!read ? (
                <button
                  onClick={handleMarkDone}
                  className="btn-3d w-full rounded-xl bg-level-purple py-3 text-sm font-semibold text-white hover:bg-level-purple-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Marcar como lida e continuar
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm font-semibold text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Lição concluída!
                </div>
              )}

              <div className="flex gap-3">
                {prevInCourse && (
                  <button
                    onClick={handlePrev}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> Anterior
                  </button>
                )}
                {(hasNextLesson || isCourseEnd) && (
                  <button
                    onClick={handleNext}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-level-purple py-2.5 text-sm font-medium text-level-purple hover:bg-level-purple-light transition-colors"
                  >
                    {isCourseEnd ? "Ver certificado" : "Próxima"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </article>
        </ScrollArea>
      </div>

      <SuccessFeedback
        show={showSuccess}
        xpEarned={lesson.xp_reward}
        hasNextLesson={hasNextLesson}
        isCourseEnd={isCourseEnd}
        onClose={() => setShowSuccess(false)}
        onNext={handleNext}
      />
    </div>
  )
}
