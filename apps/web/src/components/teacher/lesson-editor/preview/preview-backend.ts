import type { HintReveal, LessonStepInput, ParsonsPlacement, ProjectFile, SolutionReveal, StepOutcome, StepPredictResult, StepSubmitResult } from "@levelusp/contracts"
import { MAIN_FILE_PATH } from "@/lib/constants"
import { StepBackendError, type StepBackend } from "@/components/lesson-steps/step-backend"

/** "Verificar" numa prévia sem `verify`: a correção (casos ocultos) só existe no servidor. */
export class PreviewVerifyUnavailable extends StepBackendError {
  constructor() {
    super("A correção roda no servidor. Na prévia, use Executar para testar o código.")
    this.name = "PreviewVerifyUnavailable"
  }
}

/** Falha ao rodar no navegador o código de uma previsão; a mensagem (pt-BR) vai para a tela. */
export class PreviewRunError extends StepBackendError {
  constructor(message: string) {
    super(message)
    this.name = "PreviewRunError"
  }
}

/**
 * Roda um projeto Python no navegador (Pyodide) e devolve o que ele imprimiu.
 * Rejeita com {@link PreviewRunError} se o Python não está pronto ou o código dá erro.
 */
export type PreviewPythonRunner = (files: readonly ProjectFile[], entryPath: string) => Promise<string>

/** O que o aluno enviaria num "Verificar": os arquivos (código/lacunas) ou as linhas ordenadas. */
export type PreviewSubmission = { kind: "files"; files: readonly ProjectFile[] } | { kind: "arrangement"; arrangement: readonly ParsonsPlacement[] }

/** Opções de {@link createPreviewBackend}. */
export interface PreviewBackendOptions {
  /**
   * "Verificar" da prévia: quando informado, delega a esta função em vez de recusar. A prévia do
   * editor informa `createPreviewVerify` (a API corrige o passo do rascunho sem gravar nada).
   */
  verify?: (step: LessonStepInput, submission: PreviewSubmission) => Promise<StepSubmitResult>
}

/** Passos do editor por id; pode ser uma função, para o backend enxergar sempre o estado mais novo. */
export type PreviewStepSource = ReadonlyMap<string, LessonStepInput> | (() => ReadonlyMap<string, LessonStepInput>)

/** Ignora espaços no fim das linhas, linhas vazias no fim e `\r\n` (a mesma regra da API). */
function normalizeOutput(output: string): string {
  const lines = output.replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[ \t]+$/, ""))
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop()
  return lines.join("\n")
}

const noOutcome = (): StepOutcome => ({ step_completed: false, xp_awarded: 0, lesson_completed: false, granted_badges: [], level_up: false, new_level: 0 })

/** Executa `task` e entrega o resultado (ou o erro lançado) como promessa. */
const settle = <T>(task: () => T | Promise<T>): Promise<T> => new Promise<T>((resolve) => resolve(task()))

/**
 * Backend dos passos para a prévia do professor: nada é gravado. Dicas e solução vêm do
 * passo que o professor está editando; a previsão roda o código (`starter_files`) no Pyodide e
 * compara com o digitado; "Verificar" delega a `options.verify` e, sem ela, não corrige (ver
 * {@link PreviewVerifyUnavailable}).
 * Guarda em memória quantas dicas foram reveladas e as tentativas de cada passo, então use uma
 * instância por abertura da prévia (e passe uma função em `steps` para enxergar edições novas).
 *
 * @param steps passos do editor por id (ou função que os devolve).
 * @param runPython executa Python no navegador.
 */
export function createPreviewBackend(steps: PreviewStepSource, runPython: PreviewPythonRunner, options: PreviewBackendOptions = {}): StepBackend {
  const revealedHints = new Map<string, number>()
  const attempts = new Map<string, number>()

  const stepOf = (stepId: string): LessonStepInput => {
    const step = (typeof steps === "function" ? steps() : steps).get(stepId)
    if (!step) throw new StepBackendError("Este passo não está mais na lição. Escolha outro passo na lista.")
    return step
  }

  const verify = (stepId: string, submission: PreviewSubmission): Promise<StepSubmitResult> =>
    settle(() => {
      if (!options.verify) throw new PreviewVerifyUnavailable()
      return options.verify(stepOf(stepId), submission)
    })

  const hintsOf = (stepId: string, count: number): HintReveal[] => stepOf(stepId).hints.slice(0, count).map((text, index) => ({ index, text }))

  return {
    isPreview: true,
    submitStep: (_lessonId, stepId, files) => verify(stepId, { kind: "files", files }),
    submitStepArrangement: (_lessonId, stepId, arrangement) => verify(stepId, { kind: "arrangement", arrangement }),
    submitStepPrediction: async (_lessonId, stepId, output): Promise<StepPredictResult> => {
      const step = stepOf(stepId)
      const code = step.starter_files.find((file) => file.path === MAIN_FILE_PATH) ?? step.starter_files[0]
      if (!code) throw new StepBackendError("A previsão está sem código para rodar.")
      const printed = await runPython(step.starter_files, code.path)
      const total = (attempts.get(stepId) ?? 0) + 1
      attempts.set(stepId, total)
      return { ...noOutcome(), step_id: stepId, passed: normalizeOutput(printed) === normalizeOutput(output), attempts: total, solution_available: true }
    },
    revealStepHint: (_lessonId, stepId) =>
      settle(() => {
        const count = revealedHints.get(stepId) ?? 0
        const hint = hintsOf(stepId, count + 1)[count]
        if (!hint) throw new StepBackendError("Todas as dicas deste passo já foram reveladas.")
        revealedHints.set(stepId, count + 1)
        return hint
      }),
    fetchRevealedStepHints: (_lessonId, stepId) => settle(() => hintsOf(stepId, revealedHints.get(stepId) ?? 0)),
    revealStepSolution: (_lessonId, stepId) =>
      settle((): SolutionReveal => {
        const step = stepOf(stepId)
        return step.kind === "previsao" ? { files: [], expected_output: step.expected_output } : { files: step.solution_files, expected_output: null }
      }),
  }
}
