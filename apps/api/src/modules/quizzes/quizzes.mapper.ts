import type { QuizQuestionFull, QuizQuestionPublic } from "@levelusp/contracts"
import type { lessonQuizQuestions } from "@levelusp/db"

type QuestionRow = typeof lessonQuizQuestions.$inferSelect

/** Questão com gabarito — só para o professor dono (ou admin). */
export function toQuizQuestionFull(q: QuestionRow): QuizQuestionFull {
  return {
    id: q.id,
    prompt: q.prompt,
    options: Array.isArray(q.options) ? q.options : [],
    correct_index: q.correctIndex,
    explanation: q.explanation,
    sort_order: q.sortOrder,
  }
}

/** Questão para o aluno: campos listados um a um, sem correct_index nem explicação. */
export function toQuizQuestionPublic(q: Pick<QuestionRow, "id" | "prompt" | "options">): QuizQuestionPublic {
  return { id: q.id, prompt: q.prompt, options: Array.isArray(q.options) ? q.options : [] }
}
