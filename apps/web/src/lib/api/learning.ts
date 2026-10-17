import type {
  ActivityDay, LessonProgress, ProjectFile, QuizQuestionFull, QuizQuestionInput, QuizQuestionPublic, QuizResult,
  QuizSubmitInput, SaveSnapshotInput, SubmissionResult, SubmitCodeInput,
} from "@levelusp/contracts"
import { api } from "./client"

/** Resposta de `POST /lessons/:id/complete` (lição teórica, sem correção). */
export type CompletionResult = Pick<
  SubmissionResult,
  "lesson_completed" | "xp_awarded" | "new_badges" | "level_up" | "new_level"
>

export const fetchMyProgress = () => api.get<LessonProgress[]>("/me/progress")
export async function fetchMyCompletedLessonIds(): Promise<Set<string>> {
  return new Set(await api.get<string[]>("/me/progress/completed"))
}

export async function fetchProgressSnapshot(lessonId: string): Promise<ProjectFile[] | null> {
  const { files } = await api.get<{ files: ProjectFile[] | null }>(`/lessons/${lessonId}/snapshot`)
  return files
}
export const saveProgressSnapshot = (lessonId: string, files: ProjectFile[]) =>
  api.put<void, SaveSnapshotInput>(`/lessons/${lessonId}/snapshot`, { files })

export const completeTheoryLesson = (lessonId: string) => api.post<CompletionResult>(`/lessons/${lessonId}/complete`)

/**
 * "Verificar resposta": a API corrige no executor isolado e, se aprovado, já
 * conclui a lição e credita o XP. O gabarito nunca chega ao navegador.
 */
export const submitLessonCode = (lessonId: string, files: readonly ProjectFile[]) =>
  api.post<SubmissionResult, SubmitCodeInput>(`/lessons/${lessonId}/submissions`, {
    files: files.map(({ path, content }) => ({ path, content })),
  })

export const fetchUserActivity = (userId: string) => api.get<ActivityDay[]>(`/users/${userId}/activity`)

export const fetchQuizForStudent = (lessonId: string) => api.get<QuizQuestionPublic[]>(`/lessons/${lessonId}/quiz`)
export const fetchQuizForAuthoring = (lessonId: string) =>
  api.get<QuizQuestionFull[]>(`/lessons/${lessonId}/quiz/authoring`)
export const replaceQuizQuestions = (lessonId: string, questions: QuizQuestionInput[]) =>
  api.put<QuizQuestionFull[]>(`/lessons/${lessonId}/quiz`, { questions })
export const submitQuiz = (lessonId: string, answers: QuizSubmitInput["answers"]) =>
  api.post<QuizResult, QuizSubmitInput>(`/lessons/${lessonId}/quiz/submissions`, { answers })
