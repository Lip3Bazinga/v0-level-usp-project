import type {
  ActivityDay, LessonProgress, LessonSnapshot, ProjectFile, QuizQuestionFull, QuizQuestionInput, QuizQuestionPublic, QuizResult,
  QuizSubmitInput, SaveSnapshotInput, SubmissionResult, SubmitCodeInput,
} from "@levelusp/contracts"
import { api } from "./client"

/** Resposta de `POST /lessons/:id/complete` (lição teórica, sem correção). */
export type CompletionResult = Pick<
  SubmissionResult,
  "lesson_completed" | "xp_awarded" | "new_badges" | "level_up" | "new_level"
>

export const fetchMyProgress = (): Promise<LessonProgress[]> => api.get<LessonProgress[]>("/me/progress")
export async function fetchMyCompletedLessonIds(): Promise<Set<string>> {
  return new Set(await api.get<string[]>("/me/progress/completed"))
}

export async function fetchProgressSnapshot(lessonId: string): Promise<ProjectFile[] | null> {
  const { files } = await api.get<LessonSnapshot>(`/lessons/${lessonId}/snapshot`)
  return files
}
export const updateProgressSnapshot = (lessonId: string, files: ProjectFile[]): Promise<void> =>
  api.put<void, SaveSnapshotInput>(`/lessons/${lessonId}/snapshot`, { files })

export const completeTheoryLesson = (lessonId: string): Promise<CompletionResult> => api.post<CompletionResult>(`/lessons/${lessonId}/complete`)

/**
 * "Verificar resposta": a API corrige no executor isolado e, se aprovado, já
 * conclui a lição e credita o XP. O gabarito nunca chega ao navegador.
 */
export const submitLessonCode = (lessonId: string, files: readonly ProjectFile[]): Promise<SubmissionResult> =>
  api.post<SubmissionResult, SubmitCodeInput>(`/lessons/${lessonId}/submissions`, {
    files: files.map(({ path, content }) => ({ path, content })),
  })

export const fetchUserActivity = (userId: string): Promise<ActivityDay[]> => api.get<ActivityDay[]>(`/users/${userId}/activity`)

export const fetchQuizForStudent = (lessonId: string): Promise<QuizQuestionPublic[]> => api.get<QuizQuestionPublic[]>(`/lessons/${lessonId}/quiz`)
export const fetchQuizForAuthoring = (lessonId: string): Promise<QuizQuestionFull[]> =>
  api.get<QuizQuestionFull[]>(`/lessons/${lessonId}/quiz/authoring`)
export const replaceQuizQuestions = (lessonId: string, questions: QuizQuestionInput[]): Promise<QuizQuestionFull[]> =>
  api.put<QuizQuestionFull[]>(`/lessons/${lessonId}/quiz`, { questions })
export const submitQuiz = (lessonId: string, answers: QuizSubmitInput["answers"]): Promise<QuizResult> =>
  api.post<QuizResult, QuizSubmitInput>(`/lessons/${lessonId}/quiz/submissions`, { answers })
