"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Home,
  Loader2, HelpCircle, RotateCcw, AlertCircle,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Lesson } from "@/lib/types"
import type { LessonSummary } from "@/lib/supabase/lessons"
import { SuccessFeedback } from "@/components/ide/success-feedback"
import { LessonContentPreview } from "@/components/editor/lesson-content-preview"
import { useProgress } from "@/contexts/progress-context"
import {
  fetchQuizForStudent,
  submitQuiz,
  type QuizQuestionPublic,
  type QuizResult,
} from "@/lib/supabase/lesson-quiz"

interface QuizLessonLayoutProps {
  lesson: Lesson
  allLessons: LessonSummary[]
  currentIndex: number
}

const LETTERS = "ABCDEFGHIJ"

export function QuizLessonLayout({ lesson, allLessons, currentIndex }: QuizLessonLayoutProps) {
  const router = useRouter()
  const { markCompleted, isCompleted } = useProgress()

  const [questions, setQuestions] = useState<QuizQuestionPublic[]>([])
  const [passingScore, setPassingScore] = useState(lesson.quiz_passing_score ?? 70)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const alreadyDone = isCompleted(lesson.id)

  const courseLessons = allLessons.filter((l) => l.course_id === lesson.course_id)
  const courseIndex = courseLessons.findIndex((l) => l.id === lesson.id)
  const courseTotal = courseLessons.length || 1

  const nextLesson = allLessons[currentIndex + 1]
  const hasNextLesson = !!nextLesson && nextLesson.course_id === lesson.course_id
  const isCourseEnd = !hasNextLesson && !!lesson.course_id
  const prevInCourse = currentIndex > 0 && allLessons[currentIndex - 1]?.course_id === lesson.course_id

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const res = await fetchQuizForStudent(lesson.id)
      if (cancelled) return
      if (res.ok) {
        setQuestions(res.questions)
        setPassingScore(res.passingScore)
        setError(null)
      } else {
        setError(res.error)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [lesson.id])

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

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined)

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return
    setSubmitting(true)
    setError(null)
    // A correção é feita no servidor: o gabarito nunca chega ao navegador.
    const res = await submitQuiz(lesson.id, answers)
    if (!res.ok) {
      setError(res.error)
      setSubmitting(false)
      return
    }
    setResult(res.result)
    setSubmitting(false)
    if (res.result.passed && !alreadyDone) {
      try {
        await markCompleted(lesson.id, res.result.xpEarned)
      } catch { /* crédito de XP não deve quebrar o resultado exibido */ }
      setShowSuccess(true)
    }
  }

  const handleRetry = () => {
    setResult(null)
    setAnswers({})
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const reviewOf = (questionId: string) =>
    result?.review.find((r) => r.questionId === questionId)

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={() => lesson.course_id ? router.push(`/cursos/${lesson.course_id}`) : router.push("/dashboard")}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple"
        >
          <Home className="h-3.5 w-3.5" />
          Curso
        </button>
        <span className="text-muted-foreground/40">/</span>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-level-purple" />
          <span className="max-w-xs truncate text-sm font-semibold text-level-purple-dark">{lesson.title}</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {courseIndex >= 0 ? courseIndex + 1 : currentIndex + 1} / {courseTotal}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 justify-center">
        <ScrollArea className="h-full w-full max-w-3xl">
          <article className="px-6 py-8 md:px-12">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-level-purple">
              {lesson.module}
            </p>
            <h1 className="mb-2 text-2xl font-bold leading-tight text-level-purple-dark">{lesson.title}</h1>
            <p className="mb-8 text-xs text-gray-400">
              Questionário · nota mínima {passingScore}% · +{lesson.xp_reward} XP
            </p>

            {lesson.content_markdown?.trim() && (
              <div className="mb-8">
                <LessonContentPreview content={lesson.content_markdown} />
              </div>
            )}

            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Placar do resultado */}
            {result && (
              <div
                className={`mb-6 rounded-2xl border-2 p-5 ${
                  result.passed
                    ? "border-green-200 bg-green-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.passed
                    ? <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" />
                    : <XCircle className="h-8 w-8 shrink-0 text-amber-600" />}
                  <div>
                    <p className={`text-lg font-bold ${result.passed ? "text-green-700" : "text-amber-700"}`}>
                      {result.passed ? "Aprovado!" : "Ainda não foi dessa vez"}
                    </p>
                    <p className={`text-sm ${result.passed ? "text-green-600" : "text-amber-600"}`}>
                      {result.correctCount} de {result.total} corretas · {result.score}%
                      {" · "}mínimo {result.passingScore}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/50" />)}
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border py-10 text-center">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Este questionário ainda não tem questões.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {questions.map((q, qi) => {
                  const review = reviewOf(q.id)
                  const chosen = answers[q.id]
                  return (
                    <div
                      key={q.id}
                      className={`rounded-2xl border-2 p-5 transition-colors ${
                        review
                          ? review.correct
                            ? "border-green-200 bg-green-50/50"
                            : "border-red-200 bg-red-50/50"
                          : "border-border bg-white"
                      }`}
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-level-purple text-xs font-bold text-white">
                          {qi + 1}
                        </span>
                        <p className="text-sm font-medium leading-relaxed text-foreground">{q.prompt}</p>
                        {review && (
                          review.correct
                            ? <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-green-600" />
                            : <XCircle className="ml-auto h-5 w-5 shrink-0 text-red-500" />
                        )}
                      </div>

                      <div className="space-y-2 pl-9">
                        {q.options.map((opt, oi) => {
                          const selected = chosen === oi
                          return (
                            <button
                              key={oi}
                              type="button"
                              disabled={!!result}
                              onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                              className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors ${
                                result ? "cursor-default" : "cursor-pointer"
                              } ${
                                selected
                                  ? "border-level-purple bg-level-purple-subtle text-level-purple-dark"
                                  : "border-border bg-white text-foreground hover:border-level-purple-medium"
                              }`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  selected ? "bg-level-purple text-white" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {LETTERS[oi] ?? oi + 1}
                              </span>
                              {opt}
                            </button>
                          )
                        })}
                      </div>

                      {review?.explanation && (
                        <div className="ml-9 mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-level-purple-dark">Explicação: </span>
                          {review.explanation}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Ações */}
            <div className="mt-10 flex flex-col gap-3 border-t border-gray-100 pt-8">
              {!result ? (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting || questions.length === 0}
                  className="btn-3d flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-level-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Corrigindo...</>
                    : <><CheckCircle2 className="h-4 w-4" /> {allAnswered ? "Enviar respostas" : "Responda todas as questões"}</>}
                </button>
              ) : !result.passed ? (
                <button
                  onClick={handleRetry}
                  className="btn-3d flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-level-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-medium"
                >
                  <RotateCcw className="h-4 w-4" /> Tentar novamente
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm font-semibold text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> Lição concluída!
                </div>
              )}

              <div className="flex gap-3">
                {prevInCourse && (
                  <button
                    onClick={handlePrev}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" /> Anterior
                  </button>
                )}
                {(hasNextLesson || isCourseEnd) && (
                  <button
                    onClick={handleNext}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-level-purple py-2.5 text-sm font-medium text-level-purple transition-colors hover:bg-level-purple-light"
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
