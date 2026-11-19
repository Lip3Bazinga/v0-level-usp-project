"use client"

import { useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { ArrowRight, CheckCircle2, Circle, Loader2, ShieldCheck, XCircle } from "lucide-react"
import type { ExerciseMode, Lesson, LessonStep, LessonStepProgress, ParsonsPlacement, ProjectFile, StepCaseResult, StepSubmitResult } from "@levelusp/contracts"
import { ConsolePanel } from "@/components/ide/console-panel"
import { Spinner } from "@/components/design-system/spinner"
import { usePython, type ExecutionResult } from "@/hooks/use-python"
import { MAIN_FILE_PATH } from "@/lib/constants"
import type { ConsoleOutput } from "@/lib/types"
import { cn, hasFile, updateFileContent } from "@/lib/utils"
import {
  arrangementFiles, clearArrangementDraft, clearBlanksDraft, countBlanks, fillBlanksInFiles, readArrangementDraft, readBlanksDraft, writeArrangementDraft, writeBlanksDraft,
} from "@/lib/utils/exercise-modes"
import { callsInput } from "@/lib/utils/stdin"
import { pythonErrorLines, stderrLines, stdoutLines, toConsoleOutput, type ConsoleLine } from "@/lib/utils/ide-feedback"
import { checkpointStatuses, clearStepDraft, writeStepDraft, type CheckpointStatus } from "@/lib/utils/step-player"
import { BlanksEditor } from "./blanks-editor"
import { ExecutionVisualizer } from "./execution-visualizer"
import { ParsonsBoard } from "./parsons-board"
import { RunToolbar } from "./run-toolbar"
import { StdinField } from "./stdin-field"
import { useStepBackend } from "./step-backend"
import { HelpButtons, RevealedHints, SolutionCountdown } from "./step-help"
import { StepMarkdown } from "./step-markdown"
import { useExecutionTrace } from "./use-execution-trace"
import { useStepHelp } from "./use-step-help"

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

const WORKSPACE_LABELS: Readonly<Record<ExerciseMode, string>> = { codigo: "Editor e console", lacunas: "Código com lacunas e console", ordenar: "Linhas para ordenar e console" }
const SOLUTION_NOTES: Readonly<Record<ExerciseMode, string>> = {
  codigo: "Leia, entenda e clique em Verificar para concluir o passo.",
  lacunas: "Leia, entenda, preencha as lacunas e clique em Verificar para concluir o passo.",
  ordenar: "Leia, entenda, monte as linhas nesta ordem e clique em Verificar para concluir o passo.",
}
const EMPTY_ARRANGEMENT_MESSAGE = "Leve pelo menos uma linha para a sua resposta antes de continuar."

/**
 * Passo de exercício: narrativa e instruções à esquerda (cada instrução ganha ✓/✗ depois do
 * "Verificar") e a área de resposta com o console à direita. Conforme o modo, a resposta é o
 * editor (`codigo`), o código com lacunas (`lacunas`) ou as linhas para ordenar (`ordenar`).
 * "Executar" e "Visualizar" rodam no navegador; "Verificar" manda a resposta para a API, que
 * corrige com os casos ocultos. Dicas saem uma a uma e a solução só aparece depois das
 * tentativas que a lição exige. Na prévia do professor (`useStepBackend().isPreview`) os
 * rascunhos do navegador ficam desligados e o "Verificar" é o do backend da prévia.
 */
export function ExerciseStep({ lesson, step, initialFiles, progress, onProgress, onVerified, onContinue, onUnauthorized }: ExerciseStepProps): React.JSX.Element {
  const backend = useStepBackend()
  const { isPreview } = backend
  const mode = step.exercise_mode
  const blanksSource = step.starter_files.find((file) => file.path === MAIN_FILE_PATH)?.content ?? ""
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles)
  const [blankAnswers, setBlankAnswers] = useState<string[]>(() => {
    if (mode !== "lacunas") return []
    return isPreview ? Array.from({ length: countBlanks(blanksSource) }, () => "") : readBlanksDraft(step.id, countBlanks(blanksSource))
  })
  const [placements, setPlacements] = useState<ParsonsPlacement[]>(() => (mode === "ordenar" && !isPreview ? readArrangementDraft(step.id, step.parsons_lines) : []))
  const [activePath, setActivePath] = useState(() => (hasFile(initialFiles, MAIN_FILE_PATH) ? MAIN_FILE_PATH : (initialFiles[0]?.path ?? MAIN_FILE_PATH)))
  const [outputs, setOutputs] = useState<ConsoleOutput[]>([])
  const [cases, setCases] = useState<StepCaseResult[] | null>(null)
  const [stdin, setStdin] = useState("")
  const { status: pythonStatus, isExecuting, isInstalling, execute, stop } = usePython({ packages: lesson.libraries })
  const help = useStepHelp({ lessonId: lesson.id, stepId: step.id, progress, onProgress, onUnauthorized })
  const trace = useExecutionTrace()

  const isCompleted = progress?.status === "completed"
  const isBusy = help.busy !== null
  const statuses = checkpointStatuses(step.checkpoints, cases)
  const failedCases = cases?.filter((result) => !result.passed) ?? []
  const solutionFiles = help.solution?.files ?? null

  const appendLines = useCallback((lines: readonly ConsoleLine[]) => setOutputs((current) => [...current, ...lines.map(toConsoleOutput)]), [])

  /** O projeto que a resposta atual forma, para rodar no navegador; null se ainda não há o que rodar. */
  const runnableFiles = (): ProjectFile[] | null => {
    if (mode === "lacunas") return fillBlanksInFiles(step.starter_files, blankAnswers)
    if (mode === "ordenar") return arrangementFiles(step.parsons_lines, placements)
    return files
  }

  // No `ordenar` a linha com input() pode ainda estar no banco: o campo já aparece aberto.
  const usesInput = mode === "ordenar" ? step.parsons_lines.some((line) => callsInput(line.text)) : (runnableFiles() ?? []).some((file) => callsInput(file.content))

  const handleContentChange = (path: string, content: string): void => {
    const next = updateFileContent(files, path, content)
    setFiles(next)
    if (!isPreview) writeStepDraft(step.id, next)
  }

  const handleBlanksChange = (answers: string[]): void => {
    setBlankAnswers(answers)
    if (isPreview) return
    writeBlanksDraft(step.id, answers)
    // O próximo exercício sem código inicial continua do que foi montado aqui.
    writeStepDraft(step.id, fillBlanksInFiles(step.starter_files, answers))
  }

  const handlePlacementsChange = (next: ParsonsPlacement[]): void => {
    setPlacements(next)
    if (!isPreview) writeArrangementDraft(step.id, next)
  }

  const handleReset = (): void => {
    if (mode === "lacunas") {
      setBlankAnswers(Array.from({ length: countBlanks(blanksSource) }, () => ""))
      if (!isPreview) clearBlanksDraft(step.id)
    } else if (mode === "ordenar") {
      setPlacements([])
      if (!isPreview) clearArrangementDraft(step.id)
    } else {
      setFiles(step.starter_files.length > 0 ? step.starter_files : initialFiles)
    }
    if (!isPreview) clearStepDraft(step.id)
    setCases(null)
    trace.close()
    setOutputs([toConsoleOutput({ type: "info", message: mode === "codigo" ? "Código restaurado para o início do passo." : "Resposta apagada: o passo voltou ao início." })])
  }

  const handleRun = (): void => {
    if (pythonStatus !== "ready" || isInstalling) {
      appendLines([{ type: "warning", message: "O Python ainda está carregando. Aguarde um instante." }])
      return
    }
    const project = runnableFiles()
    if (!project) {
      appendLines([{ type: "warning", message: EMPTY_ARRANGEMENT_MESSAGE }])
      return
    }
    const entryPath = mode === "codigo" && hasFile(project, activePath) ? activePath : MAIN_FILE_PATH
    setOutputs([toConsoleOutput({ type: "info", message: `Executando ${entryPath}...` })])
    execute(
      { files: project, entryPath, stdin },
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

  const handleVisualize = (): void => {
    const project = runnableFiles()
    if (!project) {
      appendLines([{ type: "warning", message: EMPTY_ARRANGEMENT_MESSAGE }])
      return
    }
    trace.start(project, mode === "codigo" && hasFile(project, activePath) ? activePath : MAIN_FILE_PATH, stdin, lesson.libraries)
  }

  const handleVerify = async (): Promise<void> => {
    if (mode === "ordenar" && placements.length === 0) {
      help.setMessage(EMPTY_ARRANGEMENT_MESSAGE)
      return
    }
    // 400 (arranjo inválido ou formato errado) e 503 (corretor fora do ar: a tentativa não conta) trazem a mensagem da API.
    await help.run("submit", async () => {
      const result = mode === "ordenar"
        ? await backend.submitStepArrangement(lesson.id, step.id, placements)
        : await backend.submitStep(lesson.id, step.id, mode === "lacunas" ? fillBlanksInFiles(step.starter_files, blankAnswers) : files)
      setCases(result.cases)
      appendLines([
        result.passed
          ? { type: "success", message: "✓ Todas as verificações passaram!" }
          : { type: "error", message: `✗ ${result.cases.filter((item) => !item.passed).length} de ${result.cases.length} verificações ainda não passaram.` },
      ])
      onVerified(result)
    }, "Não foi possível verificar agora. Tente novamente.")
  }

  const useSolution = (): void => {
    if (!solutionFiles) return
    setFiles(solutionFiles)
    if (!isPreview) writeStepDraft(step.id, solutionFiles)
    setActivePath(hasFile(solutionFiles, MAIN_FILE_PATH) ? MAIN_FILE_PATH : (solutionFiles[0]?.path ?? MAIN_FILE_PATH))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col @5xl:flex-row">
      <section aria-label="Enunciado do passo" className="overflow-y-auto border-b border-border p-6 @5xl:w-2/5 @5xl:border-b-0 @5xl:border-r">
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

        <RevealedHints hints={help.hints} />

        {solutionFiles && (
          <div className="mt-4 rounded-xl border border-level-purple/30 bg-level-purple-light p-3">
            <p className="mb-2 text-sm font-semibold text-level-purple-dark">Solução de referência</p>
            {solutionFiles.map((file) => (
              <pre key={file.path} className="mb-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100"><code>{file.content}</code></pre>
            ))}
            {mode === "codigo" && (
              <button type="button" onClick={useSolution} className="text-sm font-semibold text-level-purple underline">
                Copiar para o editor
              </button>
            )}
            {!isCompleted && <p className="mt-2 text-xs text-gray-600">{SOLUTION_NOTES[mode]}</p>}
          </div>
        )}

        {help.message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{help.message}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={isBusy}
            className={cn("btn-3d flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60", isCompleted ? "bg-green-600 hover:bg-green-700" : "bg-level-purple hover:bg-level-purple-dark")}
          >
            {help.busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            {isCompleted ? "Verificar de novo" : "Verificar"}
          </button>
          <HelpButtons
            hintCount={step.hint_count}
            progress={progress}
            solutionAfterAttempts={lesson.solution_after_attempts}
            isSolutionShown={help.solution !== null}
            isBusy={isBusy}
            onHint={() => void help.revealHint()}
            onSolution={() => void help.revealSolution()}
          />
          {isCompleted && (
            <button type="button" onClick={onContinue} className="btn-3d ml-auto flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark">
              Continuar <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <SolutionCountdown progress={progress} solutionAfterAttempts={lesson.solution_after_attempts} />
      </section>

      <section aria-label={WORKSPACE_LABELS[mode]} className="flex min-h-[28rem] flex-1 flex-col @5xl:min-h-0">
        {trace.state.status === "ready" ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-3">
            <ExecutionVisualizer code={trace.state.code} trace={trace.state.trace} onClose={trace.close} />
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-[3] flex-col">
              {mode === "codigo" ? (
                <CodeEditor
                  tabs={files}
                  activePath={activePath}
                  onTabSelect={setActivePath}
                  onTabClose={() => undefined}
                  onContentChange={handleContentChange}
                  onRun={handleRun}
                  onReset={handleReset}
                  onStop={stop}
                  onVisualize={handleVisualize}
                  isRunning={isExecuting}
                  isInstalling={isInstalling}
                  pythonStatus={pythonStatus}
                />
              ) : (
                <>
                  <RunToolbar
                    title={mode === "lacunas" ? "Complete as lacunas" : "Ordene as linhas"}
                    isRunning={isExecuting}
                    isTracing={trace.state.status === "loading"}
                    onRun={handleRun}
                    onStop={stop}
                    onVisualize={handleVisualize}
                    onReset={handleReset}
                  />
                  <div className="min-h-0 flex-1">
                    {mode === "lacunas"
                      ? <BlanksEditor source={blanksSource} answers={blankAnswers} onChange={handleBlanksChange} />
                      : <ParsonsBoard lines={step.parsons_lines} placements={placements} onChange={handlePlacementsChange} />}
                  </div>
                </>
              )}
            </div>
            {trace.state.status === "loading" && <p role="status" className="border-t border-border bg-level-purple-light px-3 py-1.5 text-xs text-level-purple-dark">Preparando a visualização da execução…</p>}
            {trace.state.status === "error" && <p role="alert" className="border-t border-border bg-red-50 px-3 py-1.5 text-xs text-red-700">{trace.state.message}</p>}
            <StdinField value={stdin} onChange={setStdin} isSuggested={usesInput} />
            <div className="min-h-0 flex-[2] border-t border-border">
              <ConsolePanel outputs={outputs} onClear={() => setOutputs([])} isRunning={isExecuting} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
