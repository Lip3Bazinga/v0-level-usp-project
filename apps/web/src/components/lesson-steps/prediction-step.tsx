"use client"

import { useId, useState } from "react"
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react"
import { MAX_PREDICTION_LENGTH, type Lesson, type LessonStep, type LessonStepProgress, type StepPredictResult } from "@levelusp/contracts"
import { MAIN_FILE_PATH } from "@/lib/constants"
import { useStepBackend } from "./step-backend"
import { HelpButtons, RevealedHints, SolutionCountdown } from "./step-help"
import { StepMarkdown } from "./step-markdown"
import { useStepHelp } from "./use-step-help"

interface PredictionStepProps {
  lesson: Pick<Lesson, "id" | "solution_after_attempts">
  step: LessonStep
  progress: LessonStepProgress | undefined
  /** Reflete na lição o que a API devolveu (dicas reveladas, saída esperada vista). */
  onProgress: (patch: Partial<LessonStepProgress>) => void
  /** Veredito de um envio (acertou ou não), com as tentativas e o efeito na gamificação. */
  onPredicted: (result: StepPredictResult) => void
  onContinue: () => void
  /** Sessão expirada numa ação: a página leva ao login. */
  onUnauthorized: () => void
}

/**
 * Passo de previsão: o aluno lê o código (somente leitura e SEM "Executar" — rodar entregaria a
 * resposta) e digita a saída que espera. A comparação é feita na API, que devolve só certo ou
 * errado: a tela nunca recebe a saída esperada antes de "Ver solução", liberada depois das
 * tentativas que a lição exige — e, mesmo então, o aluno ainda precisa enviá-la.
 */
export function PredictionStep({ lesson, step, progress, onProgress, onPredicted, onContinue, onUnauthorized }: PredictionStepProps): React.JSX.Element {
  const backend = useStepBackend()
  const answerId = useId()
  const [answer, setAnswer] = useState("")
  const [lastResult, setLastResult] = useState<StepPredictResult | null>(null)
  const help = useStepHelp({ lessonId: lesson.id, stepId: step.id, progress, onProgress, onUnauthorized })
  const code = (step.starter_files.find((file) => file.path === MAIN_FILE_PATH) ?? step.starter_files[0])?.content ?? ""
  const isCompleted = progress?.status === "completed"
  const isBusy = help.busy !== null
  const expectedOutput = help.solution?.expected_output ?? null

  const handleSubmit = (): Promise<void> =>
    help.run("submit", async () => {
      const result = await backend.submitStepPrediction(lesson.id, step.id, answer)
      setLastResult(result)
      onPredicted(result)
    }, "Não foi possível enviar a resposta. Tente novamente.")

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-8">
      <h2 className="mb-4 text-2xl font-bold text-level-purple-dark">{step.title}</h2>
      <StepMarkdown content={step.narrative_markdown} />

      <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-level-purple">Código para ler</h3>
      {/* Bloco rolável: recebe foco (tabIndex) para poder ser rolado pelo teclado. */}
      <pre tabIndex={0} aria-label="Código do passo (somente leitura)" className="overflow-x-auto rounded-xl bg-gray-900 p-4 font-mono text-sm text-gray-100"><code>{code}</code></pre>

      <label htmlFor={answerId} className="mb-2 mt-6 block text-sm font-bold uppercase tracking-wide text-level-purple">O que este código imprime?</label>
      <textarea
        id={answerId}
        rows={5}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        maxLength={MAX_PREDICTION_LENGTH}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Digite a saída, uma linha por linha impressa"
        className="w-full rounded-xl border-2 border-gray-200 p-3 font-mono text-sm text-gray-900 focus-visible:border-level-purple focus-visible:outline-none"
      />

      <div aria-live="polite">
        {lastResult?.passed && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Isso mesmo! É exatamente o que o código imprime.
          </p>
        )}
        {lastResult && !lastResult.passed && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            Ainda não é isso. Releia o código linha a linha e tente de novo. Tentativas até agora: {lastResult.attempts}.
          </p>
        )}
        {!lastResult && isCompleted && <p className="mt-3 text-sm font-semibold text-green-700">Previsão já concluída.</p>}
      </div>

      <RevealedHints hints={help.hints} />

      {expectedOutput !== null && (
        <div className="mt-4 rounded-xl border border-level-purple/30 bg-level-purple-light p-3">
          <p className="mb-2 text-sm font-semibold text-level-purple-dark">Saída esperada</p>
          <pre className="mb-2 overflow-x-auto rounded-lg bg-gray-900 p-3 font-mono text-xs text-gray-100">{expectedOutput}</pre>
          <button type="button" onClick={() => setAnswer(expectedOutput)} className="text-sm font-semibold text-level-purple underline">
            Copiar para a resposta
          </button>
          {!isCompleted && <p className="mt-2 text-xs text-gray-600">Compare com o código, entenda cada linha e clique em Enviar para concluir o passo.</p>}
        </div>
      )}

      {help.message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{help.message}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-6">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isBusy || answer.trim() === ""}
          className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark disabled:opacity-60"
        >
          {help.busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {isCompleted ? "Enviar de novo" : "Enviar"}
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
    </article>
  )
}
