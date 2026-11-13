"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { ArrowRight, CheckCircle2, Circle, Eye, Lightbulb, Loader2, ShieldCheck, XCircle } from "lucide-react"
import type { HintReveal, Lesson, LessonStep, LessonStepProgress, ProjectFile, StepCaseResult, StepSubmitResult } from "@levelusp/contracts"
import { ConsolePanel } from "@/components/ide/console-panel"
import { Spinner } from "@/components/design-system/spinner"
import { usePython, type ExecutionResult } from "@/hooks/use-python"
import { fetchRevealedStepHints, getErrorMessage, HTTP_STATUS, isApiError, revealStepHint, revealStepSolution, submitStep } from "@/lib/api"
import { MAIN_FILE_PATH } from "@/lib/constants"
import type { ConsoleOutput } from "@/lib/types"
import { cn, hasFile, updateFileContent } from "@/lib/utils"
import { pythonErrorLines, stderrLines, stdoutLines, toConsoleOutput, type ConsoleLine } from "@/lib/utils/ide-feedback"
import { canRevealSolution, checkpointStatuses, clearStepDraft, writeStepDraft, type CheckpointStatus } from "@/lib/utils/step-player"
import { StepMarkdown } from "./step-markdown"

// O CodeMirror pesa e só existe no navegador: carregado sob demanda, fora do bundle inicial da lição.
const CodeEditor = dynamic(() => import("@/components/ide/code-editor").then((module) => module.CodeEditor), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center"><Spinner /></div>,
})

interface ExerciseStepProps {
  lesson: Pick<Lesson, "id" | "libraries" | "solution_after_attempts">
  step: LessonStep
  /** Código com que o passo abre (rascunho, código inicial ou o do exercício anterior). */
  initialFiles: ProjectFile[]
  progress: LessonStepProgress | undefined
  /** Reflete na lição o que a API devolveu (tentativas, dicas, solução vista). */
  onProgress: (patch: Partial<LessonStepProgress>) => void
  /** Veredito de um "Verificar" (aprovado ou não). */
  onVerified: (result: StepSubmitResult) => void
  onContinue: () => void
  /** Sessão expirada numa ação: a página leva ao login. */
  onUnauthorized: () => void
}

const STATUS_ICON: Readonly<Record<CheckpointStatus, React.JSX.Element>> = {
  pending: <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-label="Pendente" />,
  passed: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-label="Certo" />,
  failed: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-label="Ainda não" />,
}

/**
 * Passo de exercício: narrativa e instruções à esquerda (cada instrução ganha ✓/✗ depois do
 * "Verificar"), editor e console à direita. "Executar" roda no navegador; "Verificar" manda
 * o código para a API, que corrige com os casos ocultos. Dicas saem uma a uma e a solução só
 * aparece depois das tentativas que a lição exige.
 */
export function ExerciseStep({ lesson, step, initialFiles, progress, onProgress, onVerified, onContinue, onUnauthorized }: ExerciseStepProps): React.JSX.Element {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles)
  const [activePath, setActivePath] = useState(() => (hasFile(initialFiles, MAIN_FILE_PATH) ? MAIN_FILE_PATH : (initialFiles[0]?.path ?? MAIN_FILE_PATH)))
  const [outputs, setOutputs] = useState<ConsoleOutput[]>([])
  const [cases, setCases] = useState<StepCaseResult[] | null>(null)
  const [hints, setHints] = useState<HintReveal[]>([])
  const [solution, setSolution] = useState<ProjectFile[] | null>(null)
  const [busy, setBusy] = useState<"verify" | "hint" | "solution" | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { status: pythonStatus, isExecuting, isInstalling, execute, stop } = usePython({ packages: lesson.libraries })

  const isCompleted = progress?.status === "completed"
  const hintsRevealed = progress?.hints_revealed ?? 0
  const statuses = checkpointStatuses(step.checkpoints, cases)
  const failedCases = cases?.filter((result) => !result.passed) ?? []

  // Reabrir a lição traz de volta as dicas que o aluno já tinha revelado.
  useEffect(() => {
    if (hintsRevealed === 0) return
    let isCurrent = true
    fetchRevealedStepHints(lesson.id, step.id)
      .then((revealed) => {
        if (isCurrent) setHints((current) => (current.length >= revealed.length ? current : revealed))
      })
      .catch(() => {
        // Sem as dicas antigas o aluno ainda pode pedir a próxima.
      })
    return () => {
      isCurrent = false
    }
  }, [lesson.id, step.id, hintsRevealed])

  const appendLines = useCallback((lines: readonly ConsoleLine[]) => setOutputs((current) => [...current, ...lines.map(toConsoleOutput)]), [])

  const handleContentChange = (path: string, content: string): void => {
    const next = updateFileContent(files, path, content)
    setFiles(next)
    writeStepDraft(step.id, next)
  }

  const handleReset = (): void => {
    const starter = step.starter_files.length > 0 ? step.starter_files : initialFiles
    setFiles(starter)
    clearStepDraft(step.id)
    setCases(null)
    setOutputs([toConsoleOutput({ type: "info", message: "Código restaurado para o início do passo." })])
  }

  const handleRun = (): void => {
    if (pythonStatus !== "ready" || isInstalling) {
      appendLines([{ type: "warning", message: "O Python ainda está carregando. Aguarde um instante." }])
      return
    }
    const entryPath = hasFile(files, activePath) ? activePath : MAIN_FILE_PATH
    setOutputs([toConsoleOutput({ type: "info", message: `Executando ${entryPath}...` })])
    execute(
      { files, entryPath },
      {
        onResult: (result: ExecutionResult): void => {
          appendLines([...stdoutLines(result.stdout), ...stderrLines(result.stderr)])
          if (result.error) appendLines(pythonErrorLines(result.error.traceback))
          else appendLines([{ type: "success", message: "✓ Código executado sem erros. Use Verificar para conferir as instruções." }])
        },
        onError: (rawError) => appendLines(pythonErrorLines(rawError)),
      },
    )
  }

  /** Erro de uma ação: 401 leva ao login; o resto vira a mensagem pt-BR da API. */
  const handleFailure = (error: unknown, fallback: string): void => {
    if (isApiError(error, HTTP_STATUS.UNAUTHORIZED)) onUnauthorized()
    else setMessage(getErrorMessage(error, fallback))
  }

  const handleVerify = async (): Promise<void> => {
    setBusy("verify")
    setMessage(null)
    try {
      const result = await submitStep(lesson.id, step.id, files)
      setCases(result.cases)
      appendLines([
        result.passed
          ? { type: "success", message: "✓ Todas as verificações passaram!" }
          : { type: "error", message: `✗ ${result.cases.filter((item) => !item.passed).length} de ${result.cases.length} verificações ainda não passaram.` },
      ])
      onVerified(result)
    } catch (error) {
      // 503 (corretor fora do ar ou ocupado): a API avisa que a tentativa não contou.
      handleFailure(error, "Não foi possível verificar agora. Tente novamente.")
    } finally {
      setBusy(null)
    }
  }

  const handleHint = async (): Promise<void> => {
    setBusy("hint")
    setMessage(null)
    try {
      const hint = await revealStepHint(lesson.id, step.id)
      setHints((current) => [...current.filter((item) => item.index !== hint.index), hint].sort((first, second) => first.index - second.index))
      onProgress({ hints_revealed: Math.max(hintsRevealed, hint.index + 1) })
    } catch (error) {
      handleFailure(error, "Não foi possível revelar a dica.")
    } finally {
      setBusy(null)
    }
  }

  const handleSolution = async (): Promise<void> => {
    setBusy("solution")
    setMessage(null)
    try {
      const revealed = await revealStepSolution(lesson.id, step.id)
      setSolution(revealed.files)
      if (!isCompleted) onProgress({ solution_viewed: true })
    } catch (error) {
      handleFailure(error, "A solução ainda não está liberada.")
    } finally {
      setBusy(null)
    }
  }

  const useSolution = (): void => {
    if (!solution) return
    setFiles(solution)
    writeStepDraft(step.id, solution)
    setActivePath(hasFile(solution, MAIN_FILE_PATH) ? MAIN_FILE_PATH : (solution[0]?.path ?? MAIN_FILE_PATH))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section aria-label="Enunciado do passo" className="overflow-y-auto border-b border-border p-6 lg:w-2/5 lg:border-b-0 lg:border-r">
        <h2 className="mb-4 text-xl font-bold text-level-purple-dark">{step.title}</h2>
        <StepMarkdown content={step.narrative_markdown} />

        {step.checkpoints.length > 0 && (
          <>
            <h3 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-level-purple">Instruções</h3>
            <ol className="space-y-2">
              {step.checkpoints.map((checkpoint, index) => (
                <li key={checkpoint.id} className="flex items-start gap-3 rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-sm">
                  {STATUS_ICON[statuses.get(checkpoint.id) ?? "pending"]}
                  <span className="font-semibold text-gray-500">{index + 1}.</span>
                  <StepMarkdown content={checkpoint.instruction} className="flex-1" />
                </li>
              ))}
            </ol>
          </>
        )}

        {failedCases.length > 0 && (
          <ul className="mt-4 space-y-2" aria-label="O que ainda não passou">
            {failedCases.map((result) => (
              <li key={result.id} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p className="font-semibold">✗ {result.name}</p>
                {result.message && <p className="mt-1 whitespace-pre-wrap font-mono text-xs">{result.message}</p>}
                {result.hint && <p className="mt-1 text-red-700">Dica: {result.hint}</p>}
              </li>
            ))}
          </ul>
        )}

        {hints.length > 0 && (
          <ol className="mt-4 space-y-2" aria-label="Dicas reveladas">
            {hints.map((hint) => (
              <li key={hint.index} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="mb-1 font-semibold">Dica {hint.index + 1}</p>
                <StepMarkdown content={hint.text} />
              </li>
            ))}
          </ol>
        )}

        {solution && (
          <div className="mt-4 rounded-xl border border-level-purple/30 bg-level-purple-light p-3">
            <p className="mb-2 text-sm font-semibold text-level-purple-dark">Solução de referência</p>
            {solution.map((file) => (
              <pre key={file.path} className="mb-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100"><code>{file.content}</code></pre>
            ))}
            <button type="button" onClick={useSolution} className="text-sm font-semibold text-level-purple underline">
              Copiar para o editor
            </button>
            {!isCompleted && <p className="mt-2 text-xs text-gray-600">Leia, entenda e clique em Verificar para concluir o passo.</p>}
          </div>
        )}

        {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={busy !== null}
            className={cn("btn-3d flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60", isCompleted ? "bg-green-600 hover:bg-green-700" : "bg-level-purple hover:bg-level-purple-dark")}
          >
            {busy === "verify" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            {isCompleted ? "Verificar de novo" : "Verificar"}
          </button>
          {step.hint_count > 0 && (
            <button
              type="button"
              onClick={() => void handleHint()}
              disabled={busy !== null || hintsRevealed >= step.hint_count}
              className="flex items-center gap-2 rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              <Lightbulb className="h-4 w-4" aria-hidden="true" /> Dica ({hintsRevealed}/{step.hint_count})
            </button>
          )}
          {canRevealSolution(progress, lesson.solution_after_attempts) && !solution && (
            <button
              type="button"
              onClick={() => void handleSolution()}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-xl border border-level-purple px-4 py-2.5 text-sm font-semibold text-level-purple hover:bg-level-purple-light disabled:opacity-50"
            >
              <Eye className="h-4 w-4" aria-hidden="true" /> Ver solução
            </button>
          )}
          {isCompleted && (
            <button type="button" onClick={onContinue} className="btn-3d ml-auto flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark">
              Continuar <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {!isCompleted && lesson.solution_after_attempts > 0 && !canRevealSolution(progress, lesson.solution_after_attempts) && (progress?.attempts ?? 0) > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            A solução fica disponível depois de {lesson.solution_after_attempts} tentativas ({progress?.attempts ?? 0} até agora).
          </p>
        )}
      </section>

      <section aria-label="Editor e console" className="flex min-h-[28rem] flex-1 flex-col lg:min-h-0">
        <div className="min-h-0 flex-[3]">
          <CodeEditor
            tabs={files}
            activePath={activePath}
            onTabSelect={setActivePath}
            onTabClose={() => undefined}
            onContentChange={handleContentChange}
            onRun={handleRun}
            onReset={handleReset}
            onStop={stop}
            isRunning={isExecuting}
            isInstalling={isInstalling}
            pythonStatus={pythonStatus}
          />
        </div>
        <div className="min-h-0 flex-[2] border-t border-border">
          <ConsolePanel outputs={outputs} onClear={() => setOutputs([])} isRunning={isExecuting} />
        </div>
      </section>
    </div>
  )
}
