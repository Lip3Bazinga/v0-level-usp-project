"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Home } from "lucide-react"
import type { Lesson, LessonStepProgress, LessonSummary, StepOutcome, StepQuizResult } from "@levelusp/contracts"
import { getLevelUpTransition, SuccessFeedback } from "@/components/ide/success-feedback"
import { Spinner } from "@/components/design-system/spinner"
import { useAuth } from "@/contexts/auth-context"
import { useProgress } from "@/contexts/progress-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { useGamificationVisible } from "@/hooks/use-gamification-visible"
import { useLessonNavigation } from "@/hooks/use-lesson-navigation"
import { completeReadingStep, fetchMyLessonStepsProgress, getErrorMessage, HTTP_STATUS, isApiError, nullOnStatus, submitStepQuiz } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { trackEvent } from "@/lib/events"
import { swalToast } from "@/lib/swal"
import { indexBy } from "@/lib/utils"
import { listPendingBeforeProject } from "@/lib/utils/course-outline"
import { firstPendingStepIndex, initialStepFiles, isStepCompleted, mergeStepProgress, readStepDraft, stepStates, toCompletionLike } from "@/lib/utils/step-player"
import { ExerciseStep } from "./exercise-step"
import { LessonLibrariesProvider } from "./lesson-libraries-context"
import { ProjectLockedNotice } from "./project-locked-notice"
import { PredictionStep } from "./prediction-step"
import { QuizStep } from "./quiz-step"
import { ReadingStep } from "./reading-step"
import { RunButtonGateProvider, useRunButtonGate } from "./run-button-gate"
import { StepSidebar } from "./step-sidebar"

interface GuidedLessonLayoutProps {
  lesson: Lesson
  allLessons: LessonSummary[]
  currentIndex: number
}

/** Conclusão da lição para a comemoração: XP ganho no último passo e o nível de antes. */
interface LessonCelebration {
  outcome: StepOutcome
  levelBefore: number | null
}

const NO_PROGRESS: LessonStepProgress[] = []
const NO_PENDING_LESSONS: LessonSummary[] = []
const PROJECT_LOCKED_CODE = "PROJECT_LOCKED"

/**
 * Lição guiada em passos (formato Codecademy): lista de passos com a situação de cada um e
 * o passo atual (leitura, exercício, previsão ou quiz). Todo veredito, XP e conclusão vêm da API; a
 * tela só reflete o que ela devolveu. Lições sem passos usam as telas clássicas. O bloqueio do
 * "Executar" por nível (`useRunButtonGate`) é calculado aqui e entregue aos passos de exercício.
 */
export function GuidedLessonLayout({ lesson, allLessons, currentIndex }: GuidedLessonLayoutProps): React.JSX.Element {
  const router = useRouter()
  const { profile } = useAuth()
  const { applyCompletion, isCompleted, isLoading: isProgressLoading } = useProgress()
  const isGamified = useGamificationVisible()
  const runGate = useRunButtonGate(lesson.run_button_min_level)
  const navigation = useLessonNavigation(allLessons, currentIndex, lesson)
  const steps = lesson.steps
  // `null`: visitante sem sessão — vê a lição, e a primeira ação o leva ao login.
  const loaded = useAsyncResource(() => nullOnStatus(fetchMyLessonStepsProgress(lesson.id), HTTP_STATUS.UNAUTHORIZED), [lesson.id])
  const serverProgress = loaded.status === "success" ? (loaded.data?.steps ?? NO_PROGRESS) : NO_PROGRESS
  const [localProgress, setLocalProgress] = useState<Record<string, LessonStepProgress>>({})
  const progressByStep = useMemo(
    () => new Map([...indexBy(serverProgress, (item) => item.step_id), ...Object.entries(localProgress)]),
    [serverProgress, localProgress],
  )
  // Mesma regra da API (`PROJECT_LOCKED`): o projeto publicado só aceita respostas com as outras lições do curso concluídas.
  const pendingBeforeProject = useMemo(
    () => (profile && !isProgressLoading ? listPendingBeforeProject(lesson, allLessons, isCompleted) : NO_PENDING_LESSONS),
    [profile, isProgressLoading, lesson, allLessons, isCompleted],
  )
  const isProjectLocked = pendingBeforeProject.length > 0
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [quizResult, setQuizResult] = useState<StepQuizResult | null>(null)
  const [celebration, setCelebration] = useState<LessonCelebration | null>(null)

  useEffect(() => {
    trackEvent("lesson_viewed", { lesson_id: lesson.id })
  }, [lesson.id])

  const stepIndex = selectedIndex ?? firstPendingStepIndex(steps, progressByStep)
  const step = steps[stepIndex]
  const states = stepStates(steps, progressByStep, stepIndex)
  const completedCount = steps.filter((item) => isStepCompleted(progressByStep, item.id)).length

  const goToLogin = (): void => router.push(ROUTES.loginWithNext(ROUTES.lesson(lesson.id)))

  const patchProgress = (stepId: string, patch: Partial<LessonStepProgress>): void => {
    // Fixa o passo que está na tela: sem isso, concluí-lo faria o "primeiro pendente" pular
    // sozinho para o passo seguinte, antes de o aluno ler o resultado e clicar em Continuar.
    setSelectedIndex((current) => current ?? stepIndex)
    setLocalProgress((current) => ({ ...current, [stepId]: mergeStepProgress(current[stepId] ?? progressByStep.get(stepId), stepId, patch) }))
  }

  const selectStep = (index: number): void => {
    setQuizResult(null)
    setSelectedIndex(index)
  }

  const goToNextStep = (): void => {
    if (stepIndex + 1 < steps.length) selectStep(stepIndex + 1)
    else navigation.goToNext()
  }

  /** Reflete uma conclusão JÁ GRAVADA pela API: progresso local, XP/badges do painel e a comemoração da lição. */
  const applyOutcome = async (stepId: string, outcome: StepOutcome): Promise<void> => {
    if (!outcome.step_completed) return
    patchProgress(stepId, { status: "completed", xp_awarded: outcome.xp_awarded, completed_at: new Date().toISOString() })
    if (outcome.lesson_completed) setCelebration({ outcome, levelBefore: profile?.level ?? null })
    else if (isGamified && outcome.xp_awarded > 0) swalToast({ title: `+${outcome.xp_awarded} XP`, icon: "success" })
    try {
      await applyCompletion(lesson.id, toCompletionLike(outcome))
    } catch {
      // O passo já está concluído na API; uma falha ao atualizar o painel não desfaz isso.
    }
  }

  const handleFailure = (error: unknown, fallback: string): void => {
    if (isApiError(error, HTTP_STATUS.UNAUTHORIZED)) goToLogin()
    // O aviso fixo no topo da página já explica o bloqueio e lista o que falta.
    else if (isProjectLocked && isApiError(error) && error.code === PROJECT_LOCKED_CODE) return
    else swalToast({ title: getErrorMessage(error, fallback), icon: "error" })
  }

  const handleReadingContinue = async (): Promise<void> => {
    if (!step) return
    if (isStepCompleted(progressByStep, step.id)) {
      goToNextStep()
      return
    }
    setIsBusy(true)
    try {
      const result = await completeReadingStep(lesson.id, step.id)
      await applyOutcome(step.id, result)
      if (!result.lesson_completed) goToNextStep()
    } catch (error) {
      handleFailure(error, "Não foi possível concluir o passo. Tente novamente.")
    } finally {
      setIsBusy(false)
    }
  }

  const handleQuizSubmit = async (answers: number[]): Promise<void> => {
    if (!step) return
    setIsBusy(true)
    try {
      const result = await submitStepQuiz(lesson.id, step.id, answers)
      setQuizResult(result)
      await applyOutcome(step.id, result)
    } catch (error) {
      handleFailure(error, "Não foi possível enviar as respostas. Tente novamente.")
    } finally {
      setIsBusy(false)
    }
  }

  /** Veredito de um "Verificar" (exercício) ou de um "Enviar" (previsão): tentativas e, se aprovado, a conclusão. */
  const handleVerified = (result: StepOutcome & { attempts: number }): void => {
    if (!step) return
    patchProgress(step.id, { attempts: result.attempts })
    void applyOutcome(step.id, result)
  }

  if (loaded.status === "loading" || !step) {
    return (
      <div className="flex h-screen items-center justify-center bg-white" role="status" aria-label="Carregando lição">
        <Spinner />
      </div>
    )
  }

  const levelUp = getLevelUpTransition(celebration?.outcome, celebration?.levelBefore ?? null)
  const stepProgress = progressByStep.get(step.id)

  return (
    <div className="@container flex h-screen flex-col bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={navigation.goToExit}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple"
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" /> Curso
        </button>
        <span className="text-muted-foreground/40">/</span>
        <h1 className="max-w-md truncate text-sm font-semibold text-level-purple-dark">{lesson.title}</h1>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>Passo {stepIndex + 1} de {steps.length}</span>
          <progress className="h-2 w-24" max={steps.length} value={completedCount} aria-label="Passos concluídos" />
        </div>
      </header>

      {isProjectLocked && <ProjectLockedNotice pendingLessons={pendingBeforeProject} />}

      <div className="flex min-h-0 flex-1 flex-col @5xl:flex-row">
        <StepSidebar steps={steps} states={states} onSelect={selectStep} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <LessonLibrariesProvider libraries={lesson.libraries}>
            {step.kind === "leitura" && (
              <ReadingStep step={step} isCompleted={stepProgress?.status === "completed"} isBusy={isBusy} onContinue={() => void handleReadingContinue()} />
            )}
            {step.kind === "exercicio" && (
              <RunButtonGateProvider gate={runGate}>
                <ExerciseStep
                  key={step.id}
                  lesson={lesson}
                  step={step}
                  initialFiles={readStepDraft(step.id) ?? initialStepFiles(steps, stepIndex)}
                  progress={stepProgress}
                  onProgress={(patch) => patchProgress(step.id, patch)}
                  onVerified={handleVerified}
                  onContinue={goToNextStep}
                  onUnauthorized={goToLogin}
                />
              </RunButtonGateProvider>
            )}
            {step.kind === "previsao" && (
              <PredictionStep
                key={step.id}
                lesson={lesson}
                step={step}
                progress={stepProgress}
                onProgress={(patch) => patchProgress(step.id, patch)}
                onPredicted={handleVerified}
                onContinue={goToNextStep}
                onUnauthorized={goToLogin}
              />
            )}
            {step.kind === "quiz" && (
              <QuizStep
                key={step.id}
                step={step}
                isCompleted={stepProgress?.status === "completed"}
                isBusy={isBusy}
                result={quizResult}
                onSubmit={(answers) => void handleQuizSubmit(answers)}
                onRetry={() => setQuizResult(null)}
                onContinue={goToNextStep}
              />
            )}
          </LessonLibrariesProvider>
        </main>
      </div>

      <SuccessFeedback
        isOpen={celebration !== null}
        xpEarned={isGamified ? (celebration?.outcome.xp_awarded ?? 0) : 0}
        hasNextLesson={navigation.hasNextLesson}
        isCourseEnd={navigation.isCourseEnd}
        prevLevel={isGamified ? levelUp?.prevLevel : undefined}
        newLevel={isGamified ? levelUp?.newLevel : undefined}
        onClose={() => setCelebration(null)}
        onNext={() => {
          setCelebration(null)
          navigation.goToNext()
        }}
      />
    </div>
  )
}
