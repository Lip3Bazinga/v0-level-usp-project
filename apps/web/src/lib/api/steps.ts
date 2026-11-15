import type {
  HintReveal, LessonStepsProgress, ParsonsPlacement, ProjectFile, SolutionReveal, StepCompleteResult, StepPredictInput, StepPredictResult,
  StepQuizResult, StepQuizSubmitInput, StepSubmitInput, StepSubmitResult,
} from "@levelusp/contracts"
import { api } from "./client"

const stepPath = (lessonId: string, stepId: string, action: string): string => `/me/lessons/${lessonId}/steps/${stepId}/${action}`

/** Progresso do usuário na lição guiada, passo a passo (só os passos em que já interagiu). */
export const fetchMyLessonStepsProgress = (lessonId: string): Promise<LessonStepsProgress> =>
  api.get<LessonStepsProgress>(`/me/lessons/${lessonId}/progress`)

/**
 * "Verificar" de um passo de exercício: a API corrige só os casos do passo e, se aprovado,
 * conclui o passo e credita o XP. 409 quando um passo anterior ainda não foi concluído;
 * 503 quando o corretor está fora do ar (a tentativa não conta).
 */
export const submitStep = (lessonId: string, stepId: string, files: readonly ProjectFile[]): Promise<StepSubmitResult> =>
  api.post<StepSubmitResult, StepSubmitInput>(stepPath(lessonId, stepId, "submit"), { files: files.map(({ path, content }) => ({ path, content })) })

/**
 * "Verificar" de um exercício `ordenar`: envia só as posições (linha e indentação) escolhidas
 * pelo aluno; a API monta o código com as linhas do passo e corrige pelos mesmos casos.
 * 400 `INVALID_ARRANGEMENT` (linha repetida/desconhecida) ou `WRONG_SUBMISSION_FORMAT`
 * (o passo não é de ordenar); 409 e 503 como em {@link submitStep}.
 */
export const submitStepArrangement = (lessonId: string, stepId: string, arrangement: readonly ParsonsPlacement[]): Promise<StepSubmitResult> =>
  api.post<StepSubmitResult, StepSubmitInput>(stepPath(lessonId, stepId, "submit"), {
    arrangement: arrangement.map((placement) => ({ line_id: placement.line_id, indent: placement.indent })),
  })

/**
 * Envia a saída que o aluno prevê para o código de um passo de previsão. A resposta traz só o
 * veredito e as tentativas (nunca a saída esperada nem as diferenças). 409 quando um passo
 * anterior não foi concluído; 429 quando há envios demais em pouco tempo.
 */
export const submitStepPrediction = (lessonId: string, stepId: string, output: string): Promise<StepPredictResult> =>
  api.post<StepPredictResult, StepPredictInput>(stepPath(lessonId, stepId, "predict"), { output })

/** Revela a próxima dica do passo (409 quando todas já foram reveladas). */
export const revealStepHint = (lessonId: string, stepId: string): Promise<HintReveal> => api.post<HintReveal>(stepPath(lessonId, stepId, "hint"))

/** Dicas que o usuário já revelou neste passo. */
export const fetchRevealedStepHints = (lessonId: string, stepId: string): Promise<HintReveal[]> =>
  api.get<HintReveal[]>(stepPath(lessonId, stepId, "hints"))

/**
 * Solução de referência do passo (403 antes das tentativas exigidas); vê-la reduz o XP do passo à
 * metade. No passo de previsão vem a saída esperada (`expected_output`) em vez de arquivos.
 */
export const revealStepSolution = (lessonId: string, stepId: string): Promise<SolutionReveal> =>
  api.post<SolutionReveal>(stepPath(lessonId, stepId, "solution"))

/** Conclui um passo de leitura. */
export const completeReadingStep = (lessonId: string, stepId: string): Promise<StepCompleteResult> =>
  api.post<StepCompleteResult>(stepPath(lessonId, stepId, "complete"))

/** Envia as respostas do quiz do passo (índice da alternativa, na ordem das questões). */
export const submitStepQuiz = (lessonId: string, stepId: string, answers: number[]): Promise<StepQuizResult> =>
  api.post<StepQuizResult, StepQuizSubmitInput>(stepPath(lessonId, stepId, "quiz"), { answers })
