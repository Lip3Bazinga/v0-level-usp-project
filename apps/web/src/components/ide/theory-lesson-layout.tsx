"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BookOpen, CheckCircle2, Circle, Loader2 } from "lucide-react"
import type { Checkpoint, Lesson, LessonSummary } from "@levelusp/contracts"
import { getLevelUpTransition, SuccessFeedback } from "@/components/ide/success-feedback"
import { ReadingLessonShell } from "@/components/ide/reading-lesson-shell"
import { LessonContentPreview } from "@/components/editor/lesson-content-preview"
import { useAuth } from "@/contexts/auth-context"
import { useProgress } from "@/contexts/progress-context"
import { useLessonNavigation } from "@/hooks/use-lesson-navigation"
import { swalToast } from "@/lib/swal"
import { completeTheoryLesson, getErrorMessage, HTTP_STATUS, isApiError, type CompletionResult } from "@/lib/api"
import { ROUTES } from "@/lib/constants"

interface TheoryLessonLayoutProps {
  lesson: Lesson
  allLessons: LessonSummary[]
  currentIndex: number
}

interface TheoryCompletion {
  result: CompletionResult
  /** Nível antes da conclusão, para a animação de subida de nível. */
  levelBefore: number | null
}

export function TheoryLessonLayout({ lesson, allLessons, currentIndex }: TheoryLessonLayoutProps): React.JSX.Element {
  const router = useRouter()
  const { profile } = useAuth()
  const { isCompleted, applyCompletion } = useProgress()
  const navigation = useLessonNavigation(allLessons, currentIndex, lesson)
  const [isRead, setIsRead] = useState(() => isCompleted(lesson.id))
  const [isCompleting, setIsCompleting] = useState(false)
  const [completion, setCompletion] = useState<TheoryCompletion | null>(null)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)

  const handleNext = (): void => {
    setIsSuccessOpen(false)
    navigation.goToNext()
  }

  const handleMarkDone = async (): Promise<void> => {
    if (isCompleting) return
    setIsCompleting(true)
    const levelBefore = profile?.level ?? null
    try {
      // A API conclui a lição e credita o XP; o cliente só exibe o resultado.
      const result = await completeTheoryLesson(lesson.id)
      setCompletion({ result, levelBefore })
      setIsRead(true)
      setIsSuccessOpen(true)
      await applyCompletion(lesson.id, result)
    } catch (error) {
      if (isApiError(error, HTTP_STATUS.UNAUTHORIZED)) {
        router.push(ROUTES.loginWithNext(ROUTES.lesson(lesson.id)))
        return
      }
      swalToast({ title: getErrorMessage(error, "Não foi possível concluir a lição. Tente novamente."), icon: "error" })
    } finally {
      setIsCompleting(false)
    }
  }

  const levelUp = getLevelUpTransition(completion?.result, completion?.levelBefore ?? null)

  return (
    <ReadingLessonShell
      lesson={lesson}
      navigation={navigation}
      icon={BookOpen}
      subtitle={`Dificuldade: ${lesson.difficulty} · +${lesson.xp_reward} XP · Leitura`}
      primaryAction={
        isRead ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Lição concluída!
          </div>
        ) : (
          <button
            onClick={() => void handleMarkDone()}
            disabled={isCompleting}
            className="btn-3d flex w-full items-center justify-center gap-2 rounded-xl bg-level-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-60"
          >
            {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Marcar como lida e continuar
          </button>
        )
      }
      overlay={
        <SuccessFeedback
          isOpen={isSuccessOpen}
          xpEarned={completion?.result.xp_awarded ?? 0}
          hasNextLesson={navigation.hasNextLesson}
          isCourseEnd={navigation.isCourseEnd}
          prevLevel={levelUp?.prevLevel}
          newLevel={levelUp?.newLevel}
          onClose={() => setIsSuccessOpen(false)}
          onNext={handleNext}
        />
      }
    >
      {lesson.content_markdown.trim() && <LessonContentPreview content={lesson.content_markdown} className="prose-lesson" />}
      {lesson.checkpoints.length > 0 && <KeyPoints checkpoints={lesson.checkpoints} />}
    </ReadingLessonShell>
  )
}

/** Checkpoints da lição teórica, só para leitura (não há execução para marcá-los). */
function KeyPoints({ checkpoints }: { checkpoints: readonly Checkpoint[] }): React.JSX.Element {
  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-bold text-level-purple-dark">Pontos-chave</h3>
      <div className="space-y-2">
        {checkpoints.map((checkpoint) => (
          <div key={checkpoint.id} className="flex items-start gap-3 rounded-xl border-2 border-gray-200 bg-gray-50 p-3">
            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div className="prose-lesson flex-1 text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{checkpoint.instruction}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
