import type { QuizQuestionFull, QuizQuestionPublic } from "@levelusp/contracts"
import type { LessonQuizQuestionRow } from "@levelusp/db"

/** jsonb vindo de importação antiga pode não ser lista; o aluno recebe lista vazia. */
const optionsOf = (options: unknown): string[] => (Array.isArray(options) ? options : [])

/** Questão com gabarito — só para o professor dono (ou admin). */
export function toQuizQuestionFull(question: LessonQuizQuestionRow): QuizQuestionFull {
  return {
    id: question.id,
    prompt: question.prompt,
    options: optionsOf(question.options),
    correct_index: question.correctIndex,
    explanation: question.explanation,
    sort_order: question.sortOrder,
  }
}

/** Questão para o aluno: campos listados um a um, sem correct_index nem explicação. */
export function toQuizQuestionPublic(question: Pick<LessonQuizQuestionRow, "id" | "prompt" | "options">): QuizQuestionPublic {
  return { id: question.id, prompt: question.prompt, options: optionsOf(question.options) }
}
