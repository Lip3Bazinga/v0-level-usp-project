import type { LessonRuntime, LessonStepInput, StepSubmitResult } from "@levelusp/contracts"
import { submitDraftStep } from "@/lib/api"
import type { PreviewSubmission } from "./preview-backend"
import { PREVIEW_STEP_ID_PREFIX } from "./preview-model"

/** Motor e bibliotecas da lição em edição (o estado ainda não salvo do formulário). */
export interface PreviewEngine {
  runtime: LessonRuntime
  libraries: readonly string[]
}

/**
 * "Verificar" da prévia: a API corrige a submissão contra os casos do passo do rascunho, sem gravar
 * nada (sem progresso, XP nem tentativas). É a função do ponto de extensão `verify` de
 * `createPreviewBackend`; `engine` é lido a cada chamada para valer o motor escolhido por último.
 * Rejeita com `ApiError` (400 passo incompleto, 429 limite, 503 corretor fora do ar).
 */
export function createPreviewVerify(engine: () => PreviewEngine): (step: LessonStepInput, submission: PreviewSubmission) => Promise<StepSubmitResult> {
  return async (step, submission) => {
    const { runtime, libraries } = engine()
    const result = await submitDraftStep({
      runtime,
      libraries: [...libraries],
      step: { ...step, wrong_solutions: [] },
      ...(submission.kind === "files"
        ? { files: submission.files.map(({ path, content }) => ({ path, content })) }
        : { arrangement: submission.arrangement.map(({ line_id, indent }) => ({ line_id, indent })) }),
    })
    return { ...result, step_id: `${PREVIEW_STEP_ID_PREFIX}${step.order}` }
  }
}
