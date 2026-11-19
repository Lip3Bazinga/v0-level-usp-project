"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { LessonStepInput, LessonStepProgress, StepQuizResult } from "@levelusp/contracts"
import { LessonContentPreview } from "@/components/editor/lesson-content-preview"
import { ExerciseStep } from "@/components/lesson-steps/exercise-step"
import { LessonLibrariesProvider } from "@/components/lesson-steps/lesson-libraries-context"
import { PredictionStep } from "@/components/lesson-steps/prediction-step"
import { QuizStep } from "@/components/lesson-steps/quiz-step"
import { ReadingStep } from "@/components/lesson-steps/reading-step"
import { StepBackendProvider } from "@/components/lesson-steps/step-backend"
import { StepSidebar } from "@/components/lesson-steps/step-sidebar"
import { usePython } from "@/hooks/use-python"
import { isValidMermaidDiagram } from "@/lib/mermaid"
import { initialStepFiles, mergeStepProgress, type StepState } from "@/lib/utils/step-player"
import type { LessonFormState } from "../lesson-form"
import { createPreviewBackend, PreviewRunError, type PreviewPythonRunner } from "./preview-backend"
import { PreviewErrorBoundary } from "./preview-error-boundary"
import { buildPreviewSteps, contentWarnings, gradeQuizLocally, mermaidBlocks, stepSeedKey } from "./preview-model"

/** Id da lição na prévia quando ela ainda não foi salva. */
const UNSAVED_LESSON_ID = "previa"
const PYTHON_LOADING_MESSAGE = "O Python ainda está carregando. Aguarde um instante e tente de novo."
const NO_OP = (): void => undefined

interface LessonPreviewPaneProps {
  /** Estado NÃO salvo do formulário do editor. */
  form: LessonFormState
  /** Passo que o professor está editando; a prévia o seleciona e o acompanha quando muda. */
  activeStepIndex: number
  /** Id da lição salva, ou null quando ainda é nova. */
  lessonId: string | null
}

/** Cabeçalho comum às duas formas da prévia. */
function PreviewHeader({ title, detail }: { title: string; detail?: string }): React.JSX.Element {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-level-purple-light px-4 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-level-purple-dark">Prévia — como o aluno vê</p>
      <h2 className="min-w-0 max-w-md truncate text-sm font-semibold text-level-purple-dark">{title.trim() === "" ? "Lição sem título" : title}</h2>
      {detail && <span className="ml-auto text-xs text-muted-foreground">{detail}</span>}
    </header>
  )
}

interface PythonBridgeProps {
  libraries: readonly string[]
  /** Recebe a função que roda Python (ou null ao sair). */
  onRunner: (runner: PreviewPythonRunner | null) => void
}

/**
 * Liga o Python do navegador (Pyodide) à prévia. Só é montado em passos de previsão, para o
 * Pyodide não carregar à toa nos demais (exercícios já o carregam pelo próprio `usePython`).
 */
function PythonBridge({ libraries, onRunner }: PythonBridgeProps): null {
  const { status, isInstalling, execute } = usePython({ packages: libraries })
  useEffect(() => {
    onRunner((files, entryPath) => {
      if (status !== "ready" || isInstalling) return Promise.reject(new PreviewRunError(PYTHON_LOADING_MESSAGE))
      return new Promise<string>((resolve, reject) => {
        execute(
          { files, entryPath },
          {
            onResult: (result) => (result.error ? reject(new PreviewRunError(`O código da previsão deu erro: ${result.error.summary}`)) : resolve(result.stdout)),
            onError: () => reject(new PreviewRunError("Não foi possível rodar o código da previsão no navegador.")),
          },
        )
      })
    })
    return () => onRunner(null)
  }, [status, isInstalling, execute, onRunner])
  return null
}

/** Estado do quiz da prévia: a correção local vale só para a versão do passo em que foi feita. */
interface QuizState {
  key: string
  result: StepQuizResult
}

/** O que o backend (criado uma vez) precisa enxergar de mais novo: os passos do editor e o Python do navegador. */
class PreviewBridge {
  byId: ReadonlyMap<string, LessonStepInput>
  runner: PreviewPythonRunner | null = null

  constructor(byId: ReadonlyMap<string, LessonStepInput>) {
    this.byId = byId
  }

  setSteps(byId: ReadonlyMap<string, LessonStepInput>): void {
    this.byId = byId
  }

  setRunner(runner: PreviewPythonRunner | null): void {
    this.runner = runner
  }
}

/** Lição guiada com passos: sidebar + o passo do player do aluno, com o backend local da prévia. */
function GuidedPreview({ form, activeStepIndex, lessonId }: LessonPreviewPaneProps): React.JSX.Element {
  const id = lessonId ?? UNSAVED_LESSON_ID
  const { steps, byId } = useMemo(() => buildPreviewSteps(form.steps, id), [form.steps, id])
  // O backend vive o tempo todo da prévia (guarda dicas reveladas e tentativas) e lê os passos e o Python mais novos por esta ponte.
  const [bridge] = useState(() => new PreviewBridge(byId))
  const [backend] = useState(() =>
    createPreviewBackend(
      () => bridge.byId,
      (files, entryPath) => (bridge.runner ? bridge.runner(files, entryPath) : Promise.reject(new PreviewRunError(PYTHON_LOADING_MESSAGE))),
    ),
  )
  useEffect(() => {
    bridge.setSteps(byId)
  }, [bridge, byId])
  const setRunner = useCallback((runner: PreviewPythonRunner | null): void => {
    bridge.setRunner(runner)
  }, [bridge])

  const [chosenIndex, setChosenIndex] = useState(activeStepIndex)
  const [followedIndex, setFollowedIndex] = useState(activeStepIndex)
  if (followedIndex !== activeStepIndex) {
    setFollowedIndex(activeStepIndex)
    setChosenIndex(activeStepIndex)
  }
  const stepIndex = Math.min(Math.max(chosenIndex, 0), steps.length - 1)
  const step = steps[stepIndex]
  const input = step ? byId.get(step.id) : undefined

  const [progressByStep, setProgressByStep] = useState<Record<string, LessonStepProgress>>({})
  const [quizState, setQuizState] = useState<QuizState | null>(null)
  const [mermaidProblems, setMermaidProblems] = useState<{ signature: string; count: number } | null>(null)

  const warnings = useMemo(() => (input ? contentWarnings(input) : []), [input])
  const diagrams = useMemo(() => (input ? mermaidBlocks(input) : []), [input])
  const diagramsSignature = JSON.stringify(diagrams)
  const contentKey = useMemo(() => (input ? JSON.stringify(input) : ""), [input])

  useEffect(() => {
    if (diagrams.length === 0) return
    let isCurrent = true
    void Promise.all(diagrams.map((code) => isValidMermaidDiagram(code))).then((results) => {
      if (isCurrent) setMermaidProblems({ signature: diagramsSignature, count: results.filter((isValid) => !isValid).length })
    })
    return () => {
      isCurrent = false
    }
  }, [diagrams, diagramsSignature])

  if (!step || !input) return <LessonPreviewPane form={{ ...form, steps: [] }} activeStepIndex={0} lessonId={lessonId} />

  const mermaidCount = mermaidProblems?.signature === diagramsSignature ? mermaidProblems.count : 0
  const allWarnings = mermaidCount > 0 ? [...warnings, `Há ${mermaidCount} diagrama(s) Mermaid inválido(s): o aluno vê o código no lugar do desenho.`] : warnings
  const states: StepState[] = steps.map((_item, index) => (index === stepIndex ? "current" : "available"))
  const seedKey = `${step.id}:${stepSeedKey(input)}`
  const progress = progressByStep[step.id]
  const lesson = { id, libraries: form.libraries, solution_after_attempts: form.solution_after_attempts }

  const goToNext = (): void => setChosenIndex(Math.min(stepIndex + 1, steps.length - 1))
  const patchProgress = (patch: Partial<LessonStepProgress>): void =>
    setProgressByStep((current) => ({ ...current, [step.id]: mergeStepProgress(current[step.id], step.id, patch) }))

  return (
    <section aria-label="Prévia da lição" className="flex h-full min-h-0 flex-col bg-white">
      <PreviewHeader title={form.title} detail={`Passo ${stepIndex + 1} de ${steps.length}`} />
      <div role="status" aria-label="Avisos de conteúdo">
        {allWarnings.length > 0 && (
          <ul className="space-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            {allWarnings.map((warning) => <li key={warning}>Atenção: {warning}</li>)}
          </ul>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <StepSidebar steps={steps} states={states} onSelect={setChosenIndex} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <StepBackendProvider backend={backend}>
            <LessonLibrariesProvider libraries={form.libraries}>
              <PreviewErrorBoundary resetKey={contentKey}>
                {step.kind === "leitura" && <ReadingStep key={seedKey} step={step} isCompleted={false} isBusy={false} onContinue={goToNext} />}
                {step.kind === "exercicio" && (
                  <ExerciseStep
                    key={seedKey}
                    lesson={lesson}
                    step={step}
                    initialFiles={initialStepFiles(steps, stepIndex, () => null)}
                    progress={progress}
                    onProgress={patchProgress}
                    onVerified={NO_OP}
                    onContinue={goToNext}
                    onUnauthorized={NO_OP}
                  />
                )}
                {step.kind === "previsao" && (
                  <>
                    <PythonBridge libraries={form.libraries} onRunner={setRunner} />
                    <PredictionStep
                      key={seedKey}
                      lesson={lesson}
                      step={step}
                      progress={progress}
                      onProgress={patchProgress}
                      onPredicted={(result) => patchProgress({ attempts: result.attempts })}
                      onContinue={goToNext}
                      onUnauthorized={NO_OP}
                    />
                  </>
                )}
                {step.kind === "quiz" && (
                  <QuizStep
                    key={seedKey}
                    step={step}
                    isCompleted={false}
                    isBusy={false}
                    result={quizState?.key === seedKey ? quizState.result : null}
                    correctIndexes={input.quiz_questions.map((question) => question.correct_index)}
                    onSubmit={(answers) => setQuizState({ key: seedKey, result: gradeQuizLocally(input, answers, form.quiz_passing_score, step.id) })}
                    onRetry={() => setQuizState(null)}
                    onContinue={goToNext}
                  />
                )}
              </PreviewErrorBoundary>
            </LessonLibrariesProvider>
          </StepBackendProvider>
        </main>
      </div>
    </section>
  )
}

/**
 * Prévia da lição no editor do professor: mostra o estado NÃO salvo do formulário com os mesmos
 * componentes do player do aluno, trocando só o backend (sem API, progresso, XP nem eventos).
 * Lição guiada com passos usa o player de passos; sem passos (ou de outro tipo) mostra o conteúdo
 * da tela de lição atual. Avisos de conteúdo (KaTeX, Mermaid, imagem sem alt, campos que faltam)
 * aparecem num bloco `role="status"` no topo.
 */
export function LessonPreviewPane({ form, activeStepIndex, lessonId }: LessonPreviewPaneProps): React.JSX.Element {
  if (form.lesson_type === "guided" && form.steps.length > 0) return <GuidedPreview form={form} activeStepIndex={activeStepIndex} lessonId={lessonId} />
  return (
    <section aria-label="Prévia da lição" className="flex h-full min-h-0 flex-col bg-white">
      <PreviewHeader title={form.title} />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <LessonContentPreview content={form.content_markdown} />
      </div>
    </section>
  )
}
