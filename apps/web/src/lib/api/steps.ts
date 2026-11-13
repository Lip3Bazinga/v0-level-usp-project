import type {
  HintReveal, LessonStepsProgress, ProjectFile, SolutionReveal, StepCompleteResult, StepQuizResult, StepQuizSubmitInput, StepSubmitInput,
  StepSubmitResult,
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

/** Revela a próxima dica do passo (409 quando todas já foram reveladas). */
export const revealStepHint = (lessonId: string, stepId: string): Promise<HintReveal> => api.post<HintReveal>(stepPath(lessonId, stepId, "hint"))

/** Dicas que o usuário já revelou neste passo. */
export const fetchRevealedStepHints = (lessonId: string, stepId: string): Promise<HintReveal[]> =>
  api.get<HintReveal[]>(stepPath(lessonId, stepId, "hints"))

/** Solução de referência do passo (403 antes das tentativas exigidas); vê-la reduz o XP do passo à metade. */
export const revealStepSolution = (lessonId: string, stepId: string): Promise<SolutionReveal> =>
  api.post<SolutionReveal>(stepPath(lessonId, stepId, "solution"))

/** Conclui um passo de leitura. */
export const completeReadingStep = (lessonId: string, stepId: string): Promise<StepCompleteResult> =>
  api.post<StepCompleteResult>(stepPath(lessonId, stepId, "complete"))

/** Envia as respostas do quiz do passo (índice da alternativa, na ordem das questões). */
export const submitStepQuiz = (lessonId: string, stepId: string, answers: number[]): Promise<StepQuizResult> =>
  api.post<StepQuizResult, StepQuizSubmitInput>(stepPath(lessonId, stepId, "quiz"), { answers })
