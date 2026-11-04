"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, BookOpen, CheckCircle2, HelpCircle, Loader2, RotateCcw, XCircle } from "lucide-react"
import type { Lesson, LessonSummary, QuizQuestionPublic, QuizResult, QuizSubmitInput } from "@levelusp/contracts"
import { SuccessFeedback } from "@/components/ide/success-feedback"
import { ReadingLessonShell } from "@/components/ide/reading-lesson-shell"
import { LessonContentPreview } from "@/components/editor/lesson-content-preview"
import { useProgress } from "@/contexts/progress-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { useLessonNavigation } from "@/hooks/use-lesson-navigation"
import { fetchQuizForStudent, getErrorMessage, HTTP_STATUS, nullOnStatus, submitQuiz } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface QuizLessonLayoutProps {
  lesson: Lesson
  allLessons: LessonSummary[]
  currentIndex: number
}

type QuizAnswers = QuizSubmitInput["answers"]

const OPTION_LETTERS = "ABCDEFGHIJ"
const SKELETON_QUESTIONS = [0, 1, 2]
const NO_QUESTIONS: QuizQuestionPublic[] = []

type QuizReview = QuizResult["review"][number]

export function QuizLessonLayout({ lesson, allLessons, currentIndex }: QuizLessonLayoutProps): React.JSX.Element {
  const router = useRouter()
  const { applyCompletion, isCompleted } = useProgress()
  const navigation = useLessonNavigation(allLessons, currentIndex, lesson)
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const wasAlreadyCompleted = isCompleted(lesson.id)

  // `null`: a sessão expirou (401); a tela segue "carregando" enquanto vai para o login.
  const quiz = useAsyncResource(() => nullOnStatus(fetchQuizForStudent(lesson.id), HTTP_STATUS.UNAUTHORIZED), [lesson.id], {
    errorMessage: "Erro ao carregar o quiz.",
  })
  const isSessionExpired = quiz.status === "success" && quiz.data === null
  const isLoadingQuestions = quiz.status === "loading" || isSessionExpired

  useEffect(() => {
    if (isSessionExpired) router.push(ROUTES.loginWithNext(ROUTES.lesson(lesson.id)))
  }, [isSessionExpired, lesson.id, router])

  const questions = (quiz.status === "success" && quiz.data) || NO_QUESTIONS
  const errorMessage = submitError ?? (quiz.status === "error" ? quiz.error : null)
  const hasAnsweredAll = questions.length > 0 && questions.every((question) => answers[question.id] !== undefined)

  const handleNext = (): void => {
    setIsSuccessOpen(false)
    navigation.goToNext()
  }

  const handleSubmit = async (): Promise<void> => {
    if (!hasAnsweredAll || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    // A correção (e o crédito de XP) é feita no servidor: o gabarito nunca chega ao navegador.
    let quizResult: QuizResult
    try {
      quizResult = await submitQuiz(lesson.id, answers)
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Erro ao corrigir o quiz."))
      setIsSubmitting(false)
      return
    }
    setResult(quizResult)
    setIsSubmitting(false)
    if (quizResult.passed && !wasAlreadyCompleted) setIsSuccessOpen(true)
    if (quizResult.lesson_completed || quizResult.xp_awarded > 0) {
      // Atualizar o painel não pode apagar o resultado já exibido.
      await applyCompletion(lesson.id, quizResult).catch(() => undefined)
    }
  }

  const handleRetry = (): void => {
    setResult(null)
    setAnswers({})
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleAnswer = (questionId: string, optionIndex: number): void => {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }))
  }

  return (
    <ReadingLessonShell
      lesson={lesson}
      navigation={navigation}
      icon={HelpCircle}
      subtitle={`Questionário · nota mínima ${lesson.quiz_passing_score}% · +${lesson.xp_reward} XP`}
      primaryAction={
        <QuizPrimaryAction
          result={result}
          hasAnsweredAll={hasAnsweredAll}
          hasQuestions={questions.length > 0}
          isSubmitting={isSubmitting}
          onSubmit={() => void handleSubmit()}
          onRetry={handleRetry}
        />
      }
      overlay={
        <SuccessFeedback
          isOpen={isSuccessOpen}
          xpEarned={result?.xp_awarded ?? 0}
          hasNextLesson={navigation.hasNextLesson}
          isCourseEnd={navigation.isCourseEnd}
          onClose={() => setIsSuccessOpen(false)}
          onNext={handleNext}
        />
      }
    >
      {lesson.content_markdown.trim() && (
        <div className="mb-8">
          <LessonContentPreview content={lesson.content_markdown} />
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {result && <QuizScore result={result} />}

      {isLoadingQuestions ? (
        <div className="space-y-4">
          {SKELETON_QUESTIONS.map((key) => (
            <div key={key} className="h-32 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-10 text-center">
          <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Este questionário ainda não tem questões.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {questions.map((question, questionIndex) => (
            <QuizQuestionCard
              key={question.id}
              question={question}
              position={questionIndex + 1}
              chosenIndex={answers[question.id]}
              review={result?.review.find((item) => item.questionId === question.id)}
              isLocked={Boolean(result)}
              onAnswer={handleAnswer}
            />
          ))}
        </div>
      )}
    </ReadingLessonShell>
  )
}

function QuizScore({ result }: { result: QuizResult }): React.JSX.Element {
  const { passed } = result
  return (
    <div className={cn(
      "mb-6 rounded-2xl border-2 p-5",
      passed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50",
    )}>
      <div className="flex items-center gap-3">
        {passed ? <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" /> : <XCircle className="h-8 w-8 shrink-0 text-amber-600" />}
        <div>
          <p className={cn("text-lg font-bold", passed ? "text-green-700" : "text-amber-700")}>
            {passed ? "Aprovado!" : "Ainda não foi dessa vez"}
          </p>
          <p className={cn("text-sm", passed ? "text-green-600" : "text-amber-600")}>
            {result.correctCount} de {result.total} corretas · {result.score}%{" · "}mínimo {result.passingScore}%
          </p>
        </div>
      </div>
    </div>
  )
}

interface QuizQuestionCardProps {
  question: QuizQuestionPublic
  position: number
  chosenIndex: number | undefined
  review: QuizReview | undefined
  /** Depois de corrigido, as opções ficam travadas até "Tentar novamente". */
  isLocked: boolean
  onAnswer: (questionId: string, optionIndex: number) => void
}

function QuizQuestionCard({ question, position, chosenIndex, review, isLocked, onAnswer }: QuizQuestionCardProps): React.JSX.Element {
  const cardClassName = !review ? "border-border bg-white" : review.correct ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
  return (
    <div className={cn("rounded-2xl border-2 p-5 transition-colors", cardClassName)}>
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-level-purple text-xs font-bold text-white">
          {position}
        </span>
        <p className="text-sm font-medium leading-relaxed text-foreground">{question.prompt}</p>
        {review &&
          (review.correct ? (
            <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-green-600" />
          ) : (
            <XCircle className="ml-auto h-5 w-5 shrink-0 text-red-500" />
          ))}
      </div>

      <div className="space-y-2 pl-9">
        {question.options.map((option, optionIndex) => {
          const isSelected = chosenIndex === optionIndex
          return (
            <button
              key={optionIndex}
              type="button"
              aria-pressed={isSelected}
              disabled={isLocked}
              onClick={() => onAnswer(question.id, optionIndex)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors",
                isLocked ? "cursor-default" : "cursor-pointer",
                isSelected ? "border-level-purple bg-level-purple-subtle text-level-purple-dark" : "border-border bg-white text-foreground hover:border-level-purple-medium",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isSelected ? "bg-level-purple text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
              </span>
              {option}
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
}

interface QuizPrimaryActionProps {
  result: QuizResult | null
  hasAnsweredAll: boolean
  hasQuestions: boolean
  isSubmitting: boolean
  onSubmit: () => void
  onRetry: () => void
}

function QuizPrimaryAction({ result, hasAnsweredAll, hasQuestions, isSubmitting, onSubmit, onRetry }: QuizPrimaryActionProps): React.JSX.Element {
  if (!result) {
    return (
      <button
        onClick={onSubmit}
        disabled={!hasAnsweredAll || isSubmitting || !hasQuestions}
        className="btn-3d flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-level-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Corrigindo...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" /> {hasAnsweredAll ? "Enviar respostas" : "Responda todas as questões"}
          </>
        )}
      </button>
    )
  }
  if (!result.passed) {
    return (
      <button
        onClick={onRetry}
        className="btn-3d flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-level-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
      >
        <RotateCcw className="h-4 w-4" /> Tentar novamente
      </button>
    )
  }
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm font-semibold text-green-700">
      <CheckCircle2 className="h-4 w-4" /> Lição concluída!
    </div>
  )
}
